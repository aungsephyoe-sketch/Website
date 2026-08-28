import Link from "next/link";
import Image from "next/image";
import type { Vehicle } from "@/lib/types";
import type { SmartBadge } from "@/lib/badges";
import { formatPrice, formatMileage, vehicleTitle } from "@/lib/format";
import { getDisplayPhotos } from "@/lib/photos";
import PaymentEstimate from "./PaymentEstimate";
import { SparklesIcon, TagIcon, GaugeIcon } from "./icons";

const BADGE_STYLE: Record<SmartBadge, { style: string; icon: typeof SparklesIcon }> = {
  "New Arrival": { style: "bg-blue-600 text-white", icon: SparklesIcon },
  "Great Price": { style: "bg-emerald-600 text-white", icon: TagIcon },
  "Low Mileage": { style: "bg-purple-600 text-white", icon: GaugeIcon },
};

export default function VehicleCard({
  vehicle,
  badges = [],
  index = 0,
}: {
  vehicle: Vehicle;
  badges?: SmartBadge[];
  index?: number;
}) {
  const photo = getDisplayPhotos(vehicle)[0];
  const title = vehicleTitle(vehicle);

  return (
    <Link
      href={`/vehicles/${vehicle.id}`}
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
      className="group flex animate-fade-up flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70"
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
        {badges.length > 0 && (
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
            {badges.map((b) => {
              const { style, icon: Icon } = BADGE_STYLE[b];
              return (
                <span
                  key={b}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide shadow-sm ${style}`}
                >
                  <Icon className="h-3 w-3" /> {b}
                </span>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-lg font-semibold leading-snug text-slate-900">{title}</h3>
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-slate-900">{formatPrice(vehicle.price)}</span>
          <span className="text-sm text-slate-500">{formatMileage(vehicle.mileage)}</span>
        </div>
        <PaymentEstimate price={vehicle.price} />
        <p className="line-clamp-2 text-sm text-slate-600">{vehicle.description}</p>
        <span className="mt-auto flex items-center justify-between pt-2 text-sm font-semibold text-blue-700 transition group-hover:text-amber-600">
          View Details
          <span className="transition group-hover:translate-x-1">→</span>
        </span>
      </div>
    </Link>
  );
}
