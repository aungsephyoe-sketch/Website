import { requireAdminPage } from "@/lib/auth";
import { getAllInquiries } from "@/lib/inquiries";
import AdminNav from "@/components/admin/AdminNav";
import type { SmsStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const SMS_BADGE: Record<SmsStatus, { style: string; label: string }> = {
  sent: { style: "bg-emerald-100 text-emerald-700", label: "Text Sent" },
  failed: { style: "bg-red-100 text-red-700", label: "Text Failed" },
  not_configured: { style: "bg-slate-100 text-slate-600", label: "SMS Not Set Up" },
};

export default async function LeadsPage() {
  await requireAdminPage();
  const leads = await getAllInquiries();

  return (
    <div>
      <AdminNav />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Leads</h1>
        <p className="mt-1 text-sm text-slate-500">Everyone who has submitted the inquiry form, newest first.</p>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3">SMS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((lead) => {
                const badge = SMS_BADGE[lead.smsStatus] ?? SMS_BADGE.not_configured;
                return (
                  <tr key={lead.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {new Date(lead.createdAt).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{lead.name}</td>
                    <td className="px-4 py-3">
                      <a href={`tel:${lead.phone}`} className="text-blue-700 hover:underline">
                        {lead.phone}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{lead.vehicleLabel}</td>
                    <td className="max-w-xs px-4 py-3 text-slate-600">{lead.message || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge.style}`}>
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    No leads yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
