"""
Structured logging for onboarding funnel tracking.

Provides observability into the new user onboarding flow:
- Tracks funnel stages (started, steps, completed, skipped)
- Identifies drop-off points
- Enables analysis of completion rates

Events are logged to:
1. Application logger (stdout, captured by Railway)
2. JSONL file (backend/data/onboarding_events.jsonl)
"""
import json
import logging
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Log file for onboarding events
ONBOARDING_LOG_FILE = Path(__file__).parent.parent.parent / "data" / "onboarding_events.jsonl"


class OnboardingEvent(Enum):
    """Onboarding funnel events."""
    STARTED = "onboarding_started"
    STEP_VIEWED = "onboarding_step_viewed"
    STEP_COMPLETED = "onboarding_step_completed"
    COMPLETED = "onboarding_completed"
    SKIPPED = "onboarding_skipped"
    ABANDONED = "onboarding_abandoned"
    ERROR = "onboarding_error"


def log_onboarding_event(
    workspace_id: str,
    event: OnboardingEvent,
    step: Optional[int] = None,
    step_name: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> None:
    """
    Log an onboarding funnel event.

    Args:
        workspace_id: User's workspace identifier
        event: Type of onboarding event
        step: Current step number (0-indexed)
        step_name: Human-readable step name
        metadata: Additional event data
    """
    entry = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "workspace_id": workspace_id,
        "event": event.value,
        "step": step,
        "step_name": step_name,
        "metadata": metadata or {}
    }

    # Log to application logger (captured by Railway)
    logger.info(
        f"Onboarding event: {event.value} | workspace={workspace_id}"
        + (f" | step={step}" if step is not None else "")
        + (f" | step_name={step_name}" if step_name else ""),
        extra={"onboarding_event": entry}
    )

    # Write to dedicated onboarding log file
    try:
        ONBOARDING_LOG_FILE.parent.mkdir(exist_ok=True)
        with open(ONBOARDING_LOG_FILE, "a") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception as e:
        logger.error(f"Failed to write onboarding log: {e}")


def log_onboarding_started(workspace_id: str) -> None:
    """Log when onboarding wizard is first shown."""
    log_onboarding_event(workspace_id, OnboardingEvent.STARTED)


def log_step_viewed(workspace_id: str, step: int, step_name: str) -> None:
    """Log when user views a step."""
    log_onboarding_event(
        workspace_id,
        OnboardingEvent.STEP_VIEWED,
        step=step,
        step_name=step_name
    )


def log_step_completed(
    workspace_id: str,
    step: int,
    step_name: str,
    data: Optional[Dict[str, Any]] = None
) -> None:
    """Log when user completes a step."""
    log_onboarding_event(
        workspace_id,
        OnboardingEvent.STEP_COMPLETED,
        step=step,
        step_name=step_name,
        metadata=data
    )


def log_onboarding_completed(
    workspace_id: str,
    total_duration_seconds: Optional[float] = None,
    onboarding_answers: Optional[Dict[str, Any]] = None
) -> None:
    """
    Log successful onboarding completion with all answers.

    Args:
        workspace_id: User's workspace identifier
        total_duration_seconds: How long the user took to complete
        onboarding_answers: Dict of all onboarding responses for analytics
    """
    metadata = {"duration_seconds": total_duration_seconds}
    if onboarding_answers:
        metadata["answers"] = onboarding_answers

    log_onboarding_event(
        workspace_id,
        OnboardingEvent.COMPLETED,
        metadata=metadata
    )


def log_onboarding_skipped(
    workspace_id: str,
    skip_count: int,
    permanent: bool
) -> None:
    """Log when user skips onboarding."""
    log_onboarding_event(
        workspace_id,
        OnboardingEvent.SKIPPED,
        metadata={"skip_count": skip_count, "permanent": permanent}
    )


