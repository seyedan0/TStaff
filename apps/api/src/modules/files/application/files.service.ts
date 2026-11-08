import { Inject, Injectable } from "@nestjs/common";
import { basename, extname } from "node:path";
import { randomUUID } from "node:crypto";
import { AssignmentsService } from "../../assignments/application/assignments.service.js";
import {
  FileAccessDeniedError,
  FileNotReadyError,
  FileScannerUnavailableError,
  FileTooLargeError,
  InvalidFileError,
  StoredObjectNotFoundError,
} from "../domain/file-errors.js";
import {
  PRIVATE_FILE_STORAGE,
  STORED_OBJECT_REPOSITORY,
  VIRUS_SCANNER,
  type FileScanStatus,
  type PrivateFileStoragePort,
  type StoredObjectRecord,
  type StoredObjectRepositoryPort,
  type VirusScannerPort,
} from "./ports/files.ports.js";

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;
const FILE_TYPES = new Map([
  [".pdf", { mime: "application/pdf", signature: Buffer.from("%PDF-") }],
  [".docx", { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", signature: Buffer.from([0x50, 0x4b, 0x03, 0x04]) }],
]);

@Injectable()
export class FilesService {
  constructor(
    @Inject(STORED_OBJECT_REPOSITORY) private readonly objects: StoredObjectRepositoryPort,
    @Inject(PRIVATE_FILE_STORAGE) private readonly storage: PrivateFileStoragePort,
    @Inject(VIRUS_SCANNER) private readonly scanner: VirusScannerPort,
    private readonly assignments: AssignmentsService,
  ) {}

  get maxBytes(): number {
    const configured = Number(process.env.FILE_MAX_BYTES);
    return Number.isSafeInteger(configured) && configured > 0 ? configured : DEFAULT_MAX_BYTES;
  }

  async upload(file: { originalname: string; mimetype: string; size: number; buffer: Buffer }, uploadedById: string) {
    if (!file?.buffer || !file.size) throw new InvalidFileError("فایل خالی است");
    if (file.size > this.maxBytes) throw new FileTooLargeError(this.maxBytes);
    const extension = extname(file.originalname).toLowerCase();
    const type = FILE_TYPES.get(extension);
    if (!type || type.mime !== file.mimetype) throw new InvalidFileError("فقط فایل PDF یا DOCX پذیرفته می‌شود");
    if (!file.buffer.subarray(0, type.signature.length).equals(type.signature)) {
      throw new InvalidFileError("محتوای فایل با پسوند آن سازگار نیست");
    }

    const id = randomUUID();
    const objectKey = `${id}${extension}`;
    await this.storage.write(objectKey, file.buffer);
    try {
      await this.objects.create({
        id,
        bucket: "private-research",
        objectKey,
        originalName: basename(file.originalname).slice(0, 255),
        mimeType: type.mime,
        fileSizeBytes: BigInt(file.size),
        uploadedById,
        scanStatus: "QUARANTINED",
        isVirusScanned: false,
        isPrivate: true,
      });
    } catch (error) {
      await this.storage.remove(objectKey);
      throw error;
    }

    const scan = await this.scanner.scan(file.buffer);
    if (scan === "UNAVAILABLE") {
      return { id, originalName: basename(file.originalname), size: file.size, scanStatus: "QUARANTINED" as const };
    }
    if (scan === "INFECTED") {
      await this.objects.updateScanStatus(id, "REJECTED", true);
      await this.storage.remove(objectKey);
      throw new InvalidFileError("فایل توسط اسکن امنیتی رد شد");
    }
    await this.objects.updateScanStatus(id, "AVAILABLE", true);
    return { id, originalName: basename(file.originalname), size: file.size, scanStatus: "AVAILABLE" as const };
  }

  async rescan(id: string, requesterId: string) {
    const stored = await this.getStoredObject(id);
    if (stored.uploadedById !== requesterId) throw new FileAccessDeniedError("فقط بارگذار فایل می‌تواند اسکن را دوباره اجرا کند");
    if (stored.scanStatus !== "QUARANTINED") return this.toUploadResult(stored);
    const scan = await this.scanner.scan(await this.storage.read(stored.objectKey));
    if (scan === "UNAVAILABLE") throw new FileScannerUnavailableError();
    const scanStatus: FileScanStatus = scan === "CLEAN" ? "AVAILABLE" : "REJECTED";
    await this.objects.updateScanStatus(id, scanStatus, true);
    if (scan === "INFECTED") await this.storage.remove(stored.objectKey);
    return { id, originalName: stored.originalName, size: Number(stored.fileSizeBytes), scanStatus };
  }

  async assertReadyForUse(id: string, userId: string): Promise<void> {
    const stored = await this.getStoredObject(id);
    if (stored.uploadedById !== userId) throw new FileAccessDeniedError("فقط بارگذار فایل می‌تواند آن را به گزارش پیوست کند");
    if (stored.scanStatus !== "AVAILABLE" || !stored.isVirusScanned) {
      throw new FileNotReadyError("فایل تا پایان اسکن امنیتی قابل استفاده نیست");
    }
  }

  async isAvailable(id: string): Promise<boolean> {
    const stored = await this.objects.findById(id);
    return !!stored && stored.scanStatus === "AVAILABLE" && stored.isVirusScanned;
  }

  async getDownload(id: string, userId: string, roles: string[]) {
    const stored = await this.getStoredObject(id);
    if (stored.scanStatus !== "AVAILABLE" || !stored.isVirusScanned) {
      throw new FileAccessDeniedError("فایل هنوز تأیید امنیتی نشده است");
    }
    const allowed = roles.includes("SYSTEM_ADMIN") || stored.uploadedById === userId ||
      await this.assignments.isSupervisorAssignedToUser(stored.uploadedById, userId);
    if (!allowed) throw new FileAccessDeniedError("دسترسی به این فایل مجاز نیست");
    return { stream: this.storage.open(stored.objectKey), name: stored.originalName, mimeType: stored.mimeType };
  }

  private async getStoredObject(id: string): Promise<StoredObjectRecord> {
    const stored = await this.objects.findById(id);
    if (!stored) throw new StoredObjectNotFoundError(id);
    return stored;
  }

  private toUploadResult(stored: StoredObjectRecord) {
    return { id: stored.id, originalName: stored.originalName, size: Number(stored.fileSizeBytes), scanStatus: stored.scanStatus };
  }
}
