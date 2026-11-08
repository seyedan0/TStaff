import { Module } from "@nestjs/common";
import { DocumentsController } from "./presentation/documents.controller.js";
import { DocumentsService } from "./application/documents.service.js";
import { DOCUMENTS_REPOSITORY } from "./application/ports/documents.ports.js";
import { PrismaDocumentsRepository } from "./infrastructure/prisma-documents.repository.js";
import { FilesModule } from "../files/files.module.js";

@Module({
  imports: [FilesModule],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    { provide: DOCUMENTS_REPOSITORY, useClass: PrismaDocumentsRepository },
  ],
  exports: [DocumentsService],
})
export class DocumentsModule {}
