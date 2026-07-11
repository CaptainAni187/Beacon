"""
WebSocket message handler.

Authenticates incoming connections via JWT, routes incoming events to the
appropriate service methods, and broadcasts results to conversation members.
"""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.features.auth.jwt_handler import verify_access_token
from app.core.database import SessionLocal
from app.features.conversations.models import ConversationMember
from app.core.enums import DeliveryStatus, UserStatus
from app.features.users.models import User
from app.features.messages.schemas import MessageCreate, MessageRecipientKeyCreate
from app.features.calls.service import call_service
from app.features.messages.service import message_service
from app.features.realtime.events import EventType, create_event
from app.features.realtime.manager import manager


def _get_member_ids(db, conversation_id: UUID) -> list[str]:
    rows = (
        db.execute(
            select(ConversationMember.user_id).where(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.deleted_at.is_(None),
            )
        )
        .scalars()
        .all()
    )
    return [str(row) for row in rows]


class WebSocketHandler:
    """
    Handles WebSocket connection lifecycle and event routing.

    Incoming events are validated, authenticated, and dispatched
    to the appropriate service layer method.
    """

    async def handle_connection(self, websocket: WebSocket, token: str) -> None:
        """Authenticate the connection, then loop on incoming events until disconnect."""
        user_id = verify_access_token(token)
        if user_id is None:
            await websocket.close(code=4001)
            return

        db = SessionLocal()
        try:
            user = db.get(User, UUID(user_id))
            if user is not None:
                display_name = user.display_name
                user.status = UserStatus.ONLINE
                db.commit()
        finally:
            db.close()

        if user is None:
            await websocket.close(code=4001)
            return

        await manager.connect(websocket, user_id)
        await manager.broadcast(
            create_event(EventType.USER_ONLINE, {"user_id": user_id}),
            exclude_user_id=user_id,
        )

        try:
            while True:
                data = await websocket.receive_json()
                await self._dispatch_event(data, user_id, display_name)
        except WebSocketDisconnect:
            pass
        finally:
            manager.disconnect(websocket, user_id)

            # Leave any in-progress calls so peers can tear down their side.
            for room_key, remaining in manager.leave_all_call_rooms(user_id).items():
                leave_event = create_event(
                    EventType.CALL_ROOM_PEER_LEFT, {"roomKey": room_key, "userId": user_id}
                )
                await manager.broadcast_to_conversation(leave_event, remaining)

            if not manager.is_user_online(user_id):
                now = datetime.now(timezone.utc)
                db = SessionLocal()
                try:
                    offline_user = db.get(User, UUID(user_id))
                    if offline_user is not None:
                        offline_user.status = UserStatus.OFFLINE
                        offline_user.last_seen_at = now
                        db.commit()
                finally:
                    db.close()
                await manager.broadcast(
                    create_event(
                        EventType.USER_OFFLINE,
                        {"user_id": user_id, "last_seen_at": now.isoformat()},
                    ),
                    exclude_user_id=user_id,
                )

    async def _dispatch_event(self, data: dict, user_id: str, display_name: str) -> None:
        """Route an incoming event to the appropriate handler."""
        event_type = data.get("type")
        payload = data.get("payload") or {}

        call_relay_events = {
            EventType.CALL_INVITE.value,
            EventType.CALL_ACCEPT.value,
            EventType.CALL_DECLINE.value,
            EventType.CALL_OFFER.value,
            EventType.CALL_ANSWER.value,
            EventType.CALL_ICE_CANDIDATE.value,
            EventType.CALL_END.value,
            EventType.CALL_JOIN_REQUEST.value,
            EventType.CALL_JOIN_APPROVED.value,
            EventType.CALL_JOIN_DENIED.value,
            EventType.CALL_ROOM_JOIN.value,
        }

        if event_type in (EventType.TYPING_START.value, EventType.TYPING_STOP.value):
            await self._handle_typing(event_type, payload, user_id, display_name)
        elif event_type == EventType.MESSAGE_NEW.value:
            await self._handle_new_message(payload, user_id)
        elif event_type in (EventType.MESSAGE_DELIVERED.value, EventType.MESSAGE_READ.value):
            await self._handle_status(event_type, payload, user_id)
        elif event_type in call_relay_events:
            await self._handle_call_event(event_type, payload, user_id, display_name)
        else:
            await manager.send_personal(
                create_event(EventType.ERROR, {"message": f"Unknown event type: {event_type}"}),
                user_id,
            )

    async def _handle_typing(
        self, event_type: str, payload: dict, user_id: str, display_name: str
    ) -> None:
        """Ephemeral typing relay — no DB writes."""
        conversation_id = payload.get("conversationId") or payload.get("conversation_id")
        if not conversation_id:
            return

        db = SessionLocal()
        try:
            member_ids = _get_member_ids(db, UUID(conversation_id))
        except ValueError:
            return
        finally:
            db.close()

        is_typing = event_type == EventType.TYPING_START.value
        event = create_event(
            EventType.TYPING_START if is_typing else EventType.TYPING_STOP,
            {
                "conversationId": conversation_id,
                "userId": user_id,
                "username": display_name,
                "isTyping": is_typing,
            },
            sender_id=user_id,
        )
        recipients = [member_id for member_id in member_ids if member_id != user_id]
        await manager.broadcast_to_conversation(event, recipients)

    async def _handle_new_message(self, payload: dict, user_id: str) -> None:
        """
        Persist the message, then broadcast it to every conversation member.

        Each recipient gets their own copy of the event, since an encrypted
        message's `recipient_key` field (the wrapped content key) differs
        per recipient — nobody sees anyone else's wrapped key.
        """
        db = SessionLocal()
        try:
            create_payload = MessageCreate(
                conversation_id=UUID(payload["conversation_id"]),
                content=payload["content"],
                type=payload.get("type", "text"),
                reply_to_id=UUID(payload["reply_to_id"]) if payload.get("reply_to_id") else None,
                is_encrypted=payload.get("is_encrypted", False),
                iv=payload.get("iv"),
                recipient_keys=[
                    MessageRecipientKeyCreate(
                        user_id=UUID(key["user_id"]),
                        wrapped_key=key["wrapped_key"],
                        wrap_iv=key["wrap_iv"],
                    )
                    for key in payload.get("recipient_keys", [])
                ],
            )
            message = message_service.send_message(db, UUID(user_id), create_payload)
            member_ids = _get_member_ids(db, message.conversation_id)

            for member_id in member_ids:
                personalized = message_service.get_message(db, UUID(member_id), message.id)
                event = create_event(
                    EventType.MESSAGE_NEW,
                    personalized.model_dump(mode="json"),
                    sender_id=user_id,
                )
                await manager.send_personal(event, member_id)
        except Exception as exc:
            await manager.send_personal(
                create_event(EventType.ERROR, {"message": str(exc)}), user_id
            )
        finally:
            db.close()

    async def _handle_call_event(
        self, event_type: str, payload: dict, user_id: str, display_name: str
    ) -> None:
        """
        Relay WebRTC signaling (invites, offer/answer/ICE, room membership) between
        peers. The server never inspects SDP/ICE contents — it's a pure message bus;
        actual media negotiation and encryption is handled peer-to-peer by WebRTC.
        """
        to_user_id = payload.get("toUserId") or payload.get("to_user_id")
        call_id = payload.get("callId") or payload.get("call_id")
        room_key = payload.get("roomKey") or payload.get("room_key") or call_id

        if event_type == EventType.CALL_INVITE.value:
            if not to_user_id:
                return
            await manager.send_personal(
                create_event(
                    EventType.CALL_RING,
                    {**payload, "fromUserId": user_id, "fromName": display_name},
                    sender_id=user_id,
                ),
                to_user_id,
            )

        elif event_type == EventType.CALL_ACCEPT.value:
            if call_id:
                db = SessionLocal()
                try:
                    call_service.join_call(db, UUID(user_id), UUID(call_id))
                except Exception:
                    pass
                finally:
                    db.close()
            if to_user_id:
                await manager.send_personal(
                    create_event(
                        EventType.CALL_ACCEPT, {**payload, "fromUserId": user_id}, sender_id=user_id
                    ),
                    to_user_id,
                )

        elif event_type == EventType.CALL_DECLINE.value:
            if call_id:
                db = SessionLocal()
                try:
                    call_service.decline_call(db, UUID(call_id))
                finally:
                    db.close()
            if to_user_id:
                await manager.send_personal(
                    create_event(
                        EventType.CALL_DECLINE, {**payload, "fromUserId": user_id}, sender_id=user_id
                    ),
                    to_user_id,
                )

        elif event_type in (
            EventType.CALL_OFFER.value,
            EventType.CALL_ANSWER.value,
            EventType.CALL_ICE_CANDIDATE.value,
        ):
            if not to_user_id:
                return
            await manager.send_personal(
                create_event(EventType(event_type), {**payload, "fromUserId": user_id}, sender_id=user_id),
                to_user_id,
            )

        elif event_type == EventType.CALL_JOIN_REQUEST.value:
            # Ad hoc call-link join awaiting the creator's approval.
            if not to_user_id:
                return
            await manager.send_personal(
                create_event(
                    EventType.CALL_JOIN_REQUEST,
                    {**payload, "fromUserId": user_id, "fromName": display_name},
                    sender_id=user_id,
                ),
                to_user_id,
            )

        elif event_type in (EventType.CALL_JOIN_APPROVED.value, EventType.CALL_JOIN_DENIED.value):
            if to_user_id:
                await manager.send_personal(
                    create_event(EventType(event_type), payload, sender_id=user_id), to_user_id
                )

        elif event_type == EventType.CALL_END.value:
            if room_key:
                remaining = manager.leave_call_room(room_key, user_id)
                await manager.broadcast_to_conversation(
                    create_event(EventType.CALL_ROOM_PEER_LEFT, {"roomKey": room_key, "userId": user_id}),
                    remaining,
                )
            elif to_user_id:
                await manager.send_personal(
                    create_event(EventType.CALL_END, {**payload, "fromUserId": user_id}, sender_id=user_id),
                    to_user_id,
                )
            if call_id:
                db = SessionLocal()
                try:
                    call_service.leave_call(db, UUID(user_id), UUID(call_id))
                except Exception:
                    pass
                finally:
                    db.close()

        elif event_type == EventType.CALL_ROOM_JOIN.value:
            if not room_key:
                return
            existing_members = manager.join_call_room(room_key, user_id)
            await manager.send_personal(
                create_event(EventType.CALL_ROOM_PEERS, {"roomKey": room_key, "peers": existing_members}),
                user_id,
            )
            await manager.broadcast_to_conversation(
                create_event(
                    EventType.CALL_ROOM_PEER_JOINED,
                    {"roomKey": room_key, "userId": user_id, "displayName": display_name},
                ),
                existing_members,
            )

    async def _handle_status(self, event_type: str, payload: dict, user_id: str) -> None:
        """Update per-recipient delivery/read status and notify conversation members."""
        message_id = payload.get("messageId") or payload.get("message_id")
        if not message_id:
            return

        status = (
            DeliveryStatus.DELIVERED
            if event_type == EventType.MESSAGE_DELIVERED.value
            else DeliveryStatus.READ
        )

        db = SessionLocal()
        try:
            result = message_service.update_status(db, UUID(user_id), UUID(message_id), status)
            member_ids = _get_member_ids(db, UUID(result["conversation_id"]))
        except Exception as exc:
            await manager.send_personal(
                create_event(EventType.ERROR, {"message": str(exc)}), user_id
            )
            return
        finally:
            db.close()

        event = create_event(
            EventType.MESSAGE_DELIVERED if status == DeliveryStatus.DELIVERED else EventType.MESSAGE_READ,
            result,
            sender_id=user_id,
        )
        await manager.broadcast_to_conversation(event, member_ids)


ws_handler = WebSocketHandler()
