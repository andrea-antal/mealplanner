"""
Feedback router for beta testing feedback submission.
Sends feedback emails to the configured email address.
"""
import re
import resend
from datetime import datetime
from zoneinfo import ZoneInfo
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.config import settings

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


def send_feedback_email(feedback_data: FeedbackRequest) -> bool:
    """
    Send feedback email using Resend API.

    Uses configuration from app settings:
    - RESEND_API_KEY: Resend API key (get from resend.com/api-keys)
    - FEEDBACK_EMAIL_FROM: Sender email (must be verified domain)
    - FEEDBACK_EMAIL_TO: Recipient email (defaults to hi@andrea-antal.com)
    """
    # Get email configuration from settings
    resend_api_key = settings.RESEND_API_KEY
    feedback_email_from = settings.FEEDBACK_EMAIL_FROM
    feedback_email_to = settings.FEEDBACK_EMAIL_TO

    if not resend_api_key:
        # If Resend API not configured, print to console for development
        print("=" * 80)
        print("FEEDBACK SUBMISSION (Resend API not configured)")
        print("=" * 80)
        print(f"From: {feedback_email_from}")
        print(f"To: {feedback_email_to}")
        print(f"Subject: Meal planner beta feedback")
        print(f"\nDate of submission: {feedback_data.timestamp}")
        print(f"Workspace ID: {feedback_data.workspace_id}")
        print(f"\nBrowser Information:")
        print(f"  User Agent: {feedback_data.browser_info.userAgent}")
        print(f"  Platform: {feedback_data.browser_info.platform}")
        print(f"  Language: {feedback_data.browser_info.language}")
        print(f"  Screen Resolution: {feedback_data.browser_info.screenResolution}")
        print(f"  Viewport Size: {feedback_data.browser_info.viewportSize}")
        print(f"  Timezone: {feedback_data.browser_info.timezone}")
        print(f"\nFeedback:")
        print(feedback_data.feedback)
        print("=" * 80)
        return True

    try:
        # Set Resend API key
        resend.api_key = resend_api_key

        # Convert timestamp to PST (America/Vancouver)
        try:
            utc_time = datetime.fromisoformat(feedback_data.timestamp.replace('Z', '+00:00'))
            pst_time = utc_time.astimezone(ZoneInfo("America/Vancouver"))
            formatted_time = pst_time.strftime("%B %d, %Y at %I:%M %p PST")
        except Exception:
            formatted_time = feedback_data.timestamp  # Fallback to original if parsing fails

        # Parse user agent to extract browser and OS info
        user_agent = feedback_data.browser_info.userAgent
        browser_info = parse_user_agent(user_agent)

        # Format email body
        body = f"""Date of submission: {formatted_time}
Workspace ID: {feedback_data.workspace_id}

Browser Information:
  Browser: {browser_info['browser']} {browser_info['version']}
  Operating System: {browser_info['os']}
  Language: {feedback_data.browser_info.language}
  Screen Resolution: {feedback_data.browser_info.screenResolution}
  Viewport Size: {feedback_data.browser_info.viewportSize}
  Timezone: {feedback_data.browser_info.timezone}

Feedback:
{feedback_data.feedback}
"""

        # Send email via Resend API
        params: resend.Emails.SendParams = {
            "from": feedback_email_from,
            "to": [feedback_email_to],
            "subject": "Meal planner beta feedback",
            "text": body,
        }

        response = resend.Emails.send(params)
        print(f"Feedback email sent successfully. Email ID: {response.get('id', 'N/A')}")

        return True
    except Exception as e:
        print(f"Error sending email via Resend: {e}")
        raise


@router.post("")
async def submit_feedback(feedback: FeedbackRequest):
    """
    Submit beta testing feedback.
    Sends an email with the feedback, workspace ID, and browser information.
    """
    try:
        send_feedback_email(feedback)
        return {"status": "success", "message": "Feedback submitted successfully"}
    except Exception as e:
        print(f"Error processing feedback: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to submit feedback: {str(e)}"
        )
