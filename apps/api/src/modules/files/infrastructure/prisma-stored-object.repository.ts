import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@tstaff/database";
import type {
  CreateStoredObjectInput,
  FileScanStatus,
  StoredObjectRecord,
  StoredObjectRepositoryPort,
} from "../application/ports/files.ports.js";

@Injectable()
export class PrismaStoredObjectRepository implements StoredObjectRepositoryPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(input: CreateStoredObjectInput): Promise<void> {
    await this.prisma.storedObject.create({ data: input });
  }

  async findById(id: string): Promise<StoredObjectRecord | null> {
    const stored = await this.prisma.storedObject.findUnique({ where: { id } });
    if (!stored) return null;
    if (stored.storageProvider !== "LOCAL" && stored.storageProvider !== "S3") {
      throw new Error("Unknown persisted private storage provider");
    }
    return {
      id: stored.id,
      bucket: stored.bucket,
      storageProvider: stored.storageProvider,
      objectKey: stored.objectKey,
      originalName: stored.originalName,
      mimeType: stored.mimeType,
      fileSizeBytes: stored.fileSizeBytes,
      uploadedById: stored.uploadedById,
      scanStatus: stored.scanStatus as FileScanStatus,
      isVirusScanned: stored.isVirusScanned,
    };
  }

  async updateScanStatus(id: string, scanStatus: FileScanStatus, isVirusScanned: boolean): Promise<void> {
    await this.prisma.storedObject.update({ where: { id }, data: { scanStatus, isVirusScanned } });
  }
}
