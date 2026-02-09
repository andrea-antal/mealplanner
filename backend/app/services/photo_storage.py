"""Photo storage service for recipe images.

Supports Cloudflare R2 (S3-compatible) for production and local filesystem for development.
"""
import logging
import os
import uuid
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# R2/S3 configuration from environment
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_ENDPOINT_URL = os.getenv("R2_ENDPOINT_URL")
R2_PUBLIC_URL = os.getenv("R2_PUBLIC_URL")  # Public URL prefix for serving images

# Local fallback directory
LOCAL_PHOTO_DIR = Path(__file__).parent.parent.parent / "data" / "photos"


def _is_r2_configured() -> bool:
    """Check if R2 environment variables are set."""
    return all([R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT_URL])


def _get_s3_client():
    """Create a boto3 S3-compatible client for R2."""
    import boto3
    return boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT_URL,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        region_name="auto",
    )


def _generate_key(workspace_id: str, filename: str) -> str:
    """Generate a unique storage key for a photo."""
    ext = Path(filename).suffix.lower() or ".jpg"
    unique_id = uuid.uuid4().hex[:12]
    return f"recipes/{workspace_id}/{unique_id}{ext}"


async def upload_photo(file_data: bytes, filename: str, workspace_id: str) -> str:
    """Upload photo to R2 or local storage, return public URL.

    Args:
        file_data: Raw image bytes
        filename: Original filename (used for extension detection)
        workspace_id: Workspace identifier for path namespacing

    Returns:
        Public URL of the uploaded photo
    """
    key = _generate_key(workspace_id, filename)

    if _is_r2_configured():
        try:
            client = _get_s3_client()
            # Detect content type from extension
            ext = Path(filename).suffix.lower()
            content_type_map = {
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".png": "image/png",
                ".webp": "image/webp",
                ".gif": "image/gif",
            }
            content_type = content_type_map.get(ext, "image/jpeg")

            client.put_object(
                Bucket=R2_BUCKET_NAME,
                Key=key,
                Body=file_data,
                ContentType=content_type,
            )

            # Build public URL
            if R2_PUBLIC_URL:
                photo_url = f"{R2_PUBLIC_URL.rstrip('/')}/{key}"
            else:
                photo_url = f"{R2_ENDPOINT_URL.rstrip('/')}/{R2_BUCKET_NAME}/{key}"

            logger.info(f"Uploaded photo to R2: {key}")
            return photo_url

        except Exception as e:
            logger.error(f"Failed to upload photo to R2: {e}")
            raise

    else:
        # Local filesystem fallback
        local_dir = LOCAL_PHOTO_DIR / workspace_id
        local_dir.mkdir(parents=True, exist_ok=True)

        local_path = LOCAL_PHOTO_DIR / key.replace("recipes/", "")
        local_path.parent.mkdir(parents=True, exist_ok=True)

        with open(local_path, "wb") as f:
            f.write(file_data)

        # Return a relative URL that can be served by the backend
        photo_url = f"/data/photos/{key.replace('recipes/', '')}"
        logger.info(f"Saved photo locally: {local_path}")
        return photo_url


async def delete_photo(photo_url: str) -> bool:
    """Delete photo from R2 or local storage.

    Args:
        photo_url: URL of the photo to delete

    Returns:
        True if deleted successfully, False otherwise
    """
    if not photo_url:
        return False

    if _is_r2_configured() and R2_PUBLIC_URL and photo_url.startswith(R2_PUBLIC_URL):
        try:
            client = _get_s3_client()
            # Extract key from URL
            key = photo_url.replace(f"{R2_PUBLIC_URL.rstrip('/')}/", "")
            client.delete_object(Bucket=R2_BUCKET_NAME, Key=key)
            logger.info(f"Deleted photo from R2: {key}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete photo from R2: {e}")
            return False

    elif photo_url.startswith("/data/photos/"):
        try:
            # Local file
            local_path = LOCAL_PHOTO_DIR / photo_url.replace("/data/photos/", "")
            if local_path.exists():
                local_path.unlink()
                logger.info(f"Deleted local photo: {local_path}")
                return True
            else:
                logger.warning(f"Local photo not found: {local_path}")
                return False
        except Exception as e:
            logger.error(f"Failed to delete local photo: {e}")
            return False

    else:
        logger.warning(f"Cannot delete photo with unrecognized URL pattern: {photo_url}")
        return False
