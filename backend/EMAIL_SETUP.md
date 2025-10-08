SendGrid and SMTP setup guide

Recommended: Use SendGrid Web API (more reliable on hosting platforms like Render which may block outbound SMTP).

1) SendGrid (recommended)
- Create a SendGrid account and generate an API key.
- Set the following environment variables in your host (Render/GCP/Azure):
  - SENDGRID_API_KEY=your_sendgrid_api_key
  - SENDGRID_FROM=your_verified_sender@example.com (optional, falls back to EMAIL_USER)
- Restart your backend and test with POST /api/email/test

2) SMTP (fallback)
- Provide SMTP server details via environment variables:
  - SMTP_HOST (e.g., smtp.gmail.com)
  - SMTP_PORT (e.g., 587)
  - SMTP_SECURE (true/false)
  - SMTP_USER
  - SMTP_PASS
- Or set EMAIL_USER and EMAIL_PASS (Gmail account with App Password if 2FA enabled).

3) Test endpoint
- Use the test endpoint to verify configuration:
  - POST /api/email/test
  - Body: { "to": "rpplhr@bharathpackagings.com", "subject": "Test", "text": "Hello" }

Notes
- Keep credentials out of source control; use your hosting provider's environment variables.
- If SendGrid is available, the server tries it first and falls back to SMTP only on failure.
