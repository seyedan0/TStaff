import { Inject, Injectable, Optional } from "@nestjs/common";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import type { FileStorageLocation, PrivateFileStoragePort } from "../application/ports/files.ports.js";

/** Private object storage. No public ACL, URL, or bucket-list permission is needed. */
@Injectable()
export class S3PrivateFileStorage implements PrivateFileStoragePort {
  private client: S3Client | undefined;

  constructor(@Optional() @Inject(S3Client) client?: S3Client) {
    this.client = client;
  }

  getUploadLocation(): FileStorageLocation {
    const bucket = process.env.S3_BUCKET;
    if (!bucket) throw new Error("S3_BUCKET must be configured for private file storage");
    return { storageProvider: "S3", bucket };
  }

  async write(objectKey: string, contents: Buffer, location = this.getUploadLocation()): Promise<void> {
    const encryption = process.env.S3_SERVER_SIDE_ENCRYPTION;
    if (encryption && encryption !== "AES256") throw new Error("Unsupported S3_SERVER_SIDE_ENCRYPTION setting");
    await this.getClient().send(new PutObjectCommand({
      Bucket: location.bucket,
      Key: objectKey,
      Body: contents,
      ContentLength: contents.length,
      ContentType: objectKey.endsWith(".pdf") ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ...(encryption ? { ServerSideEncryption: "AES256" as const } : {}),
      IfNoneMatch: "*",
    }));
  }

  async open(objectKey: string, location = this.getUploadLocation()): Promise<Readable> {
    const result = await this.getClient().send(new GetObjectCommand({ Bucket: location.bucket, Key: objectKey }));
    if (!(result.Body instanceof Readable)) throw new Error("Private file storage returned no readable body");
    return result.Body;
  }

  async read(objectKey: string, location = this.getUploadLocation()): Promise<Buffer> {
    const stream = await this.open(objectKey, location);
    const parts: Buffer[] = [];
    let totalBytes = 0;
    const maximum = Number(process.env.FILE_MAX_BYTES) || 25 * 1024 * 1024;
    for await (const part of stream) {
      const bytes = Buffer.isBuffer(part) ? part : Buffer.from(part);
      totalBytes += bytes.length;
      if (totalBytes > maximum) {
        stream.destroy();
        throw new Error("Private object exceeds the configured file limit");
      }
      parts.push(bytes);
    }
    return Buffer.concat(parts);
  }

  async remove(objectKey: string, location = this.getUploadLocation()): Promise<void> {
    await this.getClient().send(new DeleteObjectCommand({ Bucket: location.bucket, Key: objectKey }));
  }

  private getClient(): S3Client {
    if (!this.client) {
      const accessKeyId = process.env.S3_ACCESS_KEY;
      const secretAccessKey = process.env.S3_SECRET_KEY;
      if (!!accessKeyId !== !!secretAccessKey) throw new Error("Both S3 credential settings must be configured together");
      this.client = new S3Client({
        ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
        region: process.env.S3_REGION ?? "us-east-1",
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
        maxAttempts: 3,
        ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
      });
    }
    return this.client;
  }
}
