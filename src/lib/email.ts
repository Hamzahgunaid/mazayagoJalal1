type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

const RESEND_API_URL = "https://api.resend.com/emails";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}

export async function sendEmail(input: SendEmailInput) {
  const apiKey = requiredEnv("RESEND_API_KEY");
  const from = requiredEnv("EMAIL_FROM");
  const replyTo = process.env.EMAIL_REPLY_TO;

  const payload: Record<string, any> = {
    from,
    to: [input.to],
    subject: input.subject,
    text: input.text,
  };

  if (input.html) payload.html = input.html;
  if (replyTo) payload.reply_to = replyTo;

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Email send failed: ${response.status} ${detail}`.trim());
  }
}

export function buildVerificationEmail(code: string, ttlMinutes: number) {
  const subject = "Your MazayaGo verification code";
  const text = [
    `Your MazayaGo verification code is ${code}.`,
    "",
    `This code expires in ${ttlMinutes} minutes.`,
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  return { subject, text };
}

export async function sendVerificationCodeEmail(
  to: string,
  code: string,
  ttlMinutes: number,
) {
  const { subject, text } = buildVerificationEmail(code, ttlMinutes);
  await sendEmail({ to, subject, text });
}
