"use client";

import { useMemo, useState } from "react";
import type { Vehicle } from "@/lib/types";
import { BODY_TYPES } from "@/lib/types";
import { computeBadgeMap } from "@/lib/badges";
import VehicleCard from "./VehicleCard";

type SortOption = "newest" | "price-asc" | "price-desc" | "mileage-asc" | "year-desc";

const TILE_COLORS: Record<string, string> = {
  Sedan: "border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-400",
  SUV: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400",
  Truck: "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-400",
  Van: "border-purple-200 bg-purple-50 text-purple-700 hover:border-purple-400",
  Coupe: "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-400",
  Hatchback: "border-cyan-200 bg-cyan-50 text-cyan-700 hover:border-cyan-400",
  Convertible: "border-pink-200 bg-pink-50 text-pink-700 hover:border-pink-400",
  Wagon: "border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-400",
  Other: "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400",
};

export default function InventoryBrowser({
  vehicles,
  initialQuery = "",
  initialBodyType = "all",
}: {
  vehicles: Vehicle[];
  initialQuery?: string;
  initialBodyType?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [bodyType, setBodyType] = useState<string>(initialBodyType);
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [sort, setSort] = useState<SortOption>("newest");

  const badgeMap = useMemo(() => computeBadgeMap(vehicles), [vehicles]);

  const bodyTypeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of vehicles) counts.set(v.bodyType, (counts.get(v.bodyType) ?? 0) + 1);
    return counts;
  }, [vehicles]);

  const bodyTypesPresent = useMemo(
    () => BODY_TYPES.filter((b) => (bodyTypeCounts.get(b) ?? 0) > 0),
    [bodyTypeCounts]
  );

  const filtered = useMemo(() => {
    let list = vehicles;

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((v) =>
        [v.year, v.make, v.model, v.trim, v.description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    if (bodyType !== "all") {
      list = list.filter((v) => v.bodyType === bodyType);
    }

    const max = Number(maxPrice);
    if (maxPrice && Number.isFinite(max) && max > 0) {
      list = list.filter((v) => v.price === null || v.price <= max);
    }

    return [...list].sort((a, b) => {
      switch (sort) {
        case "price-asc":
          return (a.price ?? Infinity) - (b.price ?? Infinity);
        case "price-desc":
          return (b.price ?? -Infinity) - (a.price ?? -Infinity);
        case "mileage-asc":
          return a.mileage - b.mileage;
        case "year-desc":
          return b.year - a.year;
        default:
          return (b.createdAt || "").localeCompare(a.createdAt || "");
      }
    });
  }, [vehicles, query, bodyType, maxPrice, sort]);

  return (
    <div>
      {bodyTypesPresent.length > 1 && (
        <div className="mb-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setBodyType("all")}
            className={`rounded-xl border-2 px-4 py-3 text-sm font-bold transition ${
              bodyType === "all"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
            }`}
          >
            All Vehicles <span className="opacity-70">({vehicles.length})</span>
          </button>
          {bodyTypesPresent.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBodyType(b)}
              className={`rounded-xl border-2 px-4 py-3 text-sm font-bold transition ${
                bodyType === b ? "border-slate-900 bg-slate-900 text-white" : (TILE_COLORS[b] ?? TILE_COLORS.Other)
              }`}
            >
              {b} <span className="opacity-70">({bodyTypeCounts.get(b) ?? 0})</span>
            </button>
          ))}
        </div>
      )}

      <div className="mb-8 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:gap-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search make, model, or keyword…"
          aria-label="Search inventory"
          className="w-full flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
        <select
          value={bodyType}
          onChange={(e) => setBodyType(e.target.value)}
          aria-label="Filter by body style"
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          <option value="all">All Body Styles</option>
          {bodyTypesPresent.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          aria-label="Filter by max price"
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          <option value="">Any Price</option>
          <option value="10000">Under $10,000</option>
          <option value="15000">Under $15,000</option>
          <option value="20000">Under $20,000</option>
          <option value="30000">Under $30,000</option>
          <option value="50000">Under $50,000</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          aria-label="Sort inventory"
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          <option value="newest">Newest Listed</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="mileage-asc">Mileage: Low to High</option>
          <option value="year-desc">Year: Newest First</option>
        </select>
      </div>

      <p className="mb-4 text-sm text-slate-500">
        {filtered.length} vehicle{filtered.length === 1 ? "" : "s"} found
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
          No vehicles match your search. Try adjusting your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((v, i) => (
            <VehicleCard key={v.id} vehicle={v} badges={badgeMap.get(v.id) ?? []} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
