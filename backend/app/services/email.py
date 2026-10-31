"""
VeritasAI Transactional Email & OTP Service
──────────────────────────────────────────
Provides email dispatch via Resend for user account creation and sign-in OTP verification.
Includes fallback logging for development environments and live examiner demonstrations.
"""
import logging
import httpx
from app.config import settings

logger = logging.getLogger(__name__)


def build_otp_html(otp: str, purpose: str = "signup") -> str:
    action_label = "Account Registration" if purpose == "signup" else "Sign-in Authorization"
    action_desc = (
        "Thank you for registering with VeritasAI. To verify your email and activate your account, please enter the one-time PIN below:"
        if purpose == "signup"
        else "A sign-in request was initiated for your VeritasAI account. Please enter the one-time PIN below to verify your identity:"
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VeritasAI Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" style="max-width: 520px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
                VERITAS<span style="color: #3b82f6;">AI</span>
              </h1>
              <p style="margin: 6px 0 0; color: #94a3b8; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;">
                Multimodal Credibility Engine
              </p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 32px;">
              <div style="display: inline-block; padding: 4px 10px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 20px; color: #1d4ed8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px;">
                {action_label}
              </div>

              <h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 700; color: #0f172a;">
                One-Time Verification PIN
              </h2>

              <p style="margin: 0 0 24px; font-size: 13px; line-height: 1.6; color: #475569;">
                {action_desc}
              </p>

              <!-- OTP Code Display Card -->
              <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #0f172a; display: block; margin-left: 10px;">
                  {otp}
                </span>
                <p style="margin: 8px 0 0; font-size: 11px; color: #64748b; font-weight: 600;">
                  Valid for 10 minutes &bull; Single-use only
                </p>
              </div>

              <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px 14px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #92400e;">
                  <strong>Security Reminder:</strong> VeritasAI engineers will never ask for your verification code. If you did not initiate this request, you can safely ignore this email.
                </p>
              </div>

              <p style="margin: 0; font-size: 12px; color: #64748b;">
                Need help? Contact system administration or consult the project documentation.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8; font-weight: 500;">
                VeritasAI Credibility & Disinformation Detection Architecture<br>
                BSc Information Technology Dissertation &bull; Michael Mazhambe
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


async def send_otp_email(to_email: str, otp: str, purpose: str = "signup") -> bool:
    """
    Sends an OTP verification email to the specified recipient via Resend.
    If RESEND_API_KEY is not configured or in development mode, logs the OTP
    to the server console so tests and presentations are never disrupted.
    """
    clean_email = to_email.strip().lower()
    subject = (
        f"VeritasAI Verification Code: {otp}"
        if purpose == "signup"
        else f"VeritasAI Sign-in Code: {otp}"
    )
    html_content = build_otp_html(otp, purpose)

    # 1. Dev & Fallback Logging for immediate inspection & offline defense
    logger.info("=================================================================")
    logger.info("[VERITAS-AI OTP DISPATCH] Recipient: %s | Purpose: %s", clean_email, purpose)
    logger.info("[VERITAS-AI OTP CODE] >> %s << (Valid for 10 minutes)", otp)
    logger.info("=================================================================")

    # 2. Check if Resend API key is present
    api_key = (settings.resend_api_key or "").strip()
    if not api_key:
        logger.info(
            "RESEND_API_KEY is not configured. OTP printed to server logs for development testing."
        )
        return True

    # 3. Dispatch via Resend REST API using httpx async client
    try:
        from_email = settings.resend_from_email or "VeritasAI Security <onboarding@resend.dev>"
        payload = {
            "from": from_email,
            "to": [clean_email],
            "subject": subject,
            "html": html_content,
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )

        if res.status_code in {200, 201}:
            data = res.json()
            logger.info("Email dispatched successfully via Resend. ID: %s", data.get("id"))
            return True
        else:
            logger.warning(
                "Resend API returned status %s: %s. Falling back to local verification.",
                res.status_code,
                res.text,
            )
            return False
    except Exception as e:
        logger.error("Failed to send email via Resend: %s. Continuing with fallback.", e)
        return False
