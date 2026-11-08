import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  CreateLibraryDocumentDtoSchema,
  CreateLibraryDocumentVersionDtoSchema,
  PublishLibraryDocumentVersionDtoSchema,
} from "@tstaff/contracts";
import type { Request, Response } from "express";
import {
  RequireRoles,
  RequireStage,
  StageGuard,
} from "../../../platform/security/stage.guard.js";
import { DocumentsService, type UploadedLibraryDocumentFile } from "../application/documents.service.js";

const maxFileSize = Number(process.env.FILE_MAX_BYTES) || 25 * 1024 * 1024;

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@ApiTags("Documents (کتابخانه اسناد آموزشی)")
@Controller("documents")
@UseGuards(StageGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: "فهرست نسخه‌های جاری و منتشرشده کتابخانه (FR-006, FR-007)" })
  async listDocuments(@Req() request: AuthenticatedRequest) {
    return this.documentsService.listPublished(request.user.id);
  }

  @Get("management")
  @RequireStage("INTERN")
  @RequireRoles("SCIENTIFIC_SUPERVISOR")
  @ApiOperation({ summary: "مدیریت نسخه‌های کتابخانه توسط مدیر علمی" })
  async listManagedDocuments() {
    return this.documentsService.listManaged();
  }

  @Get(":id")
  @ApiOperation({ summary: "جزئیات نسخه جاری منتشرشده کتابخانه" })
  async getDocument(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return this.documentsService.getPublished(id, request.user.id);
  }

  @Get(":id/download")
  @ApiOperation({ summary: "دریافت فایل نسخه جاریِ منتشرشده و پاک‌اسکن‌شده" })
  async download(@Param("id") id: string, @Req() request: AuthenticatedRequest, @Res() response: Response) {
    await this.documentsService.getPublished(id, request.user.id);
    const file = await this.documentsService.getDownload(id);
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Content-Type", file.mimeType);
    response.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);
    file.stream.on("error", () => response.status(404).end());
    file.stream.pipe(response);
  }

  @Post()
  @RequireStage("INTERN")
  @RequireRoles("SCIENTIFIC_SUPERVISOR")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: maxFileSize, files: 1 } }))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "بارگذاری سند جدید در کتابخانه" })
  async createDocument(
    @Body() body: unknown,
    @UploadedFile() file: UploadedLibraryDocumentFile | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!file) throw new BadRequestException("فایل PDF یا DOCX الزامی است");
    return this.documentsService.createDocument(
      CreateLibraryDocumentDtoSchema.parse(parseMultipartMetadata(body)),
      file,
      request.user.id,
    );
  }

  @Post(":documentId/versions")
  @RequireStage("INTERN")
  @RequireRoles("SCIENTIFIC_SUPERVISOR")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: maxFileSize, files: 1 } }))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "بارگذاری نسخه تازه برای سند کتابخانه" })
  async createVersion(
    @Param("documentId") documentId: string,
    @Body() body: unknown,
    @UploadedFile() file: UploadedLibraryDocumentFile | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!file) throw new BadRequestException("فایل PDF یا DOCX الزامی است");
    return this.documentsService.createVersion(
      documentId,
      CreateLibraryDocumentVersionDtoSchema.parse(parseMultipartMetadata(body)),
      file,
      request.user.id,
    );
  }

  @Post(":documentId/versions/:versionId/publish")
  @RequireStage("INTERN")
  @RequireRoles("SCIENTIFIC_SUPERVISOR")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "انتشار نسخه پاک‌اسکن‌شده کتابخانه" })
  async publishVersion(
    @Param("documentId") documentId: string,
    @Param("versionId") versionId: string,
    @Body() body: unknown,
  ) {
    const validated = PublishLibraryDocumentVersionDtoSchema.parse(body);
    return this.documentsService.publishVersion(documentId, versionId, validated.isRequired);
  }

  @Post(":documentId/archive")
  @RequireStage("INTERN")
  @RequireRoles("SCIENTIFIC_SUPERVISOR")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "بایگانی سند بدون حذف نسخه‌ها" })
  async archiveDocument(@Param("documentId") documentId: string) {
    return this.documentsService.archiveDocument(documentId);
  }

  @Post(":documentId/versions/:versionId/read")
  @RequireStage("APPRENTICE")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "ثبت مطالعه نسخه جاری توسط کارآموز (AT-36)" })
  async markRead(
    @Param("documentId") documentId: string,
    @Param("versionId") versionId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.documentsService.markRead(request.user.id, documentId, versionId);
  }
}

function parseMultipartMetadata(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return {};
  const fields = body as Record<string, unknown>;
  const isRequired = fields.isRequired;
  if (isRequired === "true") return { ...fields, isRequired: true };
  if (isRequired === "false") return { ...fields, isRequired: false };
  return fields;
}
