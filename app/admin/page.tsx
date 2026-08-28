import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { getAllVehicles } from "@/lib/vehicles";
import AdminNav from "@/components/admin/AdminNav";
import DeleteVehicleButton from "@/components/admin/DeleteVehicleButton";
import { formatPrice, formatMileage, vehicleTitle } from "@/lib/format";
import { PlusIcon, PencilIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireAdminPage();
  const vehicles = await getAllVehicles();

  return (
    <div>
      <AdminNav />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Listings</h1>
            <p className="text-sm text-slate-500">
              {vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"} in inventory
            </p>
          </div>
          <Link
            href="/admin/new"
            className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-amber-600"
          >
            <PlusIcon className="h-4 w-4" /> Add Vehicle
          </Link>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Mileage</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Photos</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vehicles.map((v) => (
                <tr key={v.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <Link href={`/vehicles/${v.id}`} className="hover:text-blue-700" target="_blank">
                      {vehicleTitle(v)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatPrice(v.price)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatMileage(v.mileage)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{v.photos.length}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/${v.id}/edit`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <PencilIcon className="h-3.5 w-3.5" /> Edit
                      </Link>
                      <DeleteVehicleButton id={v.id} label={vehicleTitle(v)} />
                    </div>
                  </td>
                </tr>
              ))}
              {vehicles.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    No vehicles yet. Click &quot;Add Vehicle&quot; to create your first listing.
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
