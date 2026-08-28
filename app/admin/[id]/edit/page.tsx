import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import { getVehicleById } from "@/lib/vehicles";
import AdminNav from "@/components/admin/AdminNav";
import AdminVehicleForm from "@/components/admin/AdminVehicleForm";

export const dynamic = "force-dynamic";

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const vehicle = await getVehicleById(id);
  if (!vehicle) notFound();

  return (
    <div>
      <AdminNav />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Edit Vehicle</h1>
        <p className="mt-1 text-sm text-slate-500">Update the details for this listing.</p>
        <div className="mt-6">
          <AdminVehicleForm mode="edit" vehicle={vehicle} />
        </div>
      </div>
    </div>
  );
}
