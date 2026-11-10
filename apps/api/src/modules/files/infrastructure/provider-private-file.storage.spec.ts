import { afterEach, describe, expect, it, vi } from "vitest";
import { Readable } from "node:stream";
import { ProviderPrivateFileStorage } from "./provider-private-file.storage.js";
import { S3PrivateFileStorage } from "./s3-private-file.storage.js";
import { LocalPrivateFileStorage } from "./local-private-file.storage.js";

const initialEnvironment = { ...process.env };
afterEach(() => { process.env = { ...initialEnvironment }; });

describe("CHG-FILES storage routing (FR-014 / AT-18)", () => {
  it("reads historical local files using their persisted provider after S3 becomes default", async () => {
    process.env.FILE_STORAGE_PROVIDER = "S3";
    process.env.S3_BUCKET = "new-private-bucket";
    const local = { open: vi.fn(() => Readable.from(["legacy"])) };
    const s3 = { open: vi.fn(), getUploadLocation: () => ({ storageProvider: "S3", bucket: process.env.S3_BUCKET }) };
    const storage = new ProviderPrivateFileStorage(local as unknown as LocalPrivateFileStorage, s3 as unknown as S3PrivateFileStorage);
    expect(storage.getUploadLocation()).toEqual({ storageProvider: "S3", bucket: "new-private-bucket" });
    await storage.open("legacy.pdf", { storageProvider: "LOCAL", bucket: "private-research" });
    expect(local.open).toHaveBeenCalledWith("legacy.pdf", { storageProvider: "LOCAL", bucket: "private-research" });
    expect(s3.open).not.toHaveBeenCalled();
  });

  it("fails closed for unknown providers and unconfigured production storage", () => {
    const storage = new ProviderPrivateFileStorage({} as LocalPrivateFileStorage, {} as S3PrivateFileStorage);
    process.env.FILE_STORAGE_PROVIDER = "PUBLIC";
    expect(() => storage.getUploadLocation()).toThrow();
    delete process.env.FILE_STORAGE_PROVIDER;
    process.env.NODE_ENV = "production";
    expect(() => storage.getUploadLocation()).toThrow();
  });

  it("writes S3 objects privately to the persisted bucket and propagates failures", async () => {
    process.env.S3_SERVER_SIDE_ENCRYPTION = "AES256";
    const send = vi.fn(async (_command: unknown) => ({}));
    const storage = new S3PrivateFileStorage({ send } as never);
    const location = { storageProvider: "S3" as const, bucket: "private-a" };
    await storage.write("report.pdf", Buffer.from("%PDF-report"), location);
    expect(send.mock.calls[0]?.[0]).toMatchObject({ input: {
      Bucket: "private-a", Key: "report.pdf", ContentType: "application/pdf",
      ServerSideEncryption: "AES256",
    } });
    expect((send.mock.calls[0]?.[0] as { input: object }).input).not.toHaveProperty("ACL");
    send.mockRejectedValueOnce(new Error("storage unavailable"));
    await expect(storage.write("other.pdf", Buffer.from("%PDF-report"), location)).rejects.toThrow("storage unavailable");
  });

  it("streams and removes S3 objects using their historical bucket", async () => {
    const content = Readable.from([Buffer.from("%PDF-historical")]);
    const send = vi.fn().mockResolvedValueOnce({ Body: content }).mockResolvedValueOnce({});
    const storage = new S3PrivateFileStorage({ send } as never);
    const location = { storageProvider: "S3" as const, bucket: "historical-bucket" };
    expect(await storage.open("report.pdf", location)).toBe(content);
    await storage.remove("report.pdf", location);
    expect(send).toHaveBeenNthCalledWith(1, expect.objectContaining({ input: { Bucket: "historical-bucket", Key: "report.pdf" } }));
    expect(send).toHaveBeenNthCalledWith(2, expect.objectContaining({ input: { Bucket: "historical-bucket", Key: "report.pdf" } }));
  });
});
