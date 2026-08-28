import { estimateMonthlyPayment } from "@/lib/finance";
import { FINANCE_APR_PERCENT, FINANCE_TERM_MONTHS, FINANCE_DOWN_PAYMENT_RATIO } from "@/lib/site-config";

export default function PaymentEstimate({
  price,
  size = "sm",
}: {
  price: number | null;
  size?: "sm" | "lg";
}) {
  const monthly = estimateMonthlyPayment(price);
  if (monthly === null) return null;

  if (size === "lg") {
    return (
      <p className="text-sm text-slate-500">
        Est. <span className="text-base font-bold text-slate-900">${monthly.toLocaleString()}/mo</span>{" "}
        <span className="text-slate-400">
          &middot; {FINANCE_TERM_MONTHS} mo @ {FINANCE_APR_PERCENT}% APR, {Math.round(FINANCE_DOWN_PAYMENT_RATIO * 100)}%
          down (est.)
        </span>
      </p>
    );
  }

  return <p className="text-xs font-medium text-slate-400">Est. ${monthly.toLocaleString()}/mo</p>;
}
