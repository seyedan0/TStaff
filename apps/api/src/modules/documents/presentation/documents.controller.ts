import { Controller, Get, Param, NotFoundException } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { DocumentsService } from "../application/documents.service.js";

@ApiTags("Documents (شیوه‌نامه‌ها و اسناد آموزشی)")
@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({
    summary: "فهرست شیوه‌نامه‌های فعال برای کارآموزان (FR-006, FR-007)",
  })
  async listDocuments() {
    return this.documentsService.listGuidelines();
  }

  @Get(":id")
  @ApiOperation({ summary: "مشاهده متادیتای شیوه‌نامه" })
  async getDocument(@Param("id") id: string) {
    const doc = await this.documentsService.getById(id);
    if (!doc) {
      throw new NotFoundException(`سند با شناسه ${id} یافت نشد`);
    }
    return doc;
  }
}
