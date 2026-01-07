"""
Request logging middleware for tracking API calls and errors.

Logs each request to a JSONL file with:
- timestamp, method, path, workspace_id
- status_code, duration_ms
- error (if any)
"""
import json
import logging
import time
from datetime import datetime
from pathlib import Path
from typing import Optional
from urllib.parse import parse_qs, urlparse

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)

# Log file location
DATA_DIR = Path(__file__).parent.parent.parent / "data"
REQUEST_LOG_FILE = DATA_DIR / "request_log.jsonl"
ACKNOWLEDGED_ERRORS_FILE = DATA_DIR / "acknowledged_errors.json"

# Paths to skip logging (health checks, static files, docs)
SKIP_PATHS = {"/health", "/docs", "/redoc", "/openapi.json", "/favicon.ico"}

# Keep last N entries in memory for quick access
MAX_MEMORY_ENTRIES = 1000
_recent_requests: list = []


def _extract_workspace_id(request: Request) -> Optional[str]:
    """Extract workspace_id from query parameters."""
    query_string = request.scope.get("query_string", b"").decode()
    params = parse_qs(query_string)
    workspace_ids = params.get("workspace_id", [])
    return workspace_ids[0] if workspace_ids else None


def _write_log_entry(entry: dict) -> None:
    """Append a log entry to the JSONL file."""
    try:
        DATA_DIR.mkdir(exist_ok=True)
        with open(REQUEST_LOG_FILE, "a") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception as e:
        logger.error(f"Failed to write request log: {e}")


