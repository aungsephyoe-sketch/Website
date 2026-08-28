export type BodyType =
  | "Sedan"
  | "SUV"
  | "Truck"
  | "Van"
  | "Coupe"
  | "Hatchback"
  | "Convertible"
  | "Wagon"
  | "Other";

export const BODY_TYPES: BodyType[] = [
  "Sedan",
  "SUV",
  "Truck",
  "Van",
  "Coupe",
  "Hatchback",
  "Convertible",
  "Wagon",
  "Other",
];

export type VehicleStatus = "available" | "pending" | "sold";

export const VEHICLE_STATUSES: VehicleStatus[] = ["available", "pending", "sold"];

export interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  /** null means "Call for Price" */
  price: number | null;
  mileage: number;
  bodyType: BodyType;
  exteriorColor: string;
  interiorColor: string;
  transmission: string;
  drivetrain: string;
  fuelType: string;
  engine: string;
  vin: string;
  description: string;
  features: string[];
  /** Paths like /uploads/xxx.jpg, or empty (a themed placeholder is shown). */
  photos: string[];
  status: VehicleStatus;
  createdAt: string;
  updatedAt: string;
}

export type SmsStatus = "sent" | "failed" | "not_configured";

export interface Inquiry {
  id: string;
  vehicleId: string;
  vehicleLabel: string;
  name: string;
  phone: string;
  message: string;
  smsStatus: SmsStatus;
  smsError?: string;
  createdAt: string;
}
