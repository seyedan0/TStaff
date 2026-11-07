import { Module } from "@nestjs/common";
import { DocumentsController } from "./presentation/documents.controller.js";
import { DocumentsService } from "./application/documents.service.js";

@Module({
  imports: [],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
