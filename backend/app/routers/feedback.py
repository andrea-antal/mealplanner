"""
Feedback router for beta testing feedback submission.
Sends feedback emails to the configured email address.
"""
import os
import resend
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/feedback", tags=["feedback"])


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

    Environment variables required:
    - RESEND_API_KEY: Resend API key (get from resend.com/api-keys)
    - FEEDBACK_EMAIL_FROM: Sender email (must be verified domain)
    - FEEDBACK_EMAIL_TO: Recipient email (defaults to hi@andrea-antal.com)
    """
    # Get email configuration from environment variables
    resend_api_key = os.getenv('RESEND_API_KEY', '')
    feedback_email_from = os.getenv('FEEDBACK_EMAIL_FROM', 'onboarding@resend.dev')
    feedback_email_to = os.getenv('FEEDBACK_EMAIL_TO', 'hi@andrea-antal.com')

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

        # Format email body (same as SMTP version)
        body = f"""Date of submission: {feedback_data.timestamp}
Workspace ID: {feedback_data.workspace_id}

Browser Information:
  User Agent: {feedback_data.browser_info.userAgent}
  Platform: {feedback_data.browser_info.platform}
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