def _load_acknowledged_errors() -> dict:
    """Load the acknowledged errors tracking file."""
    if not ACKNOWLEDGED_ERRORS_FILE.exists():
        return {}
    try:
        with open(ACKNOWLEDGED_ERRORS_FILE, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {}


def _save_acknowledged_errors(data: dict) -> None:
    """Save the acknowledged errors tracking file."""
    DATA_DIR.mkdir(exist_ok=True)
    with open(ACKNOWLEDGED_ERRORS_FILE, "w") as f:
        json.dump(data, f, indent=2)


def clear_errors_for_workspace(workspace_id: str) -> dict:
    """
    Mark all current errors as acknowledged for a workspace.

    Returns:
        The acknowledgment record with cleared_before and cleared_at timestamps.
    """
    now = datetime.utcnow().isoformat() + "Z"
    data = _load_acknowledged_errors()
    data[workspace_id] = {
        "cleared_before": now,
        "cleared_at": now,
    }
    _save_acknowledged_errors(data)
    return data[workspace_id]


def get_errors_for_workspace(
    workspace_id: str,
    limit: int = 50,
    include_acknowledged: bool = False
) -> list:
    """
    Get error entries for a specific workspace.

    Args:
        workspace_id: The workspace to get errors for
        limit: Maximum number of errors to return
        include_acknowledged: If True, include errors that have been cleared

    Returns:
        List of error entries with an 'acknowledged' boolean field
    """
    ack_data = _load_acknowledged_errors()
    cleared_before = ack_data.get(workspace_id, {}).get("cleared_before")

    entries = []
    if not REQUEST_LOG_FILE.exists():
        return []

    try:
        with open(REQUEST_LOG_FILE, "r") as f:
            lines = f.readlines()

        for line in reversed(lines):
            if len(entries) >= limit:
                break
            try:
                entry = json.loads(line.strip())
                if entry.get("workspace_id") != workspace_id:
                    continue
                if not entry.get("error"):
                    continue

                is_acknowledged = (
                    cleared_before is not None
                    and entry.get("timestamp", "") <= cleared_before
                )

                if not include_acknowledged and is_acknowledged:
                    continue

                entry["acknowledged"] = is_acknowledged
                entries.append(entry)
            except json.JSONDecodeError:
                continue
    except Exception as e:
        logger.error(f"Failed to read errors for workspace: {e}")

    return entries


def get_recent_requests(
    limit: int = 100,
    workspace_id: Optional[str] = None,
    errors_only: bool = False
) -> list:
    """
    Get recent requests from the log file.

    Args:
        limit: Maximum number of entries to return
        workspace_id: Filter by workspace_id (optional)
        errors_only: Only return requests with errors

    Returns:
        List of request log entries (most recent first)
    """
    entries = []
    try:
        if not REQUEST_LOG_FILE.exists():
            return []

        # Read file in reverse order (most recent first)
        with open(REQUEST_LOG_FILE, "r") as f:
            lines = f.readlines()

        for line in reversed(lines):
            if len(entries) >= limit:
                break
            try:
                entry = json.loads(line.strip())
                # Apply filters
                if workspace_id and entry.get("workspace_id") != workspace_id:
                    continue
                if errors_only and not entry.get("error"):
                    continue
                entries.append(entry)
            except json.JSONDecodeError:
                continue

    except Exception as e:
        logger.error(f"Failed to read request log: {e}")

    return entries


def get_workspace_request_stats(workspace_id: str) -> dict:
    """
    Get request statistics for a specific workspace.

    Returns:
        Dict with total_requests, error_count, unacknowledged_error_count,
        last_request, endpoints breakdown
    """
    # Load acknowledged errors to calculate unacknowledged count
    ack_data = _load_acknowledged_errors()
    cleared_before = ack_data.get(workspace_id, {}).get("cleared_before")

    stats = {
        "workspace_id": workspace_id,
        "total_requests": 0,
        "error_count": 0,
        "unacknowledged_error_count": 0,
        "last_request": None,
        "endpoints": {},
    }

    try:
        if not REQUEST_LOG_FILE.exists():
            return stats

        with open(REQUEST_LOG_FILE, "r") as f:
            for line in f:
                try:
                    entry = json.loads(line.strip())
                    if entry.get("workspace_id") != workspace_id:
                        continue

                    stats["total_requests"] += 1
                    if entry.get("error"):
                        stats["error_count"] += 1
                        # Check if this error is unacknowledged
                        ts = entry.get("timestamp", "")
                        if cleared_before is None or ts > cleared_before:
                            stats["unacknowledged_error_count"] += 1

                    # Track last request
                    ts = entry.get("timestamp")
                    if ts and (stats["last_request"] is None or ts > stats["last_request"]):
                        stats["last_request"] = ts

                    # Track endpoint breakdown
                    endpoint = f"{entry.get('method', 'GET')} {entry.get('path', '/')}"
                    if endpoint not in stats["endpoints"]:
                        stats["endpoints"][endpoint] = {"count": 0, "errors": 0}
                    stats["endpoints"][endpoint]["count"] += 1
                    if entry.get("error"):
                        stats["endpoints"][endpoint]["errors"] += 1

                except json.JSONDecodeError:
                    continue

    except Exception as e:
        logger.error(f"Failed to compute request stats: {e}")

    return stats


class RequestLoggerMiddleware(BaseHTTPMiddleware):
    """Middleware to log all API requests."""

    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip certain paths
        path = request.url.path
        if path in SKIP_PATHS:
            return await call_next(request)

        # Record start time
        start_time = time.time()

        # Extract workspace_id before processing
        workspace_id = _extract_workspace_id(request)

        # Process request
        error_msg = None
        response_body = None
        status_code = 500
        try:
            response = await call_next(request)
            status_code = response.status_code

            # For error responses, capture the response body
            if status_code >= 400:
                # Read the response body
                body_bytes = b""
                async for chunk in response.body_iterator:
                    body_bytes += chunk

                # Try to parse as JSON for cleaner error message
                try:
                    body_json = json.loads(body_bytes.decode("utf-8"))
                    # Extract 'detail' field if present (FastAPI standard)
                    if isinstance(body_json, dict) and "detail" in body_json:
                        error_msg = body_json["detail"]
                        # Handle validation errors (list of dicts)
                        if isinstance(error_msg, list):
                            error_msg = "; ".join(
                                e.get("msg", str(e)) for e in error_msg
                            )
                    else:
                        error_msg = body_bytes.decode("utf-8")[:500]
                except (json.JSONDecodeError, UnicodeDecodeError):
                    error_msg = body_bytes.decode("utf-8", errors="replace")[:500]

                response_body = body_bytes.decode("utf-8", errors="replace")[:1000]

                # Create new response with the same body
                from starlette.responses import Response as StarletteResponse
                response = StarletteResponse(
                    content=body_bytes,
                    status_code=status_code,
                    headers=dict(response.headers),
                    media_type=response.media_type,
                )

        except Exception as e:
            error_msg = str(e)
            raise

        # Calculate duration
        duration_ms = round((time.time() - start_time) * 1000, 2)

        # Fallback error message
        if status_code >= 400 and not error_msg:
            error_msg = f"HTTP {status_code}"

        # Create log entry
        entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "method": request.method,
            "path": path,
            "workspace_id": workspace_id,
            "status_code": status_code,
            "duration_ms": duration_ms,
            "error": error_msg,
        }

        # Include response body for errors (truncated)
        if response_body:
            entry["response_body"] = response_body

        # Write to file (async would be better, but keeping it simple)
        _write_log_entry(entry)

        # Keep in memory for quick access
        _recent_requests.append(entry)
        if len(_recent_requests) > MAX_MEMORY_ENTRIES:
            _recent_requests.pop(0)

        return response
