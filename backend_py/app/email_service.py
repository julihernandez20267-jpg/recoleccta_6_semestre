"""Envío del código OTP. Brevo (API HTTP) funciona en el plan gratis de Render; SMTP no."""
import logging
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import httpx

from app import config

log = logging.getLogger("recoleccta.email")


def _otp_html(code: str, minutes: int) -> str:
    return f"""\
<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#f4f6f1;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f1;padding:32px 0;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:92%;">
          <tr><td style="background:#1b5e20;padding:24px 28px;color:#ffffff;font-size:22px;font-weight:bold;">
            ♻️ Recoleccta
          </td></tr>
          <tr><td style="padding:28px;color:#1f2a1f;font-size:15px;line-height:1.55;">
            <p style="margin:0 0 12px;">Hola,</p>
            <p style="margin:0 0 20px;">Recibimos una solicitud para restablecer tu contraseña. Usa este código en la app:</p>
            <div style="text-align:center;margin:0 0 20px;">
              <span style="display:inline-block;background:#e8f5e9;color:#1b5e20;font-size:32px;letter-spacing:8px;
                           font-weight:bold;padding:14px 22px;border-radius:12px;font-family:'Courier New',monospace;">{code}</span>
            </div>
            <p style="margin:0 0 8px;">El código vence en <b>{minutes} minutos</b>.</p>
            <p style="margin:0;color:#5f6b5f;font-size:13px;">Si no fuiste tú, ignora este mensaje: tu contraseña no cambiará.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>"""


def _send_brevo(to_email: str, subject: str, html: str, text: str) -> None:
    resp = httpx.post(
        "https://api.brevo.com/v3/smtp/email",
        headers={"api-key": config.BREVO_API_KEY, "accept": "application/json", "content-type": "application/json"},
        json={
            "sender": {"email": config.MAIL_FROM, "name": config.MAIL_FROM_NAME},
            "to": [{"email": to_email}],
            "subject": subject,
            "htmlContent": html,
            "textContent": text,
        },
        timeout=15,
    )
    if resp.status_code >= 300:
        raise RuntimeError(f"Brevo respondió {resp.status_code}: {resp.text[:300]}")


def _send_smtp(to_email: str, subject: str, html: str, text: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{config.MAIL_FROM_NAME} <{config.MAIL_FROM}>"
    msg["To"] = to_email
    msg.attach(MIMEText(text, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))

    context = ssl.create_default_context()
    if config.MAIL_SSL_TLS:
        with smtplib.SMTP_SSL(config.MAIL_SERVER, config.MAIL_PORT, context=context, timeout=15) as server:
            server.login(config.MAIL_USERNAME, config.MAIL_PASSWORD)
            server.sendmail(config.MAIL_FROM, [to_email], msg.as_string())
    else:
        with smtplib.SMTP(config.MAIL_SERVER, config.MAIL_PORT, timeout=15) as server:
            if config.MAIL_STARTTLS:
                server.starttls(context=context)
            server.login(config.MAIL_USERNAME, config.MAIL_PASSWORD)
            server.sendmail(config.MAIL_FROM, [to_email], msg.as_string())


def send_otp_email(to_email: str, code: str) -> None:
    """Se ejecuta en segundo plano; nunca lanza errores hacia la petición HTTP."""
    minutes = config.OTP_EXPIRE_MINUTES
    subject = "Tu código de recuperación de Recoleccta"
    text = f"Tu código para restablecer la contraseña es: {code}. Vence en {minutes} minutos."
    html = _otp_html(code, minutes)
    try:
        if config.MAIL_PROVIDER == "brevo":
            _send_brevo(to_email, subject, html, text)
        elif config.MAIL_PROVIDER == "smtp":
            _send_smtp(to_email, subject, html, text)
        else:
            log.warning("MAIL_PROVIDER=console. Código OTP para %s: %s", to_email, code)
            return
        log.info("Correo OTP enviado a %s vía %s", to_email, config.MAIL_PROVIDER)
    except Exception as exc:  # noqa: BLE001
        log.error("No se pudo enviar el OTP a %s (%s). Código: %s", to_email, exc, code)
