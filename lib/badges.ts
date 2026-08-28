import type { Vehicle } from "./types";

export type SmartBadge = "New Arrival" | "Great Price" | "Low Mileage";

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Computes small badges straight from the real numbers already in the dataset —
 * never a fabricated marketing claim. Only compares against other *available*
 * vehicles of the same body type, and only once there are enough peers for the
 * comparison to mean anything.
 */
export function computeBadgeMap(vehicles: Vehicle[]): Map<string, SmartBadge[]> {
  const map = new Map<string, SmartBadge[]>();
  const active = vehicles.filter((v) => v.status === "available");

  const newestIds = new Set(
    [...active]
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
      .slice(0, 3)
      .map((v) => v.id)
  );

  const byBodyType = new Map<string, Vehicle[]>();
  for (const v of active) {
    const list = byBodyType.get(v.bodyType) ?? [];
    list.push(v);
    byBodyType.set(v.bodyType, list);
  }

  for (const v of active) {
    const badges: SmartBadge[] = [];
    const peers = byBodyType.get(v.bodyType) ?? [];

    if (peers.length >= 3) {
      const prices = peers.filter((p) => p.price !== null).map((p) => p.price as number);
      if (v.price !== null && prices.length >= 3 && v.price <= median(prices) * 0.9) {
        badges.push("Great Price");
      }

      const mileages = peers.map((p) => p.mileage);
      if (v.mileage <= median(mileages) * 0.75) {
        badges.push("Low Mileage");
      }
    }

    if (newestIds.has(v.id)) badges.push("New Arrival");

    if (badges.length > 0) map.set(v.id, badges.slice(0, 2));
  }

  return map;
}