def log_onboarding_error(
    workspace_id: str,
    error: str,
    step: Optional[int] = None
) -> None:
    """Log onboarding errors."""
    log_onboarding_event(
        workspace_id,
        OnboardingEvent.ERROR,
        step=step,
        metadata={"error": error}
    )


def get_onboarding_funnel_stats() -> Dict[str, Any]:
    """
    Get aggregated funnel statistics from the log file.

    Returns:
        Dict with counts for each event type and completion rate.
    """
    if not ONBOARDING_LOG_FILE.exists():
        return {
            "total_started": 0,
            "total_completed": 0,
            "total_skipped": 0,
            "completion_rate": 0.0,
            "skip_rate": 0.0,
            "step_views": {},
            "message": "No onboarding events logged yet"
        }

    stats = {
        "total_started": 0,
        "total_completed": 0,
        "total_skipped": 0,
        "total_errors": 0,
        "step_views": {},
        "recent_events": [],
        "completion_rate": 0.0,
        "skip_rate": 0.0,
    }

    try:
        with open(ONBOARDING_LOG_FILE, "r") as f:
            entries = []
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                    entries.append(entry)
                    event = entry.get("event")

                    if event == OnboardingEvent.STARTED.value:
                        stats["total_started"] += 1
                    elif event == OnboardingEvent.COMPLETED.value:
                        stats["total_completed"] += 1
                    elif event == OnboardingEvent.SKIPPED.value:
                        stats["total_skipped"] += 1
                    elif event == OnboardingEvent.ERROR.value:
                        stats["total_errors"] += 1
                    elif event == OnboardingEvent.STEP_VIEWED.value:
                        step_name = entry.get("step_name", f"step_{entry.get('step')}")
                        stats["step_views"][step_name] = stats["step_views"].get(step_name, 0) + 1

                except json.JSONDecodeError:
                    continue

            # Get last 10 events for recent activity
            stats["recent_events"] = entries[-10:] if entries else []

        # Calculate rates
        if stats["total_started"] > 0:
            stats["completion_rate"] = round(
                stats["total_completed"] / stats["total_started"], 3
            )
            stats["skip_rate"] = round(
                stats["total_skipped"] / stats["total_started"], 3
            )

    except Exception as e:
        logger.error(f"Failed to compute funnel stats: {e}")
        stats["error"] = str(e)

    return stats


