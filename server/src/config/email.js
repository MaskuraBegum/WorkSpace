import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

console.log('DEBUG:', {
  hasClientId: !!process.env.OAUTH_CLIENT_ID,
  hasClientSecret: !!process.env.OAUTH_CLIENT_SECRET,
  hasRefreshToken: !!process.env.OAUTH_REFRESH_TOKEN,
});

const oauth2Client = new google.auth.OAuth2(
  process.env.OAUTH_CLIENT_ID,
  process.env.OAUTH_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
  refresh_token: process.env.OAUTH_REFRESH_TOKEN,
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// Encodes a raw MIME message into the base64url format Gmail API requires
function buildRawMessage({ to, from, subject, html }) {
  const messageParts = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    html,
  ];
  const message = messageParts.join('\n');

  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export const sendOTPEmail = async (email, otp, name) => {
  try {
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background:#0d0d0d;font-family:'Inter',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 20px;">
            <tr>
              <td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="background:#141414;border-radius:20px;border:1px solid #2a2218;overflow:hidden;max-width:480px;width:100%;">

                  <tr>
                    <td style="background:linear-gradient(135deg,#f5c842,#c9a227);padding:32px;text-align:center;">
                      <div style="font-size:28px;font-weight:900;color:#0d0d0d;letter-spacing:-0.5px;">⚡ WorkSpace</div>
                      <div style="font-size:13px;color:rgba(0,0,0,0.6);margin-top:4px;font-weight:500;">Productivity Chat Platform</div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:36px 32px;">
                      <p style="font-size:22px;font-weight:800;color:#f0ead6;margin:0 0 8px;letter-spacing:-0.3px;">
                        Hi ${name} 👋
                      </p>
                      <p style="font-size:14px;color:#bfa37a;margin:0 0 28px;line-height:1.6;">
                        Thanks for signing up! Use the verification code below to activate your account. This code expires in <strong style="color:#f5c842;">10 minutes</strong>.
                      </p>

                      <div style="background:#1a1a1a;border:1px solid #2a2218;border-radius:16px;padding:28px 16px;text-align:center;margin-bottom:28px;">
                        <p style="font-size:11px;font-weight:700;color:#bfa37a;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px;">
                          Your verification code
                        </p>

                        <div style="text-align:center; direction:ltr; white-space:nowrap;">
                          ${otp.split('').map((digit) => `
                            <div style="
                              display: inline-block;
                              width: 44px;
                              height: 54px;
                              line-height: 54px;
                              background: #0d0d0d;
                              border: 2px solid #f5c842;
                              border-radius: 12px;
                              text-align: center;
                              font-size: 26px;
                              font-weight: 900;
                              color: #f5c842;
                              margin: 0 3px;
                              vertical-align: middle;
                            ">${digit}</div>
                          `).join('')}
                        </div>

                        <p style="font-size:12px;color:#9c845e;margin:16px 0 0;font-weight:600;">
                          Expires in 10 minutes
                        </p>
                      </div>

                      <p style="font-size:13px;color:#9c845e;margin:0;line-height:1.6;">
                        If you didn't create a WorkSpace account, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:20px 32px;border-top:1px solid #2a2218;text-align:center;">
                      <p style="font-size:11px;color:#9c845e;margin:0;">
                        © 2026 WorkSpace · Secure verification email
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

    const raw = buildRawMessage({
      to: email,
      from: `WorkSpace <${process.env.GMAIL_SENDER}>`,
      subject: 'Your WorkSpace Verification Code',
      html: htmlContent,
    });

    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });

    console.log('✅ Email successfully dispatched via Gmail API:', result.data.id);
    return result;
  } catch (error) {
    console.error('❌ Gmail API Dispatch Error:', error.message);
    throw error;
  }
};