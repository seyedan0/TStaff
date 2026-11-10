import { Inject, Injectable } from "@nestjs/common";
import type { FileStorageLocation, PrivateFileStoragePort } from "../application/ports/files.ports.js";
import { LocalPrivateFileStorage } from "./local-private-file.storage.js";
import { S3PrivateFileStorage } from "./s3-private-file.storage.js";

/** Persist location with each object; changing the upload default never moves old files. */
@Injectable()
export class ProviderPrivateFileStorage implements PrivateFileStoragePort {
  constructor(
    @Inject(LocalPrivateFileStorage) private readonly local: LocalPrivateFileStorage,
    @Inject(S3PrivateFileStorage) private readonly s3: S3PrivateFileStorage,
  ) {}

  getUploadLocation(): FileStorageLocation {
    const configured = process.env.FILE_STORAGE_PROVIDER;
    if (!configured && process.env.NODE_ENV === "production") {
      throw new Error("FILE_STORAGE_PROVIDER must be explicitly configured in production");
    }
    const storageProvider = configured ?? "LOCAL";
    if (storageProvider !== "LOCAL" && storageProvider !== "S3") throw new Error("Unknown private storage provider");
    return storageProvider === "LOCAL" ? this.local.getUploadLocation() : this.s3.getUploadLocation();
  }

  write(key: string, contents: Buffer, location = this.getUploadLocation()) {
    return this.backend(location).write(key, contents, location);
  }

  read(key: string, location = this.getUploadLocation()) {
    return this.backend(location).read(key, location);
  }

  open(key: string, location = this.getUploadLocation()) {
    return this.backend(location).open(key, location);
  }

  remove(key: string, location = this.getUploadLocation()) {
    return this.backend(location).remove(key, location);
  }

  private backend(location: FileStorageLocation): PrivateFileStoragePort {
    if (location.storageProvider === "LOCAL") return this.local;
    if (location.storageProvider === "S3") return this.s3;
    throw new Error("Unknown persisted private storage provider");
  }
}