def get_detailed_onboarding_analytics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get detailed onboarding analytics with answer distributions.

    Aggregates onboarding data across all workspaces to show:
    - Answer distributions (percentage for each option)
    - Per-workspace details for browsing
    - Filterable by date range

    Args:
        start_date: Optional ISO date string to filter from (inclusive)
        end_date: Optional ISO date string to filter to (inclusive)

    Returns:
        Dict containing:
        - total_completions: Number of completed onboardings
        - completion_rate: Completion rate as decimal
        - skip_rate: Skip rate as decimal
        - answer_distributions: {field: {option: percentage}}
        - workspace_details: List of per-workspace onboarding data
    """
    # Import here to avoid circular imports
    from app.data.data_manager import list_workspaces, load_household_profile

    result = {
        "total_completions": 0,
        "total_started": 0,
        "total_skipped": 0,
        "completion_rate": 0.0,
        "skip_rate": 0.0,
        "answer_distributions": {},
        "workspace_details": [],
    }

    # Parse date filters
    start_dt = None
    end_dt = None
    try:
        if start_date:
            start_dt = datetime.fromisoformat(start_date.replace("Z", ""))
        if end_date:
            end_dt = datetime.fromisoformat(end_date.replace("Z", ""))
            # Include the entire end day
            end_dt = end_dt.replace(hour=23, minute=59, second=59)
    except ValueError as e:
        logger.warning(f"Invalid date format in analytics request: {e}")

    # Collect answer counts for distribution calculation
    answer_counts: Dict[str, Dict[str, int]] = {
        "skill_level": {},
        "cooking_frequency": {},
        "kitchen_equipment_level": {},
        "pantry_stock_level": {},
        "primary_goal": {},
        "dietary_goals": {},
        "starter_content_choice": {},
    }

    # Get funnel stats for totals
    funnel_stats = get_onboarding_funnel_stats()
    result["total_started"] = funnel_stats.get("total_started", 0)
    result["total_skipped"] = funnel_stats.get("total_skipped", 0)

    # Iterate through all workspaces to collect onboarding data
    try:
        workspaces = list_workspaces()

        for workspace_id in workspaces:
            profile = load_household_profile(workspace_id)
            if not profile:
                continue

            # Check if onboarding was completed
            status = profile.onboarding_status
            if not status or not status.completed:
                continue

            # Check date filter
            completed_at = status.completed_at
            if completed_at:
                try:
                    completed_dt = datetime.fromisoformat(completed_at.replace("Z", ""))
                    if start_dt and completed_dt < start_dt:
                        continue
                    if end_dt and completed_dt > end_dt:
                        continue
                except ValueError:
                    pass  # Invalid date, include anyway

            result["total_completions"] += 1

            # Get onboarding data
            data = profile.onboarding_data
            if not data:
                continue

            # Collect answers for distribution
            data_dict = data.model_dump() if hasattr(data, 'model_dump') else data.__dict__

            for field in answer_counts.keys():
                value = data_dict.get(field)
                if value and isinstance(value, str):
                    answer_counts[field][value] = answer_counts[field].get(value, 0) + 1

            # Collect cuisine preferences (multi-select)
            cuisines = data_dict.get("cuisine_preferences", [])
            if "cuisine_preferences" not in answer_counts:
                answer_counts["cuisine_preferences"] = {}
            for cuisine in cuisines:
                answer_counts["cuisine_preferences"][cuisine] = (
                    answer_counts["cuisine_preferences"].get(cuisine, 0) + 1
                )

            # Collect dietary patterns (multi-select)
            patterns = data_dict.get("dietary_patterns", [])
            if "dietary_patterns" not in answer_counts:
                answer_counts["dietary_patterns"] = {}
            for pattern in patterns:
                answer_counts["dietary_patterns"][pattern] = (
                    answer_counts["dietary_patterns"].get(pattern, 0) + 1
                )

            # Add to workspace details
            result["workspace_details"].append({
                "workspace_id": workspace_id,
                "completed_at": completed_at,
                "answers": {
                    "skill_level": data_dict.get("skill_level"),
                    "cooking_frequency": data_dict.get("cooking_frequency"),
                    "kitchen_equipment_level": data_dict.get("kitchen_equipment_level"),
                    "pantry_stock_level": data_dict.get("pantry_stock_level"),
                    "primary_goal": data_dict.get("primary_goal"),
                    "cuisine_preferences": data_dict.get("cuisine_preferences", []),
                    "dietary_goals": data_dict.get("dietary_goals"),
                    "dietary_patterns": data_dict.get("dietary_patterns", []),
                    "starter_content_choice": data_dict.get("starter_content_choice"),
                },
            })

    except Exception as e:
        logger.error(f"Error collecting onboarding analytics: {e}")
        result["error"] = str(e)

    # Calculate distributions as percentages
    total = result["total_completions"]
    if total > 0:
        for field, counts in answer_counts.items():
            if counts:
                result["answer_distributions"][field] = {
                    option: round(count / total, 3)
                    for option, count in counts.items()
                }

        # Calculate rates
        if result["total_started"] > 0:
            result["completion_rate"] = round(
                result["total_completions"] / result["total_started"], 3
            )
            result["skip_rate"] = round(
                result["total_skipped"] / result["total_started"], 3
            )

    # Sort workspace details by completion date (newest first)
    result["workspace_details"].sort(
        key=lambda x: x.get("completed_at") or "",
        reverse=True
    )

    return result
