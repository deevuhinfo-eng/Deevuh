import { Resend } from 'resend';
import crypto from 'crypto';
import prisma from '../../config/database.js';

let resendClient: Resend | null = null;
const getResendClient = (): Resend => {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY || 're_mock_key_for_testing';
    resendClient = new Resend(apiKey);
  }
  return resendClient;
};

/**
 * Verified sender address — deevuh.in is confirmed in Resend.
 */
const FROM_ADDRESS = process.env.RESEND_FROM ?? 'Deevuh <orders@confirmation.deevuh.in>';
const REPLY_TO = 'deevuhinfo@gmail.com';

// ─────────────────────────────────────────────
// AUTH EMAILS (unchanged)
// ─────────────────────────────────────────────

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
    const result = await getResendClient().emails.send({
      from: FROM_ADDRESS,
      replyTo: REPLY_TO,
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
    if (result.error) {
      console.error(`[Email] Resend API error sending password reset to ${email}:`, result.error);
    } else {
      console.log(`[Email] Password reset email sent to ${email}`);
    }
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
    const result = await getResendClient().emails.send({
      from: FROM_ADDRESS,
      replyTo: REPLY_TO,
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
    if (result.error) {
      console.error(`[Email] Resend API error sending verification to ${email}:`, result.error);
    } else {
      console.log(`[Email] Verification email sent to ${email}`);
    }
  } catch (err: any) {
    // Log but don't crash — user can request a new link
    console.error(`[Email] Failed to send verification to ${email}:`, err.message);
  }
};


// ─────────────────────────────────────────────
// ORDER EMAILS — Enhanced with full details
// ─────────────────────────────────────────────

export interface OrderEmailData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  totalAmount: number;
  discountAmount: number;
  gstAmount: number;
  finalAmount: number;
  paymentGatewayTxnId: string;
  paymentMethod: string;
  items: Array<{
    productTitle: string;
    size: string;
    quantity: number;
    unitPrice: number;
  }>;
  isCOD?: boolean;
  bookingAmount?: number;
  remainingCODAmount?: number;
}

/**
 * Generate the order items HTML table rows for email templates.
 */
function buildItemsHtml(items: OrderEmailData['items']): string {
  return items.map((item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e8e0db;font-size:14px;color:#1a1a1a;">
        ${item.productTitle}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #e8e0db;font-size:14px;color:#5a5a5a;text-align:center;">
        ${item.size}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #e8e0db;font-size:14px;color:#5a5a5a;text-align:center;">
        ${item.quantity}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #e8e0db;font-size:14px;color:#1a1a1a;text-align:right;font-weight:600;">
        ₹${(item.unitPrice * item.quantity).toLocaleString('en-IN')}
      </td>
    </tr>
  `).join('');
}

/**
 * Send customer order confirmation email with full order details.
 */
export const sendCustomerConfirmationEmail = async (data: OrderEmailData): Promise<{ messageId?: string; error?: string }> => {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[Email] No API key — skipping customer confirmation for ${data.customerEmail}`);
    return { error: 'RESEND_API_KEY not configured' };
  }

  const shortId = data.orderId.split('-')[0].toUpperCase();
  const frontendUrl = process.env.FRONTEND_URL || 'https://deevuh.in';
  const isCodOrder = !!data.isCOD;

  try {
    const result = await getResendClient().emails.send({
      from: FROM_ADDRESS,
      replyTo: REPLY_TO,
      to: data.customerEmail,
      subject: isCodOrder ? `Order Reserved — #${shortId} [COD]` : `Order Confirmed — #${shortId}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="margin:0;padding:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#faf8f7;">
            <div style="max-width:600px;margin:48px auto;background:#fff;border:1px solid #e8e0db;padding:48px 40px;">
              <div style="text-align:center;margin-bottom:32px;">
                <span style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#c0392b;letter-spacing:0.15em;">DEEVUH</span>
              </div>

              <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:#1a1a1a;margin:0 0 8px;">
                ${isCodOrder ? `Order Reserved, ${data.customerName}!` : `Thank you, ${data.customerName}!`}
              </h1>
              <p style="font-size:15px;line-height:1.7;color:#5a5a5a;margin:0 0 28px;">
                ${isCodOrder 
                  ? `Your Cash on Delivery order reservation has been received. You have paid a ₹${data.bookingAmount || 0} reservation fee. The remaining balance of ₹${(data.remainingCODAmount || 0).toLocaleString('en-IN')} will be collected upon delivery.`
                  : 'Your payment has been confirmed and your order is now being processed. We\'ll prepare your garments with care.'}
              </p>

              <!-- Order Reference -->
              <div style="background:#faf8f7;border:1px solid #e8e0db;padding:20px 24px;margin-bottom:28px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
                  <span style="font-size:13px;color:#999;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">Order ID</span>
                  <span style="font-size:13px;color:#1a1a1a;font-weight:600;">#${shortId}</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
                  <span style="font-size:13px;color:#999;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">Payment</span>
                  <span style="font-size:13px;color:#1a1a1a;font-weight:600;">${isCodOrder ? 'Cash on Delivery (COD)' : data.paymentMethod}</span>
                </div>
                <div style="display:flex;justify-content:space-between;">
                  <span style="font-size:13px;color:#999;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">Transaction</span>
                  <span style="font-size:13px;color:#1a1a1a;font-weight:500;">${data.paymentGatewayTxnId || 'N/A'}</span>
                </div>
              </div>

              <!-- Items Table -->
              <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                <thead>
                  <tr style="border-bottom:2px solid #1a1a1a;">
                    <th style="padding:8px 0;text-align:left;font-size:11px;font-weight:700;color:#999;letter-spacing:0.08em;text-transform:uppercase;">Product</th>
                    <th style="padding:8px 0;text-align:center;font-size:11px;font-weight:700;color:#999;letter-spacing:0.08em;text-transform:uppercase;">Size</th>
                    <th style="padding:8px 0;text-align:center;font-size:11px;font-weight:700;color:#999;letter-spacing:0.08em;text-transform:uppercase;">Qty</th>
                    <th style="padding:8px 0;text-align:right;font-size:11px;font-weight:700;color:#999;letter-spacing:0.08em;text-transform:uppercase;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${buildItemsHtml(data.items)}
                </tbody>
              </table>

              <!-- Pricing Summary -->
              <div style="border-top:1px solid #e8e0db;padding-top:16px;margin-bottom:24px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                  <span style="font-size:13px;color:#999;">Order Total</span>
                  <span style="font-size:13px;color:#1a1a1a;">₹${data.finalAmount.toLocaleString('en-IN')}</span>
                </div>
                ${data.discountAmount > 0 ? `
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                  <span style="font-size:13px;color:#28a745;">Coupon Discount</span>
                  <span style="font-size:13px;color:#28a745;">−₹${data.discountAmount.toLocaleString('en-IN')}</span>
                </div>` : ''}
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                  <span style="font-size:13px;color:#999;">GST (Included)</span>
                  <span style="font-size:13px;color:#1a1a1a;">₹${data.gstAmount.toFixed(2)}</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                  <span style="font-size:13px;color:#999;">Shipping</span>
                  <span style="font-size:13px;color:#28a745;font-weight:600;">Free</span>
                </div>
                
                ${isCodOrder ? `
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;color:#28a745;font-weight:600;">
                  <span style="font-size:13px;">Reserve Today (Paid)</span>
                  <span style="font-size:13px;">₹${(data.bookingAmount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div style="display:flex;justify-content:space-between;border-top:2px solid #1a1a1a;padding-top:10px;margin-top:8px;">
                  <span style="font-size:15px;font-weight:700;color:#1a1a1a;">Pay on Delivery</span>
                  <span style="font-size:15px;font-weight:700;color:#c0392b;">₹${(data.remainingCODAmount || 0).toLocaleString('en-IN')}</span>
                </div>
                ` : `
                <div style={{display:'flex',justifyContent:'space-between',borderTop:'2px solid #1a1a1a',paddingTop:'10px',marginTop:'8px'}}>
                  <span style="font-size:15px;font-weight:700;color:#1a1a1a;">Total Paid</span>
                  <span style="font-size:15px;font-weight:700;color:#1a1a1a;">₹${data.finalAmount.toLocaleString('en-IN')}</span>
                </div>
                `}
              </div>

              <!-- Shipping -->
              <div style="background:#faf8f7;border:1px solid #e8e0db;padding:16px 20px;margin-bottom:28px;">
                <span style="font-size:11px;font-weight:700;color:#999;letter-spacing:0.08em;text-transform:uppercase;display:block;margin-bottom:6px;">Shipping To</span>
                <span style="font-size:14px;color:#1a1a1a;line-height:1.6;">${data.customerName}<br>${data.shippingAddress}<br>Phone: ${data.customerPhone}</span>
              </div>

              <!-- Processing Time -->
              <div style="background:#fff8f0;border:1px solid #f0dcc0;padding:16px 20px;margin-bottom:28px;text-align:center;">
                <span style="font-size:13px;color:#c0392b;font-weight:600;">Estimated Processing: 1–2 business days</span>
                <p style="font-size:12px;color:#5a5a5a;margin:6px 0 0;">Our team will confirm measurements via WhatsApp before dispatch.</p>
              </div>

              <!-- Track Order Button -->
              <div style="text-align:center;margin-bottom:28px;">
                <a href="${frontendUrl}/dashboard"
                   style="display:inline-block;background:#c0392b;color:#fff;font-size:13px;font-weight:600;
                          letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;
                          padding:14px 40px;">
                  Track Your Order
                </a>
              </div>

              <!-- Support -->
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
    if (result.error) {
      console.error(`[Email] Failed to send customer confirmation to ${data.customerEmail} via Resend:`, result.error);
      return { error: result.error.message || JSON.stringify(result.error) };
    }
    console.log(`[Email] Customer confirmation sent to ${data.customerEmail} for order ${data.orderId}`);
    return { messageId: result?.data?.id || undefined };
  } catch (err: any) {
    console.error(`[Email] Failed to send customer confirmation to ${data.customerEmail}:`, err.message);
    return { error: err.message };
  }
};

/**
 * Send owner notification email when a new paid order is received.
 */
export const sendOwnerNotificationEmail = async (data: OrderEmailData): Promise<{ messageId?: string; error?: string }> => {
  const ownerEmail = process.env.OWNER_EMAIL || 'deevuhinfo@gmail.com';

  if (!process.env.RESEND_API_KEY) {
    console.log(`[Email] No API key — skipping owner notification for order ${data.orderId}`);
    return { error: 'RESEND_API_KEY not configured' };
  }

  const shortId = data.orderId.split('-')[0].toUpperCase();
  const backendUrl = process.env.BACKEND_URL || 'https://api.deevuh.in';
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const itemsList = data.items.map((item) =>
    `<tr>
      <td style="padding:8px 12px;border:1px solid #ddd;font-size:13px;">${item.productTitle}</td>
      <td style="padding:8px 12px;border:1px solid #ddd;font-size:13px;text-align:center;">${item.size}</td>
      <td style="padding:8px 12px;border:1px solid #ddd;font-size:13px;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 12px;border:1px solid #ddd;font-size:13px;text-align:right;">₹${(item.unitPrice * item.quantity).toLocaleString('en-IN')}</td>
    </tr>`
  ).join('');

  const isCodOrder = !!data.isCOD;
  const subjectText = isCodOrder
    ? `🔔 New COD Order #${shortId} — Reserved via ₹${data.bookingAmount} from ${data.customerName}`
    : `🔔 New Order #${shortId} — ₹${data.finalAmount.toLocaleString('en-IN')} from ${data.customerName}`;
  const headerText = isCodOrder ? '🔔 NEW COD ORDER RECEIVED' : '🔔 NEW ORDER RECEIVED';

  try {
    const result = await getResendClient().emails.send({
      from: FROM_ADDRESS,
      to: ownerEmail,
      subject: subjectText,
      html: `
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="margin:0;padding:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#f5f5f5;">
            <div style="max-width:600px;margin:32px auto;background:#fff;border:1px solid #ddd;padding:32px;">
              <div style="background:#c0392b;color:#fff;padding:16px 24px;margin:-32px -32px 24px;text-align:center;">
                <h1 style="margin:0;font-size:20px;font-weight:700;letter-spacing:0.1em;">${headerText}</h1>
              </div>

              <table style="width:100%;margin-bottom:20px;">
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#888;font-weight:600;width:140px;">Order ID</td>
                  <td style="padding:6px 0;font-size:14px;font-weight:700;">#${shortId}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#888;font-weight:600;">Time</td>
                  <td style="padding:6px 0;font-size:14px;">${now}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#888;font-weight:600;">Payment Method</td>
                  <td style="padding:6px 0;font-size:14px;font-weight:700;">${isCodOrder ? 'Cash on Delivery (COD)' : data.paymentMethod}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#888;font-weight:600;">Transaction ID</td>
                  <td style="padding:6px 0;font-size:14px;font-family:monospace;">${data.paymentGatewayTxnId || 'N/A'}</td>
                </tr>
                ${isCodOrder ? `
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#888;font-weight:600;">Booking Fee Paid</td>
                  <td style="padding:6px 0;font-size:16px;font-weight:700;color:green;">₹${(data.bookingAmount || 0).toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#888;font-weight:600;">Pay on Delivery</td>
                  <td style="padding:6px 0;font-size:16px;font-weight:700;color:#c0392b;">₹${(data.remainingCODAmount || 0).toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#888;font-weight:600;">Total Order Value</td>
                  <td style="padding:6px 0;font-size:16px;font-weight:700;color:#333;">₹${data.finalAmount.toLocaleString('en-IN')}</td>
                </tr>
                ` : `
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#888;font-weight:600;">Amount Paid</td>
                  <td style="padding:6px 0;font-size:18px;font-weight:700;color:#c0392b;">₹${data.finalAmount.toLocaleString('en-IN')}</td>
                </tr>
                `}
              </table>

              <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">

              <h3 style="font-size:14px;color:#333;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.05em;">Customer Details</h3>
              <table style="width:100%;margin-bottom:20px;">
                <tr>
                  <td style="padding:4px 0;font-size:13px;color:#888;width:140px;">Name</td>
                  <td style="padding:4px 0;font-size:14px;font-weight:600;">${data.customerName}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:13px;color:#888;">Email</td>
                  <td style="padding:4px 0;font-size:14px;"><a href="mailto:${data.customerEmail}" style="color:#c0392b;">${data.customerEmail}</a></td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:13px;color:#888;">Phone</td>
                  <td style="padding:4px 0;font-size:14px;"><a href="https://wa.me/91${data.customerPhone.replace(/\D/g, '').slice(-10)}" style="color:#c0392b;">${data.customerPhone}</a></td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:13px;color:#888;vertical-align:top;">Shipping</td>
                  <td style="padding:4px 0;font-size:14px;line-height:1.5;">${data.shippingAddress}</td>
                </tr>
              </table>

              <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">

              <h3 style="font-size:14px;color:#333;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.05em;">Items Ordered</h3>
              <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
                <thead>
                  <tr style="background:#f5f5f5;">
                    <th style="padding:8px 12px;border:1px solid #ddd;font-size:11px;text-align:left;text-transform:uppercase;">Product</th>
                    <th style="padding:8px 12px;border:1px solid #ddd;font-size:11px;text-align:center;text-transform:uppercase;">Size</th>
                    <th style="padding:8px 12px;border:1px solid #ddd;font-size:11px;text-align:center;text-transform:uppercase;">Qty</th>
                    <th style="padding:8px 12px;border:1px solid #ddd;font-size:11px;text-align:right;text-transform:uppercase;">Amount</th>
                  </tr>
                </thead>
                <tbody>${itemsList}</tbody>
              </table>

              <p style="font-size:12px;color:#999;margin:24px 0 0;text-align:center;">
                Generated by Deevuh Payment System · ${now}
              </p>
            </div>
          </body>
        </html>
      `,
    });
    if (result.error) {
      console.error(`[Email] Failed to send owner notification for order ${data.orderId} via Resend:`, result.error);
      return { error: result.error.message || JSON.stringify(result.error) };
    }
    console.log(`[Email] Owner notification sent to ${ownerEmail} for order ${data.orderId}`);
    return { messageId: result?.data?.id || undefined };
  } catch (err: any) {
    console.error(`[Email] Failed to send owner notification for order ${data.orderId}:`, err.message);
    return { error: err.message };
  }
};


// ─────────────────────────────────────────────
// ORDER EMAIL ORCHESTRATOR — Duplicate Protection
// ─────────────────────────────────────────────

/**
 * Send both order emails (customer + owner) with database-backed duplicate protection.
 * Safe to call multiple times — emails are only sent once per order per type.
 *
 * This function must be called AFTER the payment transaction has committed.
 * Email failures do NOT affect the payment or order status.
 */
export const sendOrderEmails = async (data: OrderEmailData): Promise<void> => {
  // Send customer confirmation with duplicate protection
  await sendEmailWithProtection(data.orderId, 'customer_confirmation', data.customerEmail, async () => {
    return sendCustomerConfirmationEmail(data);
  });

  // Send owner notification with duplicate protection
  const ownerEmail = process.env.OWNER_EMAIL || 'deevuhinfo@gmail.com';
  await sendEmailWithProtection(data.orderId, 'owner_notification', ownerEmail, async () => {
    return sendOwnerNotificationEmail(data);
  });
};

/**
 * Execute an email send with database-backed duplicate protection.
 * Uses upsert to handle race conditions between concurrent webhook calls.
 */
async function sendEmailWithProtection(
  orderId: string,
  emailType: string,
  recipient: string,
  sendFn: () => Promise<{ messageId?: string; error?: string }>
): Promise<void> {
  try {
    // Check if already sent
    const existing = await prisma.emailLog.findUnique({
      where: { order_email_unique: { orderId, emailType } },
    });

    if (existing?.status === 'SENT') {
      console.log(`[Email] Skipping ${emailType} for order ${orderId} — already sent at ${existing.sentAt?.toISOString()}`);
      return;
    }

    // Create or update the log entry as PENDING
    const logEntry = await prisma.emailLog.upsert({
      where: { order_email_unique: { orderId, emailType } },
      update: {
        retryCount: existing ? existing.retryCount + 1 : 0,
        status: 'PENDING',
      },
      create: {
        orderId,
        emailType,
        recipient,
        status: 'PENDING',
        retryCount: 0,
      },
    });

    // Attempt send
    const result = await sendFn();

    if (result.error) {
      await prisma.emailLog.update({
        where: { id: logEntry.id },
        data: {
          status: 'FAILED',
          lastError: result.error,
        },
      });
      console.error(`[Email] ${emailType} failed for order ${orderId}: ${result.error}`);
    } else {
      await prisma.emailLog.update({
        where: { id: logEntry.id },
        data: {
          status: 'SENT',
          resendMessageId: result.messageId || null,
          sentAt: new Date(),
          lastError: null,
        },
      });
    }
  } catch (err: any) {
    console.error(`[Email] Error in sendEmailWithProtection for ${emailType}, order ${orderId}:`, err.message);
  }
}

/**
 * Legacy compatibility wrapper — called from payments.service.ts import.
 * Kept for backward compatibility if any other module imports this directly.
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
  // Delegate to the new orchestrator with minimal data
  // This path is only hit if called directly (legacy). The full-data path
  // goes through sendOrderEmails() which is preferred.
  await sendEmailWithProtection(options.orderId, 'customer_confirmation', email, async () => {
    return sendCustomerConfirmationEmail({
      orderId: options.orderId,
      customerName: options.customerName,
      customerEmail: email,
      customerPhone: '',
      shippingAddress: options.shippingAddress,
      totalAmount: options.finalAmount,
      discountAmount: 0,
      gstAmount: 0,
      finalAmount: options.finalAmount,
      paymentGatewayTxnId: '',
      paymentMethod: 'PayU',
      items: [],
    });
  });
};
