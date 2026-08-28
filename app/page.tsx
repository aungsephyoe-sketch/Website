import { getAllVehicles } from "@/lib/vehicles";
import InventoryBrowser from "@/components/InventoryBrowser";
import HeroSearch from "@/components/HeroSearch";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL, SERVICE_AREA } from "@/lib/site-config";
import { CarGlyphIcon, MapPinIcon, ShieldCheckIcon, CheckCircleIcon, MessageCircleIcon, ClockIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ q?: string; type?: string }> };

const TRUST_ITEMS = [
  {
    icon: CheckCircleIcon,
    title: "Verified Vehicle Details",
    body: "Clear pricing, mileage, and specs on every single listing — no guessing games.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Free History Reports",
    body: "Carfax and AutoCheck links right on every vehicle, so you can check before you buy.",
  },
  {
    icon: MessageCircleIcon,
    title: "Text Us Instantly",
    body: "Send an inquiry from any listing and we'll text you back — no waiting on hold.",
  },
  {
    icon: ClockIcon,
    title: "Browse On Your Time",
    body: "Full inventory online 24/7 — filter by price, mileage, or body style.",
  },
];

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const vehicles = await getAllVehicles();
  const availableCount = vehicles.filter((v) => v.status === "available").length;

  return (
    <div>
      <section className="relative overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(245,158,11,0.18),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(37,99,235,0.2),_transparent_55%)]" />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">{SERVICE_AREA}</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Quality Used Cars, Trucks &amp; SUVs
            <span className="block bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
              Priced to Sell
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            Browse our full inventory below. Find something you like? Send us a quick message or call{" "}
            <a href={`tel:${CONTACT_PHONE_TEL}`} className="font-semibold text-amber-400 underline">
              {CONTACT_PHONE_DISPLAY}
            </a>{" "}
            and we&apos;ll text you right back.
          </p>

          <HeroSearch initialQuery={params.q} />

          <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-200 backdrop-blur">
              <CarGlyphIcon className="h-4 w-4 text-amber-400" /> {availableCount} Vehicles In Stock
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-200 backdrop-blur">
              <MapPinIcon className="h-4 w-4 text-amber-400" /> {SERVICE_AREA}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-200 backdrop-blur">
              <ShieldCheckIcon className="h-4 w-4 text-amber-400" /> Free History Reports
            </span>
          </div>
        </div>
      </section>

      <section id="inventory" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <InventoryBrowser vehicles={vehicles} initialQuery={params.q} initialBodyType={params.type} />
      </section>

      <section className="border-t border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-extrabold text-slate-900 sm:text-3xl">Why Shop With Us</h2>
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_ITEMS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">{title}</h3>
                <p className="mt-1.5 text-sm text-slate-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
