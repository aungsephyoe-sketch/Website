"use client";

import { useMemo, useState } from "react";
import type { Vehicle } from "@/lib/types";
import { BODY_TYPES } from "@/lib/types";
import VehicleCard from "./VehicleCard";

type SortOption = "newest" | "price-asc" | "price-desc" | "mileage-asc" | "year-desc";

export default function InventoryBrowser({ vehicles }: { vehicles: Vehicle[] }) {
  const [query, setQuery] = useState("");
  const [bodyType, setBodyType] = useState<string>("all");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [sort, setSort] = useState<SortOption>("newest");

  const bodyTypesPresent = useMemo(() => {
    const present = new Set(vehicles.map((v) => v.bodyType));
    return BODY_TYPES.filter((b) => present.has(b));
  }, [vehicles]);

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
          {filtered.map((v) => (
            <VehicleCard key={v.id} vehicle={v} />
          ))}
        </div>
      )}
    </div>
  );
}
