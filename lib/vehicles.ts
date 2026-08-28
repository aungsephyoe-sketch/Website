import { promises as fs } from "fs";
import path from "path";
import type { Vehicle } from "./types";
import { generateVehicleId } from "./slug";

const DATA_FILE = path.join(process.cwd(), "data", "vehicles.json");

// Serialize writes so concurrent admin edits can't corrupt the JSON file.
let writeQueue: Promise<unknown> = Promise.resolve();
function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(fn, fn);
  writeQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

async function readAll(): Promise<Vehicle[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(vehicles: Vehicle[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  const tmpFile = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpFile, JSON.stringify(vehicles, null, 2), "utf-8");
  await fs.rename(tmpFile, DATA_FILE);
}

export async function getAllVehicles(): Promise<Vehicle[]> {
  const vehicles = await readAll();
  return vehicles.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function getVehicleById(id: string): Promise<Vehicle | null> {
  const vehicles = await readAll();
  return vehicles.find((v) => v.id === id) ?? null;
}

export type VehicleInput = Omit<Vehicle, "id" | "createdAt" | "updatedAt">;

export async function createVehicle(input: VehicleInput): Promise<Vehicle> {
  return withWriteLock(async () => {
    const vehicles = await readAll();
    const now = new Date().toISOString();
    const existingIds = new Set(vehicles.map((v) => v.id));
    let id = generateVehicleId(input.year, input.make, input.model, input.trim);
    while (existingIds.has(id)) {
      id = generateVehicleId(input.year, input.make, input.model, input.trim);
    }
    const vehicle: Vehicle = { ...input, id, createdAt: now, updatedAt: now };
    vehicles.push(vehicle);
    await writeAll(vehicles);
    return vehicle;
  });
}

export async function updateVehicle(
  id: string,
  patch: Partial<VehicleInput>
): Promise<Vehicle | null> {
  return withWriteLock(async () => {
    const vehicles = await readAll();
    const idx = vehicles.findIndex((v) => v.id === id);
    if (idx === -1) return null;
    const updated: Vehicle = {
      ...vehicles[idx],
      ...patch,
      id,
      updatedAt: new Date().toISOString(),
    };
    vehicles[idx] = updated;
    await writeAll(vehicles);
    return updated;
  });
}

export async function deleteVehicle(id: string): Promise<Vehicle | null> {
  return withWriteLock(async () => {
    const vehicles = await readAll();
    const idx = vehicles.findIndex((v) => v.id === id);
    if (idx === -1) return null;
    const [removed] = vehicles.splice(idx, 1);
    await writeAll(vehicles);
    return removed;
  });
}
