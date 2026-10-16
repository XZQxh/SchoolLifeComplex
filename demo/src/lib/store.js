import fs from "node:fs";
import path from "node:path";
import { createSeedDatabase } from "./seed.js";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

let writeChain = Promise.resolve();

function ensureDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(createSeedDatabase(), null, 2), "utf8");
  }
}

export function read() {
  ensureDatabase();
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

export async function write(mutator) {
  const run = async () => {
    const db = read();
    const result = mutator(db);
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
    return result;
  };
  const task = writeChain.then(run, run);
  writeChain = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
}

export function nextId(db, prefix) {
  if (!db.meta) db.meta = { seq: {} };
  if (!db.meta.seq) db.meta.seq = {};
  const current = db.meta.seq[prefix] ?? 0;
  const next = current + 1;
  db.meta.seq[prefix] = next;
  return `${prefix}_${next}`;
}

export function databaseFile() {
  ensureDatabase();
  return DB_FILE;
}
