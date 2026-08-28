import { requireAdminPage } from "@/lib/auth";
import AdminNav from "@/components/admin/AdminNav";
import AdminVehicleForm from "@/components/admin/AdminVehicleForm";

export const dynamic = "force-dynamic";

export default async function NewVehiclePage() {
  await requireAdminPage();

  return (
    <div>
      <AdminNav />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Add Vehicle</h1>
        <p className="mt-1 text-sm text-slate-500">Fill in the details below to publish a new listing.</p>
        <div className="mt-6">
          <AdminVehicleForm mode="create" />
        </div>
      </div>
    </div>
  );
}
