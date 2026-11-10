import {
  Controller, Get, Inject, Param, Post, Req, Res, UploadedFile, UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { FilesService } from "../application/files.service.js";
import { StageGuard } from "../../../platform/security/stage.guard.js";

const maxFileSize = Number(process.env.FILE_MAX_BYTES) || 25 * 1024 * 1024;

@ApiTags("Files")
@Controller("files")
@UseGuards(StageGuard)
export class FilesController {
  constructor(@Inject(FilesService) private readonly files: FilesService) {}

  @Post()
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: maxFileSize, files: 1 } }))
  async upload(@UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer }, @Req() request: any) {
    return this.files.upload(file, request.user.id);
  }

  @Post(":id/rescan")
  async rescan(@Param("id") id: string, @Req() request: any) {
    return this.files.rescan(id, request.user.id);
  }

  @Get(":id/download")
  async download(@Param("id") id: string, @Req() request: any, @Res() response: Response) {
    const roles: string[] = request.user.roles ?? (request.user.role ? [request.user.role] : []);
    const file = await this.files.getDownload(id, request.user.id, roles);
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Content-Type", file.mimeType);
    response.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);
    file.stream.on("error", () => {
      if (!response.headersSent) response.status(404).end();
      else response.destroy();
    });
    file.stream.pipe(response);
  }
}
