from django.core.mail.backends.base import BaseEmailBackend
from django.conf import settings
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

class SendGridBackend(BaseEmailBackend):
    def send_messages(self, email_messages):
        sent_count = 0
        sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
        for message in email_messages:
            mail = Mail(
                from_email=message.from_email or settings.DEFAULT_FROM_EMAIL,
                to_emails=message.to,
                subject=message.subject,
                plain_text_content=message.body,
                html_content=message.alternatives[0][0] if message.alternatives else None,
            )
            try:
                sg.send(mail)
                sent_count += 1
            except Exception as e:
                if not self.fail_silently:
                    raise
        return sent_count 