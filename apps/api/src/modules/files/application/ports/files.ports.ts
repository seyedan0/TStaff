import type { Readable } from "node:stream";

export type FileScanStatus = "QUARANTINED" | "AVAILABLE" | "REJECTED";
export type VirusScanResult = "CLEAN" | "INFECTED" | "UNAVAILABLE";

export interface StoredObjectRecord {
  id: string;
  objectKey: string;
  originalName: string;
  mimeType: string;
  fileSizeBytes: bigint;
  uploadedById: string;
  scanStatus: FileScanStatus;
  isVirusScanned: boolean;
}

export interface CreateStoredObjectInput extends StoredObjectRecord {
  bucket: string;
  isPrivate: boolean;
}

export interface StoredObjectRepositoryPort {
  create(input: CreateStoredObjectInput): Promise<void>;
  findById(id: string): Promise<StoredObjectRecord | null>;
  updateScanStatus(id: string, scanStatus: FileScanStatus, isVirusScanned: boolean): Promise<void>;
}

export interface PrivateFileStoragePort {
  write(objectKey: string, contents: Buffer): Promise<void>;
  read(objectKey: string): Promise<Buffer>;
  open(objectKey: string): Readable;
  remove(objectKey: string): Promise<void>;
}

export interface VirusScannerPort {
  scan(contents: Buffer): Promise<VirusScanResult>;
}

export const STORED_OBJECT_REPOSITORY = Symbol("STORED_OBJECT_REPOSITORY");
export const PRIVATE_FILE_STORAGE = Symbol("PRIVATE_FILE_STORAGE");
export const VIRUS_SCANNER = Symbol("VIRUS_SCANNER");
