import Link from "next/link";
import Image from "next/image";
import type { Vehicle } from "@/lib/types";
import { formatPrice, formatMileage, vehicleTitle } from "@/lib/format";
import { getDisplayPhotos } from "@/lib/photos";

export default function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const photo = getDisplayPhotos(vehicle)[0];
  const title = vehicleTitle(vehicle);

  return (
    <Link
      href={`/vehicles/${vehicle.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <Image
          src={photo}
          alt={title}
          fill
          sizes="(min-width: 1280px) 23vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
          className="object-cover transition duration-300 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 rounded-full bg-slate-900/85 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
          {vehicle.bodyType}
        </div>
        {vehicle.status !== "available" && (
          <div className="absolute right-3 top-3 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
            {vehicle.status}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-lg font-semibold leading-snug text-slate-900">{title}</h3>
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-slate-900">{formatPrice(vehicle.price)}</span>
          <span className="text-sm text-slate-500">{formatMileage(vehicle.mileage)}</span>
        </div>
        <p className="line-clamp-2 text-sm text-slate-600">{vehicle.description}</p>
        <span className="mt-auto pt-2 text-sm font-semibold text-blue-700 transition group-hover:text-amber-600">
          View Details →
        </span>
      </div>
    </Link>
  );
}
