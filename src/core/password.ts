import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, encoded: string): boolean {
  const [salt, storedHash] = encoded.split(":");
  if (!salt || !storedHash) {
    return false;
  }
  const computed = scryptSync(password, salt, KEYLEN);
  const stored = Buffer.from(storedHash, "hex");
  if (computed.length !== stored.length) {
    return false;
  }
  return timingSafeEqual(computed, stored);
}
