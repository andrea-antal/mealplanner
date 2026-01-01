"""
Feedback router for beta testing feedback submission.
Creates issues in Linear for tracking feedback.
"""
import re
import httpx
from datetime import datetime
from zoneinfo import ZoneInfo
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.config import settings

LINEAR_API_URL = "https://api.linear.app/graphql"

router = APIRouter(prefix="/feedback", tags=["feedback"])


def parse_user_agent(user_agent: str) -> dict:
    """
    Parse user agent string to extract browser and OS information.
    Returns a dict with 'browser', 'version', and 'os' keys.
    """
    browser = "Unknown Browser"
    version = ""
    os_name = "Unknown OS"

    # Detect OS
    if "Windows NT 10.0" in user_agent:
        os_name = "Windows 10/11"
    elif "Windows NT 6.3" in user_agent:
        os_name = "Windows 8.1"
    elif "Windows NT 6.2" in user_agent:
        os_name = "Windows 8"
    elif "Windows NT 6.1" in user_agent:
        os_name = "Windows 7"
    elif "Windows" in user_agent:
        os_name = "Windows"
    elif "Mac OS X" in user_agent:
        # Extract macOS version
        mac_match = re.search(r'Mac OS X ([\d_]+)', user_agent)
        if mac_match:
            mac_version = mac_match.group(1).replace('_', '.')
            os_name = f"macOS {mac_version}"
        else:
            os_name = "macOS"
    elif "Android" in user_agent:
        # Extract Android version
        android_match = re.search(r'Android ([\d.]+)', user_agent)
        if android_match:
            os_name = f"Android {android_match.group(1)}"
        else:
            os_name = "Android"
    elif "Linux" in user_agent:
        os_name = "Linux"
    elif "iPhone" in user_agent or "iPad" in user_agent:
        os_name = "iOS"

    # Detect browser (order matters - check specific browsers before generic ones)
    if "Edg/" in user_agent or "Edge/" in user_agent:
        browser = "Microsoft Edge"
        edge_match = re.search(r'(?:Edg|Edge)/([\d.]+)', user_agent)
        if edge_match:
            version = edge_match.group(1)
    elif "Chrome/" in user_agent and "Safari/" in user_agent:
        # Chrome (but not Edge or other Chrome-based browsers)
        if "OPR/" in user_agent or "Opera/" in user_agent:
            browser = "Opera"
            opera_match = re.search(r'(?:OPR|Opera)/([\d.]+)', user_agent)
            if opera_match:
                version = opera_match.group(1)
        elif "Brave" in user_agent:
            browser = "Brave"
            chrome_match = re.search(r'Chrome/([\d.]+)', user_agent)
            if chrome_match:
                version = chrome_match.group(1)
        else:
            browser = "Google Chrome"
            chrome_match = re.search(r'Chrome/([\d.]+)', user_agent)
            if chrome_match:
                version = chrome_match.group(1)
    elif "Safari/" in user_agent and "Version/" in user_agent:
        browser = "Safari"
        safari_match = re.search(r'Version/([\d.]+)', user_agent)
        if safari_match:
            version = safari_match.group(1)
    elif "Firefox/" in user_agent:
        browser = "Firefox"
        firefox_match = re.search(r'Firefox/([\d.]+)', user_agent)
        if firefox_match:
            version = firefox_match.group(1)

    return {
        "browser": browser,
        "version": version,
        "os": os_name
    }


class BrowserInfo(BaseModel):
    userAgent: str
    language: str
    screenResolution: str
    viewportSize: str
    timezone: str
    platform: str


class FeedbackRequest(BaseModel):
    workspace_id: str
    feedback: str
    browser_info: BrowserInfo
    timestamp: str


def create_linear_issue(feedback_data: FeedbackRequest) -> dict:
    """
    Create a Linear issue from feedback submission.

    Uses configuration from app settings:
    - LINEAR_API_KEY: Linear API key (get from Linear Settings > API)
    - LINEAR_TEAM_ID: Team UUID
    - LINEAR_PROJECT_ID: Project UUID for routing feedback
    """
    linear_api_key = settings.LINEAR_API_KEY
    team_id = settings.LINEAR_TEAM_ID
    project_id = settings.LINEAR_PROJECT_ID
    label_id = settings.LINEAR_LABEL_ID

    # Convert timestamp to PST (America/Vancouver)
    try:
        utc_time = datetime.fromisoformat(feedback_data.timestamp.replace('Z', '+00:00'))
        pst_time = utc_time.astimezone(ZoneInfo("America/Vancouver"))
        formatted_time = pst_time.strftime("%B %d, %Y at %I:%M %p PST")
    except Exception:
        formatted_time = feedback_data.timestamp

    # Parse user agent to extract browser and OS info
    browser_info = parse_user_agent(feedback_data.browser_info.userAgent)

    # Format issue description (same structure as previous email body)
    description = f"""**Date of submission:** {formatted_time}
**Workspace ID:** {feedback_data.workspace_id}

## Browser Information
- **Browser:** {browser_info['browser']} {browser_info['version']}
- **Operating System:** {browser_info['os']}
- **Language:** {feedback_data.browser_info.language}
- **Screen Resolution:** {feedback_data.browser_info.screenResolution}
- **Viewport Size:** {feedback_data.browser_info.viewportSize}
- **Timezone:** {feedback_data.browser_info.timezone}

## Feedback
{feedback_data.feedback}
"""

    if not linear_api_key:
        # If Linear API not configured, print to console for development
        print("=" * 80)
        print("FEEDBACK SUBMISSION (Linear API not configured)")
        print("=" * 80)
        print(f"Title: Meal planner beta feedback")
        print(description)
        print("=" * 80)
        return {"success": True, "issue": None}

    # GraphQL mutation for creating an issue
    mutation = """
    mutation IssueCreate($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue {
          id
          identifier
          url
        }
      }
    }
    """

    # Build input with required and optional fields
    issue_input = {
        "teamId": team_id,
        "title": "Meal planner beta feedback",
        "description": description,
    }
    if project_id:
        issue_input["projectId"] = project_id
    if label_id:
        issue_input["labelIds"] = [label_id]

    try:
        with httpx.Client() as client:
            response = client.post(
                LINEAR_API_URL,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": linear_api_key,
                },
                json={
                    "query": mutation,
                    "variables": {"input": issue_input},
                },
                timeout=30.0,
            )
            response.raise_for_status()
            result = response.json()

            if "errors" in result:
                raise Exception(f"Linear API error: {result['errors']}")

            issue_data = result.get("data", {}).get("issueCreate", {})
            if issue_data.get("success"):
                issue = issue_data.get("issue", {})
                print(f"Linear issue created: {issue.get('identifier')} - {issue.get('url')}")
                return {"success": True, "issue": issue}
            else:
                raise Exception("Linear issue creation failed")

    except Exception as e:
        print(f"Error creating Linear issue: {e}")
        raise


@router.post("")
async def submit_feedback(feedback: FeedbackRequest):
    """
    Submit beta testing feedback.
    Creates a Linear issue with the feedback, workspace ID, and browser information.
    """
    try:
        result = create_linear_issue(feedback)
        return {"status": "success", "message": "Feedback submitted successfully", "issue": result.get("issue")}
    except Exception as e:
        print(f"Error processing feedback: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to submit feedback: {str(e)}"
        )
