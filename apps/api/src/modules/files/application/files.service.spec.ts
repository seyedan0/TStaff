import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { Readable } from "node:stream";
import { FilesService } from "./files.service.js";
import type {
  FileScanStatus,
  PrivateFileStoragePort,
  StoredObjectRecord,
  StoredObjectRepositoryPort,
  VirusScannerPort,
  VirusScanResult,
  FileAccessPort,
} from "./ports/files.ports.js";

describe("FilesService (FR-016, FR-058, AT-05, AT-30)", () => {
  let service: FilesService;
  let rows: Map<string, StoredObjectRecord>;
  let storedFiles: Map<string, Buffer>;
  let scanResult: VirusScanResult;
  let access: FileAccessPort;
  let objects: StoredObjectRepositoryPort;
  let storage: PrivateFileStoragePort;
  let scanner: VirusScannerPort;
  const previousMaxBytes = process.env.FILE_MAX_BYTES;

  const pdf = () => ({
    originalname: "research-report.pdf",
    mimetype: "application/pdf",
    size: 6,
    buffer: Buffer.from("%PDF-a"),
  });

  beforeEach(() => {
    delete process.env.FILE_MAX_BYTES;
    rows = new Map();
    storedFiles = new Map();
    scanResult = "CLEAN";
    access = { canDownload: vi.fn(async (_fileId, userId) => userId === "supervisor-1") };

    objects = {
      create: vi.fn(async (input) => { rows.set(input.id, { ...input }); }),
      findById: vi.fn(async (id) => rows.get(id) ?? null),
      updateScanStatus: vi.fn(async (id, scanStatus: FileScanStatus, isVirusScanned) => {
        const existing = rows.get(id);
        if (existing) rows.set(id, { ...existing, scanStatus, isVirusScanned });
      }),
    };
    storage = {
      getUploadLocation: vi.fn(() => ({ storageProvider: "LOCAL" as const, bucket: "private-research" })),
      write: vi.fn(async (key, contents) => { storedFiles.set(key, Buffer.from(contents)); }),
      read: vi.fn(async (key) => storedFiles.get(key) ?? Buffer.alloc(0)),
      open: vi.fn((key) => Readable.from([storedFiles.get(key) ?? Buffer.alloc(0)])),
      remove: vi.fn(async (key) => { storedFiles.delete(key); }),
    };
    scanner = { scan: vi.fn(async () => scanResult) };
    service = new FilesService(objects, storage, scanner, access);
  });

  afterEach(() => {
    if (previousMaxBytes === undefined) delete process.env.FILE_MAX_BYTES;
    else process.env.FILE_MAX_BYTES = previousMaxBytes;
  });

  it("only makes a PDF downloadable after a clean scan", async () => {
    const uploaded = await service.upload(pdf(), "trainee-1");
    expect(uploaded.scanStatus).toBe("AVAILABLE");
    expect(await service.isAvailable(uploaded.id)).toBe(true);
    await expect(service.getDownload(uploaded.id, "supervisor-1", ["SCIENTIFIC_SUPERVISOR"]))
      .resolves.toMatchObject({ name: "research-report.pdf", mimeType: "application/pdf" });
  });

  it("keeps a file quarantined when the scanner is unavailable", async () => {
    scanResult = "UNAVAILABLE";
    const uploaded = await service.upload(pdf(), "trainee-1");
    expect(uploaded.scanStatus).toBe("QUARANTINED");
    await expect(service.assertReadyForUse(uploaded.id, "trainee-1")).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(service.getDownload(uploaded.id, "supervisor-1", ["SCIENTIFIC_SUPERVISOR"]))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects infected files and removes their private object", async () => {
    scanResult = "INFECTED";
    await expect(service.upload(pdf(), "trainee-1")).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(storedFiles.size).toBe(0);
    expect([...rows.values()][0]?.scanStatus).toBe("REJECTED");
  });

  it("blocks downloads by users outside the uploader's assigned supervisor scope", async () => {
    const uploaded = await service.upload(pdf(), "trainee-1");
    await expect(service.getDownload(uploaded.id, "unassigned-supervisor", ["SCIENTIFIC_SUPERVISOR"]))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("exposes only scanned content to the documents module's publication policy", async () => {
    const uploaded = await service.upload(pdf(), "supervisor-1");
    await expect(service.getReadyFileForLibrary(uploaded.id))
      .resolves.toMatchObject({ name: "research-report.pdf", mimeType: "application/pdf" });

    scanResult = "UNAVAILABLE";
    const quarantined = await service.upload(pdf(), "supervisor-1");
    await expect(service.getReadyFileForLibrary(quarantined.id))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects files above the configured upload limit", async () => {
    process.env.FILE_MAX_BYTES = "5";
    await expect(service.upload(pdf(), "trainee-1")).rejects.toMatchObject({ code: "FILE_TOO_LARGE" });
  });

  it("CHG-FILES persists only metadata and the exact storage location, never uploaded bytes", async () => {
    vi.mocked(storage.getUploadLocation).mockReturnValue({ storageProvider: "S3", bucket: "private-reports" });
    const uploaded = await service.upload(pdf(), "trainee-1");
    expect(rows.get(uploaded.id)).toMatchObject({ storageProvider: "S3", bucket: "private-reports", fileSizeBytes: 6n });
    expect(rows.get(uploaded.id)).not.toHaveProperty("buffer");
    expect(rows.get(uploaded.id)).not.toHaveProperty("content");
    await service.getDownload(uploaded.id, "trainee-1", []);
    expect(storage.open).toHaveBeenCalledWith(expect.any(String), { storageProvider: "S3", bucket: "private-reports" });
  });

  it("CHG-FILES removes the private object when metadata persistence fails", async () => {
    vi.mocked(objects.create).mockRejectedValue(new Error("database unavailable"));
    await expect(service.upload(pdf(), "trainee-1")).rejects.toThrow("database unavailable");
    expect(storedFiles.size).toBe(0);
    expect(storage.remove).toHaveBeenCalledOnce();
  });

  it("CHG-FILES denies a revoked manager and bank-only director without a parent-file grant", async () => {
    const uploaded = await service.upload(pdf(), "trainee-1");
    vi.mocked(access.canDownload).mockResolvedValue(false);
    for (const role of ["SCIENTIFIC_SUPERVISOR", "PROVINCIAL_DIRECTOR", "TRACKING_DIRECTOR", "SYSTEM_ADMIN"]) {
      await expect(service.getDownload(uploaded.id, "other-user", [role])).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  });

  it("CHG-FILES accepts an authorized case-only collaborator through its attached parent", async () => {
    const uploaded = await service.upload(pdf(), "trainee-1");
    vi.mocked(access.canDownload).mockResolvedValue(true);
    await expect(service.getDownload(uploaded.id, "case-collaborator", ["SCIENTIFIC_SUPERVISOR"]))
      .resolves.toMatchObject({ name: "research-report.pdf" });
    expect(access.canDownload).toHaveBeenCalledWith(uploaded.id, "case-collaborator", ["SCIENTIFIC_SUPERVISOR"]);
  });

  it("CHG-FILES rejects a forged byte count before writing the object", async () => {
    await expect(service.upload({ ...pdf(), size: 1 }, "trainee-1")).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(storage.write).not.toHaveBeenCalled();
  });

  it("CHG-FILES leaves scanner exceptions quarantined and recoverable", async () => {
    vi.mocked(scanner.scan).mockRejectedValueOnce(new Error("scanner disconnected"));
    const uploaded = await service.upload(pdf(), "trainee-1");
    expect(uploaded.scanStatus).toBe("QUARANTINED");
    await expect(service.getDownload(uploaded.id, "trainee-1", [])).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service.rescan(uploaded.id, "trainee-1")).resolves.toMatchObject({ scanStatus: "AVAILABLE" });
  });

  it("CHG-FILES cleans up a private write that failed after partially storing bytes", async () => {
    vi.mocked(storage.write).mockImplementationOnce(async (key, contents) => {
      storedFiles.set(key, contents);
      throw new Error("write interrupted");
    });
    await expect(service.upload(pdf(), "trainee-1")).rejects.toThrow("write interrupted");
    expect(storedFiles.size).toBe(0);
    expect(objects.create).not.toHaveBeenCalled();
  });
});
