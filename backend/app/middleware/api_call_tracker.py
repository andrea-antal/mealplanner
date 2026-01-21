"""
External API call tracker for Claude and OpenAI usage.

Tracks each call to external APIs:
- Claude (Anthropic) for meal plan generation, recipe generation, etc.
- OpenAI for embeddings

Stores counts in a JSONL file and provides aggregation functions.
"""
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Literal
from collections import defaultdict

logger = logging.getLogger(__name__)

# Log file location
DATA_DIR = Path(__file__).parent.parent.parent / "data"
API_CALLS_LOG_FILE = DATA_DIR / "api_calls.jsonl"

APIProvider = Literal["claude", "openai"]


def log_api_call(
    provider: APIProvider,
    workspace_id: Optional[str],
    operation: str,
    model: Optional[str] = None,
    input_tokens: Optional[int] = None,
    output_tokens: Optional[int] = None,
    error: Optional[str] = None
) -> None:
    """
    Log an external API call.

    Args:
        provider: "claude" or "openai"
        workspace_id: The workspace making the call
        operation: What the call was for (e.g., "meal_plan_generation", "embedding")
        model: The model used (e.g., "claude-sonnet-4-20250514", "text-embedding-3-small")
        input_tokens: Number of input tokens (if available)
        output_tokens: Number of output tokens (if available)
        error: Error message if the call failed
    """
    entry = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "provider": provider,
        "workspace_id": workspace_id,
        "operation": operation,
        "model": model,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "error": error,
    }

    try:
        DATA_DIR.mkdir(exist_ok=True)
        with open(API_CALLS_LOG_FILE, "a") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception as e:
        logger.error(f"Failed to write API call log: {e}")


def get_workspace_api_stats(workspace_id: str) -> dict:
    """
    Get API call statistics for a specific workspace.

    Returns:
        Dict with claude_calls, openai_calls, total breakdown by operation
    """
    stats = {
        "claude_calls": 0,
        "openai_calls": 0,
        "claude_errors": 0,
        "openai_errors": 0,
        "claude_input_tokens": 0,
        "claude_output_tokens": 0,
        "operations": defaultdict(int),
    }

    try:
        if not API_CALLS_LOG_FILE.exists():
            return dict(stats)

        with open(API_CALLS_LOG_FILE, "r") as f:
            for line in f:
                try:
                    entry = json.loads(line.strip())
                    if entry.get("workspace_id") != workspace_id:
                        continue

                    provider = entry.get("provider")
                    operation = entry.get("operation", "unknown")

                    if provider == "claude":
                        stats["claude_calls"] += 1
                        if entry.get("error"):
                            stats["claude_errors"] += 1
                        if entry.get("input_tokens"):
                            stats["claude_input_tokens"] += entry["input_tokens"]
                        if entry.get("output_tokens"):
                            stats["claude_output_tokens"] += entry["output_tokens"]
                    elif provider == "openai":
                        stats["openai_calls"] += 1
                        if entry.get("error"):
                            stats["openai_errors"] += 1

                    stats["operations"][f"{provider}:{operation}"] += 1

                except json.JSONDecodeError:
                    continue

    except Exception as e:
        logger.error(f"Failed to compute API call stats: {e}")

    # Convert defaultdict to regular dict for JSON serialization
    stats["operations"] = dict(stats["operations"])
    return stats


def get_all_api_stats() -> dict:
    """
    Get aggregated API call statistics across all workspaces.

    Returns:
        Dict with total counts and per-workspace breakdown
    """
    totals = {
        "claude_calls": 0,
        "openai_calls": 0,
        "claude_errors": 0,
        "openai_errors": 0,
        "by_workspace": defaultdict(lambda: {"claude": 0, "openai": 0}),
    }

    try:
        if not API_CALLS_LOG_FILE.exists():
            totals["by_workspace"] = {}
            return totals

        with open(API_CALLS_LOG_FILE, "r") as f:
            for line in f:
                try:
                    entry = json.loads(line.strip())
                    provider = entry.get("provider")
                    ws = entry.get("workspace_id", "unknown")

                    if provider == "claude":
                        totals["claude_calls"] += 1
                        totals["by_workspace"][ws]["claude"] += 1
                        if entry.get("error"):
                            totals["claude_errors"] += 1
                    elif provider == "openai":
                        totals["openai_calls"] += 1
                        totals["by_workspace"][ws]["openai"] += 1
                        if entry.get("error"):
                            totals["openai_errors"] += 1

                except json.JSONDecodeError:
                    continue

    except Exception as e:
        logger.error(f"Failed to compute total API stats: {e}")

    totals["by_workspace"] = dict(totals["by_workspace"])
    return totals
