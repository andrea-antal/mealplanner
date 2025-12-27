"""
Feedback router for beta testing feedback submission.
Sends feedback emails to the configured email address.
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
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
    Send feedback email using SMTP.

    Environment variables required:
    - SMTP_HOST: SMTP server host (e.g., smtp.gmail.com)
    - SMTP_PORT: SMTP server port (e.g., 587)
    - SMTP_USER: SMTP username/email
    - SMTP_PASSWORD: SMTP password/app password
    - FEEDBACK_EMAIL: Email address to send feedback to (defaults to hi@andrea-antal.com)
    """
    # Get email configuration from environment variables
    smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = int(os.getenv('SMTP_PORT', '587'))
    smtp_user = os.getenv('SMTP_USER', '')
    smtp_password = os.getenv('SMTP_PASSWORD', '')
    feedback_email = os.getenv('FEEDBACK_EMAIL', 'hi@andrea-antal.com')

    if not smtp_user or not smtp_password:
        # If SMTP not configured, print to console for development
        print("=" * 80)
        print("FEEDBACK SUBMISSION (SMTP not configured)")
        print("=" * 80)
        print(f"To: {feedback_email}")
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
        # Create message
        msg = MIMEMultipart()
        msg['From'] = smtp_user
        msg['To'] = feedback_email
        msg['Subject'] = 'Meal planner beta feedback'

        # Format email body
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

        msg.attach(MIMEText(body, 'plain'))

        # Send email
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)

        return True
    except Exception as e:
        print(f"Error sending email: {e}")
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
