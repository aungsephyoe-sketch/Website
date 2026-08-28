import { CARFAX_URL_TEMPLATE, AUTOCHECK_URL_TEMPLATE } from "./site-config";

function buildUrl(template: string, vin: string): string | null {
  const clean = vin.trim().toUpperCase();
  if (!clean) return null;
  return template.replace("{VIN}", encodeURIComponent(clean));
}

export function carfaxUrl(vin: string): string | null {
  return buildUrl(CARFAX_URL_TEMPLATE, vin);
}

export function autocheckUrl(vin: string): string | null {
  return buildUrl(AUTOCHECK_URL_TEMPLATE, vin);
}
