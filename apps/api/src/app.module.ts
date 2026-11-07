import { Module } from '@nestjs/common';
import { PrismaModule } from './platform/prisma/prisma.module.js';
import { HealthModule } from './platform/health/health.module.js';
import { IdentityModule } from './modules/identity/identity.module.js';
import { ApplicantsModule } from './modules/applicants/applicants.module.js';
import { OrganizationModule } from './modules/organization/organization.module.js';
import { AuthorizationModule } from './modules/authorization/authorization.module.js';
import { AssignmentsModule } from './modules/assignments/assignments.module.js';
import { ResearchModule } from './modules/research/research.module.js';
import { ResourcesModule } from './modules/resources/resources.module.js';
import { ReviewsModule } from './modules/reviews/reviews.module.js';
import { ScenariosModule } from './modules/scenarios/scenarios.module.js';
import { DocumentsModule } from './modules/documents/documents.module.js';
import { FilesModule } from './modules/files/files.module.js';
import { MessagingModule } from './modules/messaging/messaging.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { ArchivalModule } from './modules/archival/archival.module.js';
import { ReportingModule } from './modules/reporting/reporting.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';

@Module({
  imports: [
    // Core Platform Modules
    PrismaModule,
    HealthModule,

    // 17 Domain Feature Modules
    IdentityModule,
    ApplicantsModule,
    OrganizationModule,
    AuthorizationModule,
    AssignmentsModule,
    ResearchModule,
    ResourcesModule,
    ReviewsModule,
    ScenariosModule,
    DocumentsModule,
    FilesModule,
    MessagingModule,
    NotificationsModule,
    AuditModule,
    ArchivalModule,
    ReportingModule,
    SettingsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
