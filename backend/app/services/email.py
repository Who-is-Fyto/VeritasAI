"""
VeritasAI Transactional Email & OTP Service
──────────────────────────────────────────
Provides email dispatch via standard SMTP (Gmail SMTP, Outlook, or custom relays)
for user account creation and sign-in OTP verification.
Includes fallback logging for development environments and live examiner demonstrations.
"""
import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
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


def _send_smtp_sync(
    to_email: str,
    subject: str,
    html_content: str,
    plain_text: str,
    smtp_host: str,
    smtp_port: int,
    smtp_user: str,
    smtp_password: str,
    from_email: str,
) -> bool:
    """
    Synchronous SMTP execution routine executed in an async executor thread.
    Handles STARTTLS (port 587 / standard) and SSL (port 465) transports.
    """
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    sender = from_email.strip() if from_email.strip() else f"VeritasAI Security <{smtp_user}>"
    msg["From"] = sender
    msg["To"] = to_email

    msg.attach(MIMEText(plain_text, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    if smtp_port == 465:
        with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=15) as server:
            server.login(smtp_user, smtp_password)
            server.sendmail(sender, [to_email], msg.as_string())
    else:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(smtp_user, smtp_password)
            server.sendmail(sender, [to_email], msg.as_string())
    return True


async def send_otp_email(to_email: str, otp: str, purpose: str = "signup") -> bool:
    """
    Sends an OTP verification email to the specified recipient via SMTP (e.g. Gmail).
    If SMTP credentials are not configured or in development mode, logs the OTP
    to the server console so tests and offline presentations are never disrupted.
    """
    clean_email = to_email.strip().lower()
    subject = (
        f"VeritasAI Verification Code: {otp}"
        if purpose == "signup"
        else f"VeritasAI Sign-in Code: {otp}"
    )
    html_content = build_otp_html(otp, purpose)
    plain_text = (
        f"VeritasAI One-Time Verification PIN: {otp}\n"
        f"Action: {'Account Registration' if purpose == 'signup' else 'Sign-in Authorization'}\n"
        f"Valid for 10 minutes. If you did not initiate this request, ignore this message."
    )

    # 1. Dev & Fallback Logging for immediate inspection & offline defense
    logger.info("=================================================================")
    logger.info("[VERITAS-AI OTP DISPATCH] Recipient: %s | Purpose: %s", clean_email, purpose)
    logger.info("[VERITAS-AI OTP CODE] >> %s << (Valid for 10 minutes)", otp)
    logger.info("=================================================================")

    # 2. Check if SMTP credentials are configured
    smtp_user = (settings.smtp_user or "").strip()
    smtp_password = (settings.smtp_password or "").strip()
    if not smtp_user or not smtp_password:
        logger.info(
            "SMTP credentials not configured (SMTP_USER / SMTP_PASSWORD). "
            "OTP logged to server console for development mode."
        )
        return True

    # 3. Dispatch via SMTP non-blockingly using asyncio.to_thread
    try:
        await asyncio.to_thread(
            _send_smtp_sync,
            to_email=clean_email,
            subject=subject,
            html_content=html_content,
            plain_text=plain_text,
            smtp_host=settings.smtp_host,
            smtp_port=settings.smtp_port,
            smtp_user=smtp_user,
            smtp_password=smtp_password,
            from_email=settings.smtp_from_email,
        )
        logger.info("OTP verification email dispatched successfully via SMTP to %s", clean_email)
        return True
    except Exception as e:
        logger.error("Failed to send OTP email via SMTP to %s: %s", clean_email, e)
        return False
