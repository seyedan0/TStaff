import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenException, UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { DocumentsController } from "./documents.controller.js";
import { DocumentsService } from "../application/documents.service.js";
import { StageGuard } from "../../../platform/security/stage.guard.js";

function contextFor(
  handler: Function,
  headers: Record<string, string>,
): { context: ExecutionContext; request: { headers: Record<string, string>; user?: { id: string } } } {
  const request = { headers };
  return {
    request,
    context: {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => handler,
      getClass: () => DocumentsController,
    } as unknown as ExecutionContext,
  };
}

describe("DocumentsController authorization (FR-006, FR-007, AT-35, AT-36, AT-38)", () => {
  const documents = {
    listPublished: vi.fn(async () => []),
    listManaged: vi.fn(async () => []),
    getPublished: vi.fn(async (id: string) => ({ id })),
    getDownload: vi.fn(async () => ({ stream: null, name: "guide.pdf", mimeType: "application/pdf" })),
    createDocument: vi.fn(),
    createVersion: vi.fn(),
    publishVersion: vi.fn(async () => ({ id: "document-1" })),
    archiveDocument: vi.fn(async () => ({ id: "document-1", archivedAt: new Date() })),
    markRead: vi.fn(async () => ({ readAt: new Date() })),
  };
  const controller = new DocumentsController(documents as unknown as DocumentsService);
  const reflector = new Reflector();

  beforeEach(() => vi.stubEnv("NODE_ENV", "test"));
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("requires an authenticated session for the library catalog (AT-35)", async () => {
    const guard = new StageGuard(reflector);
    const unauthenticated = contextFor(DocumentsController.prototype.listDocuments, {});
    await expect(guard.canActivate(unauthenticated.context)).rejects.toThrow(UnauthorizedException);

    const authenticated = contextFor(DocumentsController.prototype.listDocuments, {
      "x-user-id": "reader-1",
      "x-user-stage": "APPRENTICE",
    });
    await expect(guard.canActivate(authenticated.context)).resolves.toBe(true);
    await controller.listDocuments(authenticated.request as never);
    expect(documents.listPublished).toHaveBeenCalledWith("reader-1");
  });

  it("blocks non-scientific roles from publishing and archiving (AT-35)", async () => {
    const guard = new StageGuard(reflector);
    for (const handler of [
      DocumentsController.prototype.publishVersion,
      DocumentsController.prototype.archiveDocument,
    ]) {
      const context = contextFor(handler, {
        "x-user-id": "admin-1",
        "x-user-stage": "INTERN",
        "x-user-role": "SYSTEM_ADMIN",
      });
      await expect(guard.canActivate(context.context)).rejects.toThrow(ForbiddenException);
    }
    expect(documents.publishVersion).not.toHaveBeenCalled();
    expect(documents.archiveDocument).not.toHaveBeenCalled();
  });

  it("allows a scientific supervisor to publish and archive (AT-35)", async () => {
    const guard = new StageGuard(reflector);
    const headers = {
      "x-user-id": "supervisor-1",
      "x-user-stage": "INTERN",
      "x-user-role": "SCIENTIFIC_SUPERVISOR",
    };
    const publishContext = contextFor(DocumentsController.prototype.publishVersion, headers);
    await expect(guard.canActivate(publishContext.context)).resolves.toBe(true);
    await controller.publishVersion("document-1", "version-1", { isRequired: true });
    const archiveContext = contextFor(DocumentsController.prototype.archiveDocument, headers);
    await expect(guard.canActivate(archiveContext.context)).resolves.toBe(true);
    await controller.archiveDocument("document-1");
    expect(documents.publishVersion).toHaveBeenCalledWith("document-1", "version-1", true);
    expect(documents.archiveDocument).toHaveBeenCalledWith("document-1");
  });

  it("lets only apprentices mark study progress (AT-36)", async () => {
    const guard = new StageGuard(reflector);
    const intern = contextFor(DocumentsController.prototype.markRead, {
      "x-user-id": "intern-1",
      "x-user-stage": "INTERN",
    });
    await expect(guard.canActivate(intern.context)).rejects.toThrow(ForbiddenException);
    const apprentice = contextFor(DocumentsController.prototype.markRead, {
      "x-user-id": "apprentice-1",
      "x-user-stage": "APPRENTICE",
    });
    await expect(guard.canActivate(apprentice.context)).resolves.toBe(true);
    await controller.markRead("document-1", "version-1", apprentice.request as never);
    expect(documents.markRead).toHaveBeenCalledWith("apprentice-1", "document-1", "version-1");
  });
});
