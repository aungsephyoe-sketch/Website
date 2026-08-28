import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth";
import { updateVehicle, deleteVehicle, getVehicleById } from "@/lib/vehicles";
import { saveUploadedPhoto, deleteUploadedPhoto } from "@/lib/uploads";
import type { BodyType, VehicleStatus } from "@/lib/types";

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}
function num(fd: FormData, key: string): number {
  const v = Number(str(fd, key));
  return Number.isFinite(v) ? v : 0;
}
function parseFeatures(raw: string): string[] {
  return raw
    .split(/\r?\n|,/)
    .map((f) => f.trim())
    .filter(Boolean);
}

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteParams) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await getVehicleById(id);
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Vehicle not found." }, { status: 404 });
  }

  const formData = await request.formData();

  let keepPhotos: string[] = [];
  try {
    const raw = str(formData, "keepPhotos");
    const parsed = raw ? JSON.parse(raw) : [];
    keepPhotos = Array.isArray(parsed) ? parsed.filter((p) => typeof p === "string") : [];
  } catch {
    keepPhotos = [];
  }

  const removedPhotos = existing.photos.filter((p) => !keepPhotos.includes(p));
  for (const p of removedPhotos) {
    await deleteUploadedPhoto(p);
  }

  const photoFiles = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  const newPhotos: string[] = [];
  for (const file of photoFiles) {
    const result = await saveUploadedPhoto(file);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }
    newPhotos.push(result.url);
  }

  const priceRaw = str(formData, "price");
  const price = priceRaw === "" ? null : Number(priceRaw);

  const updated = await updateVehicle(id, {
    year: num(formData, "year"),
    make: str(formData, "make"),
    model: str(formData, "model"),
    trim: str(formData, "trim"),
    price: price !== null && Number.isFinite(price) ? price : null,
    mileage: num(formData, "mileage"),
    bodyType: (str(formData, "bodyType") || "Other") as BodyType,
    exteriorColor: str(formData, "exteriorColor"),
    interiorColor: str(formData, "interiorColor"),
    transmission: str(formData, "transmission"),
    drivetrain: str(formData, "drivetrain"),
    fuelType: str(formData, "fuelType"),
    engine: str(formData, "engine"),
    vin: str(formData, "vin"),
    description: str(formData, "description"),
    features: parseFeatures(str(formData, "features")),
    photos: [...keepPhotos, ...newPhotos],
    status: (str(formData, "status") || "available") as VehicleStatus,
  });

  return NextResponse.json({ ok: true, vehicle: updated });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await getVehicleById(id);
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Vehicle not found." }, { status: 404 });
  }
  for (const p of existing.photos) {
    await deleteUploadedPhoto(p);
  }
  await deleteVehicle(id);
  return NextResponse.json({ ok: true });
}
