import type { BodyType, Vehicle } from "./types";

/** No real photo yet? Show a clean, themed placeholder instead of a broken image. */
export function placeholderImageForBodyType(bodyType: BodyType): string {
  switch (bodyType) {
    case "SUV":
    case "Van":
      return "/placeholders/suv.svg";
    case "Truck":
      return "/placeholders/truck.svg";
    default:
      return "/placeholders/car.svg";
  }
}

export function getDisplayPhotos(vehicle: Pick<Vehicle, "photos" | "bodyType">): string[] {
  if (vehicle.photos && vehicle.photos.length > 0) return vehicle.photos;
  return [placeholderImageForBodyType(vehicle.bodyType)];
}
