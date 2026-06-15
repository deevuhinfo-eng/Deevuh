import { Resend } from 'resend';
import crypto from 'crypto';
import prisma from '../../config/database.js';

const resend = new Resend(process.env.RESEND_API_KEY || '');

/**
 * Verified sender address — deevuh.in is confirmed in Resend.
 */
const FROM_ADDRESS = 'Deevuh <confirmation@deevuh.in>';

export const generateVerificationToken = async (email: string): Promise<string> => {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Remove any existing tokens for this email, then create a fresh one
  await prisma.emailVerificationToken.deleteMany({ where: { email } });
  await prisma.emailVerificationToken.create({
    data: { email, token: hashedToken, expiresAt },
  });

  return token;
};

export const generatePasswordResetToken = async (email: string): Promise<string> => {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Remove any existing tokens for this email, then create a fresh one
  await prisma.passwordResetToken.deleteMany({ where: { email } });
  await prisma.passwordResetToken.create({
    data: { email, token: hashedToken, expiresAt },
  });

  return token;
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  if (!process.env.RESEND_API_KEY) {
    console.log(`[Email] No API key — skipping send. Reset URL: ${resetUrl}`);
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: 'Reset your Deevuh password',
      html: `
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="margin:0;padding:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#faf8f7;">
            <div style="max-width:560px;margin:48px auto;background:#fff;border:1px solid #e8e0db;padding:48px 40px;">
              <div style="text-align:center;margin-bottom:32px;">
                <span style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#c0392b;letter-spacing:0.15em;">DEEVUH</span>
              </div>
              <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:#1a1a1a;margin:0 0 16px;">Reset your password</h1>
              <p style="font-size:15px;line-height:1.7;color:#5a5a5a;margin:0 0 24px;">
                We received a request to reset your password for your Deevuh account. Please click the button below to choose a new password.
              </p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${resetUrl}"
                   style="display:inline-block;background:#c0392b;color:#fff;font-size:14px;font-weight:600;
                          letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;
                          padding:14px 36px;">
                  Reset Password
                </a>
              </div>
              <p style="font-size:13px;color:#999;margin:24px 0 0;text-align:center;line-height:1.6;">
                This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
              </p>
              <hr style="border:none;border-top:1px solid #e8e0db;margin:32px 0 24px;">
              <p style="font-size:12px;color:#bbb;text-align:center;margin:0;">
                © ${new Date().getFullYear()} Deevuh · 
                <a href="https://deevuh.in" style="color:#bbb;">deevuh.in</a>
              </p>
            </div>
          </body>
        </html>
      `,
    });
    console.log(`[Email] Password reset email sent to ${email}`);
  } catch (err: any) {
    console.error(`[Email] Failed to send password reset to ${email}:`, err.message);
  }
};


export const sendVerificationEmail = async (email: string, token: string) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  if (!process.env.RESEND_API_KEY) {
    console.log(`[Email] No API key — skipping send. Verify URL: ${verificationUrl}`);
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: 'Verify your Deevuh account',
      html: `
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="margin:0;padding:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#faf8f7;">
            <div style="max-width:560px;margin:48px auto;background:#fff;border:1px solid #e8e0db;padding:48px 40px;">
              <div style="text-align:center;margin-bottom:32px;">
                <span style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#c0392b;letter-spacing:0.15em;">DEEVUH</span>
              </div>
              <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:#1a1a1a;margin:0 0 16px;">Verify your email address</h1>
              <p style="font-size:15px;line-height:1.7;color:#5a5a5a;margin:0 0 24px;">
                Thank you for creating a Deevuh account. Please verify your email address to complete registration.
              </p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${verificationUrl}"
                   style="display:inline-block;background:#c0392b;color:#fff;font-size:14px;font-weight:600;
                          letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;
                          padding:14px 36px;">
                  Verify Email
                </a>
              </div>
              <p style="font-size:13px;color:#999;margin:24px 0 0;text-align:center;line-height:1.6;">
                This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
              </p>
              <hr style="border:none;border-top:1px solid #e8e0db;margin:32px 0 24px;">
              <p style="font-size:12px;color:#bbb;text-align:center;margin:0;">
                © ${new Date().getFullYear()} Deevuh · 
                <a href="https://deevuh.in" style="color:#bbb;">deevuh.in</a>
              </p>
            </div>
          </body>
        </html>
      `,
    });
    console.log(`[Email] Verification email sent to ${email}`);
  } catch (err: any) {
    // Log but don't crash — user can request a new link
    console.error(`[Email] Failed to send verification to ${email}:`, err.message);
  }
};

/**
 * Send order confirmation email (COD mode).
 */
export const sendOrderConfirmationEmail = async (
  email: string,
  options: {
    orderId: string;
    customerName: string;
    finalAmount: number;
    shippingAddress: string;
  }
) => {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[Email] No API key — skipping order confirmation for ${email}`);
    return;
  }

  const { orderId, customerName, finalAmount, shippingAddress } = options;
  const shortId = orderId.split('-')[0].toUpperCase();

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: `Order Confirmed — #${shortId}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="margin:0;padding:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#faf8f7;">
            <div style="max-width:560px;margin:48px auto;background:#fff;border:1px solid #e8e0db;padding:48px 40px;">
              <div style="text-align:center;margin-bottom:32px;">
                <span style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#c0392b;letter-spacing:0.15em;">DEEVUH</span>
              </div>
              <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:#1a1a1a;margin:0 0 8px;">Thank you, ${customerName}!</h1>
              <p style="font-size:15px;line-height:1.7;color:#5a5a5a;margin:0 0 28px;">
                Your order has been received. Our team will confirm it via WhatsApp or email within 24 hours.
              </p>
              <div style="background:#faf8f7;border:1px solid #e8e0db;padding:20px 24px;margin-bottom:28px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
                  <span style="font-size:13px;color:#999;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">Order ID</span>
                  <span style="font-size:13px;color:#1a1a1a;font-weight:600;">#${shortId}</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
                  <span style="font-size:13px;color:#999;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">Amount</span>
                  <span style="font-size:13px;color:#1a1a1a;font-weight:600;">₹${finalAmount.toFixed(2)}</span>
                </div>
                <div style="display:flex;justify-content:space-between;">
                  <span style="font-size:13px;color:#999;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">Ship To</span>
                  <span style="font-size:13px;color:#1a1a1a;max-width:260px;text-align:right;">${shippingAddress}</span>
                </div>
              </div>
              <p style="font-size:13px;color:#999;text-align:center;line-height:1.6;margin:0 0 8px;">
                Questions? Email us at <a href="mailto:deevuhinfo@gmail.com" style="color:#c0392b;">deevuhinfo@gmail.com</a>
              </p>
              <p style="font-size:13px;color:#999;text-align:center;line-height:1.6;margin:0;">
                or WhatsApp us at <a href="https://wa.me/917827537480" style="color:#c0392b;">+91 78275 37480</a>
              </p>
              <hr style="border:none;border-top:1px solid #e8e0db;margin:32px 0 24px;">
              <p style="font-size:12px;color:#bbb;text-align:center;margin:0;">
                © ${new Date().getFullYear()} Deevuh · <a href="https://deevuh.in" style="color:#bbb;">deevuh.in</a>
              </p>
            </div>
          </body>
        </html>
      `,
    });
    console.log(`[Email] Order confirmation sent to ${email} for order ${orderId}`);
  } catch (err: any) {
    console.error(`[Email] Failed to send order confirmation to ${email}:`, err.message);
  }
};
