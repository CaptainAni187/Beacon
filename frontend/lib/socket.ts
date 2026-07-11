/**
 * WebSocket client singleton for real-time messaging.
 * Provides connect/disconnect lifecycle and pub/sub event handling.
 */

import { API_BASE_URL } from "@/lib/api";

type EventCallback = (data: unknown) => void;
type PendingMessage = { type: string; payload: unknown };

function buildWebSocketBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (configured) return normalizeWebSocketUrl(configured);

  const apiUrl = new URL(API_BASE_URL);
  apiUrl.protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
  apiUrl.pathname = apiUrl.pathname.replace(/\/api\/?$/, "").replace(/\/$/, "");
  apiUrl.search = "";
  apiUrl.hash = "";
  return normalizeWebSocketUrl(apiUrl.toString());
}

function normalizeWebSocketUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol === "https:") url.protocol = "wss:";
  if (url.protocol === "http:") url.protocol = "ws:";
  url.pathname = url.pathname.replace(/\/api\/?$/, "").replace(/\/$/, "");
  if (!url.pathname.endsWith("/ws")) {
    url.pathname = `${url.pathname}/ws`.replace(/\/+/g, "/");
  }
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

const WS_BASE_URL = buildWebSocketBaseUrl();

class SocketClient {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private intentionalDisconnect = false;
  private pendingMessages: PendingMessage[] = [];

  /**
   * Establish a WebSocket connection to the Beacon server.
   * The backend authenticates via the JWT passed as a path segment (`/ws/{token}`).
   */
  connect(token?: string): void {
    if (!token) {
      console.warn("[socket] Skipping connect: missing access token");
      return;
    }
    if (
      this.socket?.readyState === WebSocket.OPEN ||
      this.socket?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    this.intentionalDisconnect = false;
    const url = `${WS_BASE_URL}/${encodeURIComponent(token)}`;

    try {
      console.info("[socket] Connecting", {
        url: `${WS_BASE_URL}/<token>`,
        readyState: this.socket?.readyState,
      });
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        console.info("[socket] Connected", { url: WS_BASE_URL });
        this.reconnectAttempts = 0;
        this.flushPendingMessages();
      };

      this.socket.onmessage = (event: MessageEvent) => {
        try {
          const { type, payload } = JSON.parse(event.data as string) as {
            type: string;
            payload: unknown;
          };
          this.emit(type, payload);
        } catch {
          console.warn("[socket] Failed to parse incoming message");
        }
      };

      this.socket.onclose = (event) => {
        console.info("[socket] Disconnected", {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
        if (!this.intentionalDisconnect) {
          this.attemptReconnect(token);
        }
      };

      this.socket.onerror = (error) => {
        console.error("[socket] Error:", error);
      };
    } catch (error) {
      console.error("[socket] Connection failed:", error);
    }
  }

  /**
   * Gracefully close the WebSocket connection.
   */
  disconnect(): void {
    this.intentionalDisconnect = true;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.pendingMessages = [];
    this.listeners.clear();
  }

  /**
   * Send a typed event to the server.
   * TODO: Queue messages when socket is not yet open.
   */
  send(type: string, payload: unknown): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      if (this.socket?.readyState === WebSocket.CONNECTING) {
        this.queueMessage(type, payload);
      }
      console.warn("[socket] Cannot send — socket not connected", {
        type,
        readyState: this.socket?.readyState,
      });
      return;
    }
    this.socket.send(JSON.stringify({ type, payload }));
  }

  /**
   * Subscribe to a server event type.
   */
  subscribe(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Unsubscribe from a server event type.
   */
  unsubscribe(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  /**
   * Returns whether the socket is currently connected.
   */
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((callback) => callback(data));
  }

  private queueMessage(type: string, payload: unknown): void {
    this.pendingMessages.push({ type, payload });
    if (this.pendingMessages.length > 100) {
      this.pendingMessages.shift();
    }
  }

  private flushPendingMessages(): void {
    const messages = [...this.pendingMessages];
    this.pendingMessages = [];
    for (const message of messages) {
      this.send(message.type, message.payload);
    }
  }

  private attemptReconnect(token?: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[socket] Max reconnect attempts reached");
      return;
    }
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
    this.reconnectAttempts++;
    console.info("[socket] Reconnecting", {
      attempt: this.reconnectAttempts,
      delay,
    });
    setTimeout(() => this.connect(token), delay);
  }
}

/** Singleton WebSocket client instance */
export const socket = new SocketClient();

export { WS_BASE_URL };
export type { EventCallback };
