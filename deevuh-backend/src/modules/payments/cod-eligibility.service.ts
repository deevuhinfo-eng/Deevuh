import type { PrismaClient } from '@prisma/client';
import { getCODSettings } from '../admin/settings.service.js';

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
  bookingAmount: number;
  remainingAmount: number;
}

/**
 * Evaluate whether a user qualifies for Cash-on-Delivery.
 *
 * Rules are checked in order and short-circuit on the first failure:
 *   1. COD globally enabled
 *   2. Order amount ≤ max allowed amount
 *   3. Customer not blacklisted
 *   4. Customer has not exceeded the per-customer COD order limit
 *
 * On success the function computes the required booking amount and the
 * remaining COD balance the customer will pay on delivery.
 */
export async function checkCODEligibility(
  userId: string,
  cartTotal: number,
  prisma: PrismaClient
): Promise<EligibilityResult> {
  const codSettings = await getCODSettings();

  // Rule 1 — COD must be globally enabled
  if (!codSettings.enabled) {
    console.log(`[COD Eligibility] Denied for user ${userId}: COD is globally disabled.`);
    return { eligible: false, reason: 'Cash on Delivery is currently unavailable.', bookingAmount: 0, remainingAmount: 0 };
  }

  // Rule 2 — Cart total must not exceed the maximum allowed amount
  if (cartTotal > codSettings.maxOrderAmount) {
    console.log(`[COD Eligibility] Denied for user ${userId}: cart total ₹${cartTotal} exceeds max ₹${codSettings.maxOrderAmount}.`);
    return {
      eligible: false,
      reason: `Cash on Delivery is available only for orders up to ₹${codSettings.maxOrderAmount}.`,
      bookingAmount: 0,
      remainingAmount: 0,
    };
  }

  // Rule 3 — Customer must not be blacklisted
  if (codSettings.blacklistEnabled) {
    const risk = await (prisma as any).customerRisk.findUnique({
      where: { userId },
    });
    if (risk?.isBlacklisted) {
      console.log(`[COD Eligibility] Denied for user ${userId}: customer is blacklisted.`);
      return { eligible: false, reason: 'Cash on Delivery is not available for your account.', bookingAmount: 0, remainingAmount: 0 };
    }
  }

  // Rule 4 — Customer COD order limit
  const activeCODOrderCount = await (prisma as any).order.count({
    where: {
      userId,
      isCOD: true,
      paymentStatus: { in: ['SUCCESS', 'BOOKING_RECEIVED'] },
    },
  });

  if (activeCODOrderCount >= codSettings.maxPerCustomer) {
    console.log(`[COD Eligibility] Denied for user ${userId}: reached max COD orders (${activeCODOrderCount}/${codSettings.maxPerCustomer}).`);
    return {
      eligible: false,
      reason: `You have reached the maximum number of Cash on Delivery orders (${codSettings.maxPerCustomer}).`,
      bookingAmount: 0,
      remainingAmount: 0,
    };
  }

  // All rules passed — compute booking & remaining amounts
  let bookingAmount = codSettings.bookingAmount;
  if (codSettings.freeAbove > 0 && cartTotal > codSettings.freeAbove) {
    bookingAmount = 0;
  }

  const remainingAmount = Math.round((cartTotal - bookingAmount) * 100) / 100;

  console.log(
    `[COD Eligibility] Approved for user ${userId}: cart ₹${cartTotal}, booking ₹${bookingAmount}, remaining ₹${remainingAmount}.`
  );

  return {
    eligible: true,
    bookingAmount,
    remainingAmount,
  };
}
