export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Deterministic-looking, human-readable id with a short random suffix for uniqueness. */
export function generateVehicleId(
  year: number | string,
  make: string,
  model: string,
  trim?: string
): string {
  const base = slugify([year, make, model, trim].filter(Boolean).join(" "));
  const suffix = Math.random().toString(36).slice(2, 7);
  return base ? `${base}-${suffix}` : suffix;
}
