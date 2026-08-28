"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Vehicle, BodyType, VehicleStatus } from "@/lib/types";
import { BODY_TYPES, VEHICLE_STATUSES } from "@/lib/types";

const TRANSMISSIONS = ["Automatic", "Manual", "CVT"];
const DRIVETRAINS = ["FWD", "RWD", "AWD", "4WD"];
const FUEL_TYPES = ["Gasoline", "Diesel", "Hybrid", "Electric", "Flex Fuel"];

type Props = { mode: "create" } | { mode: "edit"; vehicle: Vehicle };

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";

export default function AdminVehicleForm(props: Props) {
  const router = useRouter();
  const existing = props.mode === "edit" ? props.vehicle : null;

  const [year, setYear] = useState(existing ? String(existing.year) : String(new Date().getFullYear()));
  const [make, setMake] = useState(existing?.make ?? "");
  const [model, setModel] = useState(existing?.model ?? "");
  const [trim, setTrim] = useState(existing?.trim ?? "");
  const [price, setPrice] = useState(existing?.price != null ? String(existing.price) : "");
  const [mileage, setMileage] = useState(existing ? String(existing.mileage) : "");
  const [bodyType, setBodyType] = useState<BodyType>(existing?.bodyType ?? "Sedan");
  const [exteriorColor, setExteriorColor] = useState(existing?.exteriorColor ?? "");
  const [interiorColor, setInteriorColor] = useState(existing?.interiorColor ?? "");
  const [transmission, setTransmission] = useState(existing?.transmission ?? "Automatic");
  const [drivetrain, setDrivetrain] = useState(existing?.drivetrain ?? "FWD");
  const [fuelType, setFuelType] = useState(existing?.fuelType ?? "Gasoline");
  const [engine, setEngine] = useState(existing?.engine ?? "");
  const [vin, setVin] = useState(existing?.vin ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [features, setFeatures] = useState(existing?.features?.join("\n") ?? "");
  const [status, setStatus] = useState<VehicleStatus>(existing?.status ?? "available");
  const [keepPhotos, setKeepPhotos] = useState<string[]>(existing?.photos ?? []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function removeKeptPhoto(url: string) {
    setKeepPhotos((prev) => prev.filter((p) => p !== url));
  }
  function removeNewFile(idx: number) {
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!make.trim() || !model.trim()) {
      setError("Make and model are required.");
      return;
    }
    setLoading(true);

    const fd = new FormData();
    fd.set("year", year);
    fd.set("make", make);
    fd.set("model", model);
    fd.set("trim", trim);
    fd.set("price", price);
    fd.set("mileage", mileage);
    fd.set("bodyType", bodyType);
    fd.set("exteriorColor", exteriorColor);
    fd.set("interiorColor", interiorColor);
    fd.set("transmission", transmission);
    fd.set("drivetrain", drivetrain);
    fd.set("fuelType", fuelType);
    fd.set("engine", engine);
    fd.set("vin", vin);
    fd.set("description", description);
    fd.set("features", features);
    fd.set("status", status);
    if (existing) {
      fd.set("keepPhotos", JSON.stringify(keepPhotos));
    }
    for (const file of newFiles) {
      fd.append("photos", file);
    }

    const url = existing ? `/api/admin/vehicles/${existing.id}` : "/api/admin/vehicles";
    const method = existing ? "PUT" : "POST";

    try {
      const res = await fetch(url, { method, body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Failed to save vehicle.");
        setLoading(false);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Failed to save vehicle.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</div>
      )}

      <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <legend className="mb-2 text-base font-bold text-slate-900">Basic Info</legend>
        <div>
          <label className={labelClass}>Year</label>
          <input
            type="number"
            className={inputClass}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Make</label>
          <input
            className={inputClass}
            value={make}
            onChange={(e) => setMake(e.target.value)}
            required
            placeholder="Toyota"
          />
        </div>
        <div>
          <label className={labelClass}>Model</label>
          <input
            className={inputClass}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            required
            placeholder="Camry"
          />
        </div>
        <div>
          <label className={labelClass}>Trim</label>
          <input className={inputClass} value={trim} onChange={(e) => setTrim(e.target.value)} placeholder="LE" />
        </div>
        <div>
          <label className={labelClass}>Body Style</label>
          <select className={inputClass} value={bodyType} onChange={(e) => setBodyType(e.target.value as BodyType)}>
            {BODY_TYPES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select
            className={`${inputClass} capitalize`}
            value={status}
            onChange={(e) => setStatus(e.target.value as VehicleStatus)}
          >
            {VEHICLE_STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <legend className="mb-2 text-base font-bold text-slate-900">Pricing &amp; Mileage</legend>
        <div>
          <label className={labelClass}>Price (USD)</label>
          <input
            type="number"
            className={inputClass}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Leave blank for Call for Price"
          />
        </div>
        <div>
          <label className={labelClass}>Mileage</label>
          <input
            type="number"
            className={inputClass}
            value={mileage}
            onChange={(e) => setMileage(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClass}>VIN</label>
          <input className={inputClass} value={vin} onChange={(e) => setVin(e.target.value)} />
        </div>
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <legend className="mb-2 text-base font-bold text-slate-900">Specs</legend>
        <div>
          <label className={labelClass}>Exterior Color</label>
          <input className={inputClass} value={exteriorColor} onChange={(e) => setExteriorColor(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Interior Color</label>
          <input className={inputClass} value={interiorColor} onChange={(e) => setInteriorColor(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Engine</label>
          <input
            className={inputClass}
            value={engine}
            onChange={(e) => setEngine(e.target.value)}
            placeholder="2.5L 4-Cylinder"
          />
        </div>
        <div>
          <label className={labelClass}>Transmission</label>
          <select className={inputClass} value={transmission} onChange={(e) => setTransmission(e.target.value)}>
            {TRANSMISSIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Drivetrain</label>
          <select className={inputClass} value={drivetrain} onChange={(e) => setDrivetrain(e.target.value)}>
            {DRIVETRAINS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Fuel Type</label>
          <select className={inputClass} value={fuelType} onChange={(e) => setFuelType(e.target.value)}>
            {FUEL_TYPES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-base font-bold text-slate-900">Description &amp; Features</legend>
        <div className="mb-4">
          <label className={labelClass}>Description</label>
          <textarea
            rows={5}
            className={inputClass}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Features (one per line)</label>
          <textarea
            rows={5}
            className={inputClass}
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
            placeholder={"Backup Camera\nBluetooth\nAlloy Wheels"}
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-base font-bold text-slate-900">Photos</legend>

        {(keepPhotos.length > 0 || newFiles.length > 0) && (
          <div className="mb-4 flex flex-wrap gap-3">
            {keepPhotos.map((url) => (
              <div key={url} className="relative h-24 w-32 overflow-hidden rounded-lg border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeKeptPhoto(url)}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/80 text-xs font-bold text-white transition hover:bg-red-600"
                  aria-label="Remove photo"
                >
                  ×
                </button>
              </div>
            ))}
            {newFiles.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="relative h-24 w-32 overflow-hidden rounded-lg border border-amber-300"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeNewFile(idx)}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/80 text-xs font-bold text-white transition hover:bg-red-600"
                  aria-label="Remove photo"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          onChange={(e) => setNewFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
        />
        <p className="mt-2 text-xs text-slate-400">
          JPG, PNG, WEBP, or GIF. Up to 10MB each. Leave empty to use an automatic placeholder image.
        </p>
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-amber-500 px-8 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-60"
        >
          {loading ? "Saving…" : existing ? "Save Changes" : "Add Vehicle"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="rounded-full border border-slate-300 px-8 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
