import { FINANCE_APR_PERCENT, FINANCE_TERM_MONTHS, FINANCE_DOWN_PAYMENT_RATIO } from "./site-config";

/**
 * Rough monthly payment estimate for display only — not a real financing offer.
 * Always shown to the user alongside the assumed rate/term/down payment.
 */
export function estimateMonthlyPayment(price: number | null): number | null {
  if (price === null || !Number.isFinite(price) || price <= 0) return null;

  const principal = price * (1 - FINANCE_DOWN_PAYMENT_RATIO);
  if (principal <= 0) return 0;

  const monthlyRate = FINANCE_APR_PERCENT / 100 / 12;
  const n = FINANCE_TERM_MONTHS;
  if (monthlyRate === 0) return Math.round(principal / n);

  const payment = (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
  return Math.round(payment);
}
