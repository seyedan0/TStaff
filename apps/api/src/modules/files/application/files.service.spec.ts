import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { Readable } from "node:stream";
import { FilesService } from "./files.service.js";
import type { AssignmentsService } from "../../assignments/application/assignments.service.js";
import type {
  FileScanStatus,
  PrivateFileStoragePort,
  StoredObjectRecord,
  StoredObjectRepositoryPort,
  VirusScannerPort,
  VirusScanResult,
} from "./ports/files.ports.js";

describe("FilesService (FR-016, FR-058, AT-05, AT-30)", () => {
  let service: FilesService;
  let rows: Map<string, StoredObjectRecord>;
  let storedFiles: Map<string, Buffer>;
  let scanResult: VirusScanResult;
  let assignments: Pick<AssignmentsService, "isSupervisorAssignedToUser">;
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
    assignments = { isSupervisorAssignedToUser: vi.fn(async (ownerId, supervisorId) => ownerId === "trainee-1" && supervisorId === "supervisor-1") };

    const objects: StoredObjectRepositoryPort = {
      create: vi.fn(async (input) => { rows.set(input.id, { ...input }); }),
      findById: vi.fn(async (id) => rows.get(id) ?? null),
      updateScanStatus: vi.fn(async (id, scanStatus: FileScanStatus, isVirusScanned) => {
        const existing = rows.get(id);
        if (existing) rows.set(id, { ...existing, scanStatus, isVirusScanned });
      }),
    };
    const storage: PrivateFileStoragePort = {
      write: vi.fn(async (key, contents) => { storedFiles.set(key, Buffer.from(contents)); }),
      read: vi.fn(async (key) => storedFiles.get(key) ?? Buffer.alloc(0)),
      open: vi.fn((key) => Readable.from([storedFiles.get(key) ?? Buffer.alloc(0)])),
      remove: vi.fn(async (key) => { storedFiles.delete(key); }),
    };
    const scanner: VirusScannerPort = { scan: vi.fn(async () => scanResult) };
    service = new FilesService(objects, storage, scanner, assignments as AssignmentsService);
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
});
