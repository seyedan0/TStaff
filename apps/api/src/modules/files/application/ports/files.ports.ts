import type { Readable } from "node:stream";

export type FileScanStatus = "QUARANTINED" | "AVAILABLE" | "REJECTED";
export type VirusScanResult = "CLEAN" | "INFECTED" | "UNAVAILABLE";
export type StorageProvider = "LOCAL" | "S3";

export interface FileStorageLocation {
  storageProvider: StorageProvider;
  bucket: string;
}

export interface StoredObjectRecord extends FileStorageLocation {
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
  getUploadLocation(): FileStorageLocation;
  write(objectKey: string, contents: Buffer, location?: FileStorageLocation): Promise<void>;
  read(objectKey: string, location?: FileStorageLocation): Promise<Buffer>;
  open(objectKey: string, location?: FileStorageLocation): Readable | Promise<Readable>;
  remove(objectKey: string, location?: FileStorageLocation): Promise<void>;
}

/** The owning feature authorizes the actual attached record, never a bank entry. */
export interface FileAccessPort {
  canDownload(fileId: string, userId: string, roles: string[]): Promise<boolean>;
}

export interface VirusScannerPort {
  scan(contents: Buffer): Promise<VirusScanResult>;
}

export const STORED_OBJECT_REPOSITORY = Symbol("STORED_OBJECT_REPOSITORY");
export const PRIVATE_FILE_STORAGE = Symbol("PRIVATE_FILE_STORAGE");
export const VIRUS_SCANNER = Symbol("VIRUS_SCANNER");
export const FILE_ACCESS = Symbol("FILE_ACCESS");
