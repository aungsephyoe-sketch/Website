import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth";
import { createVehicle, getAllVehicles } from "@/lib/vehicles";
import { saveUploadedPhoto } from "@/lib/uploads";
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

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const vehicles = await getAllVehicles();
  return NextResponse.json({ ok: true, vehicles });
}

export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();

  const make = str(formData, "make");
  const model = str(formData, "model");
  if (!make || !model) {
    return NextResponse.json({ ok: false, error: "Make and model are required." }, { status: 400 });
  }

  const photoFiles = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  const photos: string[] = [];
  for (const file of photoFiles) {
    const result = await saveUploadedPhoto(file);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }
    photos.push(result.url);
  }

  const priceRaw = str(formData, "price");
  const price = priceRaw === "" ? null : Number(priceRaw);

  const vehicle = await createVehicle({
    year: num(formData, "year"),
    make,
    model,
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
    photos,
    status: (str(formData, "status") || "available") as VehicleStatus,
  });

  return NextResponse.json({ ok: true, vehicle });
}
