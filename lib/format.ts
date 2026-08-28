export function formatPrice(price: number | null): string {
  if (price === null || price === undefined || Number.isNaN(price)) {
    return "Call for Price";
  }
  return price.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function formatMileage(mileage: number): string {
  return `${(mileage || 0).toLocaleString("en-US")} mi`;
}

export function vehicleTitle(v: { year: number; make: string; model: string; trim?: string }): string {
  return [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");
}
