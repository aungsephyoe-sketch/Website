"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TrashIcon } from "../icons";

export default function DeleteVehicleButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const res = await fetch(`/api/admin/vehicles/${id}`, { method: "DELETE" });
    setLoading(false);
    setConfirming(false);
    if (res.ok) {
      router.refresh();
    } else {
      alert("Failed to delete vehicle. Please try again.");
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5 whitespace-nowrap text-xs">
        <span className="hidden text-slate-500 sm:inline">Delete {label}?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="rounded-lg bg-red-600 px-2.5 py-1.5 font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {loading ? "…" : "Confirm"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
    >
      <TrashIcon className="h-3.5 w-3.5" /> Delete
    </button>
  );
}
