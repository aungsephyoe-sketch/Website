export const SITE_NAME = "Shopusedcarz";
export const SITE_TAGLINE = "Quality Used Cars, Trucks & SUVs";
export const SERVICE_AREA = "Carrollton, TX";

export const CONTACT_PHONE_DISPLAY = "(469) 881-3778";
export const CONTACT_PHONE_TEL = "+14698813778";
export const CONTACT_EMAIL = "aung@texascarone.com";

// Vehicle history report link templates — {VIN} is replaced with the vehicle's VIN.
// These are the general public report-lookup URLs for each service. If your
// dealership has a Carfax/AutoCheck dealer program, you may have been issued a
// different report link format (sometimes including a dealer/account ID) —
// swap these two lines for that link pattern if so.
export const CARFAX_URL_TEMPLATE = "https://www.carfax.com/vehicle/{VIN}";
export const AUTOCHECK_URL_TEMPLATE = "https://www.autocheck.com/vehiclehistory/vin/{VIN}";

// Financing estimate shown on listings — clearly labeled as an estimate, not a
// real offer. Tune these to match your actual typical rates.
export const FINANCE_APR_PERCENT = 9.9;
export const FINANCE_TERM_MONTHS = 60;
export const FINANCE_DOWN_PAYMENT_RATIO = 0.1; // 10% down assumed for the estimate
