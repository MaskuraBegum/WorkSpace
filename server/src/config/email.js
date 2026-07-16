import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

// Sign up free at https://resend.com, grab your API key, and set
// RESEND_API_KEY in your environment variables (locally AND on your host).
const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOTPEmail = async (email, otp, name) => {
  const html = `
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

              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#f5c842,#c9a227);padding:32px;text-align:center;">
                  <div style="font-size:28px;font-weight:900;color:#0d0d0d;letter-spacing:-0.5px;">⚡ WorkSpace</div>
                  <div style="font-size:13px;color:rgba(0,0,0,0.6);margin-top:4px;font-weight:500;">Productivity Chat Platform</div>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:36px 32px;">
                  <p style="font-size:22px;font-weight:800;color:#f0ead6;margin:0 0 8px;letter-spacing:-0.3px;">
                    Hi ${name} 👋
                  </p>
                  <p style="font-size:14px;color:#bfa37a;margin:0 0 28px;line-height:1.6;">
                    Thanks for signing up! Use the verification code below to activate your account. This code expires in <strong style="color:#f5c842;">10 minutes</strong>.
                  </p>

                  <!-- OTP Box -->
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

              <!-- Footer -->
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

  const { data, error } = await resend.emails.send({
    // Use 'onboarding@resend.dev' for testing without your own domain,
    // or 'WorkSpace <noreply@yourdomain.com>' once you verify a domain in Resend.
    from: 'WorkSpace <onboarding@resend.dev>',
    to: email,
    subject: 'Your WorkSpace Verification Code',
    html,
  });

  if (error) {
    console.error('Resend error:', error);
    throw new Error(error.message || 'Failed to send email');
  }

  console.log('✅ Email sent:', data?.id, 'to', email);
  return data;
};