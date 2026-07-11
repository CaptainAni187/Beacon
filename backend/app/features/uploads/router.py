"""File upload router — used for story media (and, later, message attachments)."""

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.features.auth.dependencies import get_current_user
from app.core.config import get_settings
from app.features.users.models import User

router = APIRouter()

settings = get_settings()

ALLOWED_MIME_PREFIXES = ("image/", "video/")


class UploadResponse(BaseModel):
    url: str
    filename: str
    mime_type: str
    size: int


@router.post("/", response_model=UploadResponse, status_code=201)
async def upload_file(
    file: UploadFile,
    _current_user: User = Depends(get_current_user),
) -> UploadResponse:
    """Upload an image or video file, returning its public URL."""
    if not file.content_type or not file.content_type.startswith(ALLOWED_MIME_PREFIXES):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only image and video uploads are supported",
        )

    contents = await file.read()
    if len(contents) > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds the maximum upload size",
        )

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    extension = Path(file.filename or "").suffix
    stored_name = f"{uuid.uuid4()}{extension}"
    destination = upload_dir / stored_name
    destination.write_bytes(contents)

    return UploadResponse(
        url=f"{settings.public_base_url}/static/uploads/{stored_name}",
        filename=file.filename or stored_name,
        mime_type=file.content_type,
        size=len(contents),
    )
