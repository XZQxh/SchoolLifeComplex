import crypto from "node:crypto";

export function hashPassword(password, salt = crypto.randomBytes(8).toString("hex")) {
  const digest = crypto.createHash("sha256").update(salt + password).digest("hex");
  return `${salt}:${digest}`;
}

export function verifyPassword(password, stored) {
  if (typeof stored !== "string" || !stored.includes(":")) return false;
  const [salt] = stored.split(":");
  return hashPassword(password, salt) === stored;
}
