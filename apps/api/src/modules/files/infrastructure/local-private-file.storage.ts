import { Injectable } from "@nestjs/common";
import { createReadStream } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import type { Readable } from "node:stream";
import type { PrivateFileStoragePort } from "../application/ports/files.ports.js";

@Injectable()
export class LocalPrivateFileStorage implements PrivateFileStoragePort {
  getUploadLocation() {
    return { storageProvider: "LOCAL" as const, bucket: "private-research" };
  }
  async write(objectKey: string, contents: Buffer): Promise<void> {
    const filePath = this.filePath(objectKey);
    await mkdir(resolve(filePath, ".."), { recursive: true });
    await writeFile(filePath, contents, { flag: "wx", mode: 0o600 });
  }

  async read(objectKey: string): Promise<Buffer> {
    return readFile(this.filePath(objectKey));
  }

  open(objectKey: string): Readable {
    return createReadStream(this.filePath(objectKey));
  }

  async remove(objectKey: string): Promise<void> {
    await rm(this.filePath(objectKey), { force: true });
  }

  private filePath(objectKey: string): string {
    const directory = resolve(process.env.PRIVATE_FILES_DIR ?? "var/private-files");
    const target = resolve(directory, objectKey);
    const relativeTarget = relative(directory, target);
    if (!relativeTarget || relativeTarget.startsWith("..") || isAbsolute(relativeTarget)) {
      throw new Error("شناسه فایل نامعتبر است");
    }
    return target;
  }
}
