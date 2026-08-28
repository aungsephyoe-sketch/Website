import { getAllVehicles } from "@/lib/vehicles";
import InventoryBrowser from "@/components/InventoryBrowser";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL, SERVICE_AREA } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const vehicles = await getAllVehicles();

  return (
    <div>
      <section className="relative overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(245,158,11,0.15),_transparent_55%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">{SERVICE_AREA}</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Quality Used Cars, Trucks &amp; SUVs — Priced to Sell
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            Browse our full inventory below. Find something you like? Send us a quick message or call{" "}
            <a href={`tel:${CONTACT_PHONE_TEL}`} className="font-semibold text-amber-400 underline">
              {CONTACT_PHONE_DISPLAY}
            </a>{" "}
            and we&apos;ll text you right back.
          </p>
          <a
            href="#inventory"
            className="mt-8 inline-flex items-center rounded-full bg-amber-500 px-8 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-amber-600"
          >
            Browse Inventory
          </a>
        </div>
      </section>

      <section id="inventory" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <InventoryBrowser vehicles={vehicles} />
      </section>
    </div>
  );
}
