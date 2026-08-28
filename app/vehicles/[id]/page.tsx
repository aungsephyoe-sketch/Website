import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getAllVehicles, getVehicleById } from "@/lib/vehicles";
import { formatPrice, formatMileage, vehicleTitle } from "@/lib/format";
import { getDisplayPhotos } from "@/lib/photos";
import { computeBadgeMap } from "@/lib/badges";
import type { SmartBadge } from "@/lib/badges";
import PhotoGallery from "@/components/PhotoGallery";
import InquiryForm from "@/components/InquiryForm";
import VehicleCard from "@/components/VehicleCard";
import HistoryReportLinks from "@/components/HistoryReportLinks";
import PaymentEstimate from "@/components/PaymentEstimate";
import MobileCtaBar from "@/components/MobileCtaBar";
import { ChevronLeftIcon, SparklesIcon, TagIcon, GaugeIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

const BADGE_STYLE: Record<SmartBadge, { style: string; icon: typeof SparklesIcon }> = {
  "New Arrival": { style: "bg-blue-600 text-white", icon: SparklesIcon },
  "Great Price": { style: "bg-emerald-600 text-white", icon: TagIcon },
  "Low Mileage": { style: "bg-purple-600 text-white", icon: GaugeIcon },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const vehicle = await getVehicleById(id);
  if (!vehicle) return { title: "Vehicle Not Found | Shopusedcarz" };
  const title = vehicleTitle(vehicle);
  return {
    title: `${title} | Shopusedcarz`,
    description: vehicle.description || `${title} for sale at Shopusedcarz.`,
  };
}

export default async function VehicleDetailPage({ params }: PageProps) {
  const { id } = await params;
  const vehicle = await getVehicleById(id);
  if (!vehicle) notFound();

  const allVehicles = await getAllVehicles();
  const similar = allVehicles.filter((v) => v.id !== vehicle.id && v.bodyType === vehicle.bodyType).slice(0, 3);
  const badges = computeBadgeMap(allVehicles).get(vehicle.id) ?? [];

  const title = vehicleTitle(vehicle);
  const specs: [string, string][] = [
    ["Body Style", vehicle.bodyType],
    ["Exterior Color", vehicle.exteriorColor || "—"],
    ["Interior Color", vehicle.interiorColor || "—"],
    ["Transmission", vehicle.transmission || "—"],
    ["Drivetrain", vehicle.drivetrain || "—"],
    ["Fuel Type", vehicle.fuelType || "—"],
    ["Engine", vehicle.engine || "—"],
    ["Mileage", formatMileage(vehicle.mileage)],
    ["VIN", vehicle.vin || "—"],
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 lg:pb-8">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 transition hover:text-blue-700"
      >
        <ChevronLeftIcon className="h-4 w-4" /> Back to Inventory
      </Link>

      <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div className="animate-fade-up">
          <PhotoGallery photos={getDisplayPhotos(vehicle)} alt={title} />

          <div className="mt-8">
            {badges.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {badges.map((b) => {
                  const { style, icon: Icon } = BADGE_STYLE[b];
                  return (
                    <span
                      key={b}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${style}`}
                    >
                      <Icon className="h-3 w-3" /> {b}
                    </span>
                  );
                })}
              </div>
            )}

            <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <span className="text-2xl font-bold text-blue-700">{formatPrice(vehicle.price)}</span>
              <span className="text-slate-500">{formatMileage(vehicle.mileage)}</span>
              {vehicle.status !== "available" && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase text-amber-700">
                  {vehicle.status}
                </span>
              )}
            </div>
            <div className="mt-1">
              <PaymentEstimate price={vehicle.price} size="lg" />
            </div>

            <div className="mt-4">
              <HistoryReportLinks vin={vehicle.vin} />
            </div>

            {vehicle.description && (
              <div className="mt-6">
                <h2 className="text-lg font-bold text-slate-900">Description</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                  {vehicle.description}
                </p>
              </div>
            )}

            <div className="mt-8">
              <h2 className="text-lg font-bold text-slate-900">Specifications</h2>
              <dl className="mt-3 grid grid-cols-1 gap-x-6 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
                {specs.map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b border-slate-100 py-2 text-sm">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="font-medium text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {vehicle.features.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-bold text-slate-900">Features</h2>
                <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {vehicle.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <InquiryForm vehicleId={vehicle.id} vehicleTitle={title} />
        </div>
      </div>

      {similar.length > 0 && (
        <div className="mt-16">
          <h2 className="text-xl font-bold text-slate-900">You might also like</h2>
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
        </div>
      )}

      <MobileCtaBar />
    </div>
  );
}
