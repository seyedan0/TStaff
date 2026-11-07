import { Injectable } from "@nestjs/common";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { PasswordHasherPort } from "../application/ports/password-hasher.port.js";

const scryptAsync = promisify(scrypt);

@Injectable()
export class CryptoPasswordHasher implements PasswordHasherPort {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${salt}:${derivedKey.toString("hex")}`;
  }

  async compare(password: string, storedHash: string): Promise<boolean> {
    const parts = storedHash.split(":");
    if (parts.length !== 2) return false;
    const [salt, key] = parts;
    if (!salt || !key) return false;

    try {
      const keyBuffer = Buffer.from(key, "hex");
      const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
      if (keyBuffer.length !== derivedKey.length) {
        return false;
      }
      return timingSafeEqual(keyBuffer, derivedKey);
    } catch {
      return false;
    }
  }
}
