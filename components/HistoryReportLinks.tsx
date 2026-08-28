import { carfaxUrl, autocheckUrl } from "@/lib/history-reports";
import { ShieldCheckIcon, ExternalLinkIcon } from "./icons";

export default function HistoryReportLinks({ vin }: { vin: string }) {
  const cf = carfaxUrl(vin);
  const ac = autocheckUrl(vin);
  if (!cf && !ac) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <ShieldCheckIcon className="h-4 w-4" /> History Reports
      </span>
      {cf && (
        <a
          href={cf}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-600 hover:text-blue-700"
        >
          Carfax Report <ExternalLinkIcon className="h-3 w-3" />
        </a>
      )}
      {ac && (
        <a
          href={ac}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-600 hover:text-blue-700"
        >
          AutoCheck Report <ExternalLinkIcon className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}
