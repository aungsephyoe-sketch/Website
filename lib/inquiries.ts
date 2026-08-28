import { promises as fs } from "fs";
import path from "path";
import type { Inquiry } from "./types";

const DATA_FILE = path.join(process.cwd(), "data", "inquiries.json");

let writeQueue: Promise<unknown> = Promise.resolve();
function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(fn, fn);
  writeQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

async function readAll(): Promise<Inquiry[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(items: Inquiry[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  const tmpFile = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpFile, JSON.stringify(items, null, 2), "utf-8");
  await fs.rename(tmpFile, DATA_FILE);
}

export async function getAllInquiries(): Promise<Inquiry[]> {
  const items = await readAll();
  return items.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function addInquiry(input: Omit<Inquiry, "id" | "createdAt">): Promise<Inquiry> {
  return withWriteLock(async () => {
    const items = await readAll();
    const inquiry: Inquiry = {
      ...input,
      id: `inq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    items.push(inquiry);
    await writeAll(items);
    return inquiry;
  });
}
