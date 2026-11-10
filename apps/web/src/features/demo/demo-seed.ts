import {
  IRAN_PROVINCES,
  type ApplicantStatus,
  type AuditEventDto,
  type ArchiveJobDto,
  type ConversationContactDto,
  type DirectoryUserDto,
  type LibraryDocumentDto,
  type MessageDto,
  type PublishedLibraryDocumentDto,
  type ResearchChangeRequestDto,
  type ResourceBankItem,
  type ScenarioDecisionDto,
  type ScenarioVersionDto,
  type StudyDocumentSnapshot,
  type StudyEvaluationStatus,
  type SupervisorHistoryEvent,
  type SystemRole,
  type SystemSetting,
  type UserStage,
} from "@tstaff/contracts";
import type { ApplicantItem, CurrentUser, ResearchCaseItem, ResourceItem } from "../../shared/types.js";

const createdAt = "2026-11-01T09:00:00.000Z";
const publishedAt = "2026-10-25T09:00:00.000Z";
const markaziProvinceId = IRAN_PROVINCES[27]!.id; // مرکزی
const tehranProvinceId = IRAN_PROVINCES[7]!.id; // تهران
export const DEMO_SUPERVISOR_ID = "10000000-0000-4000-8000-000000000001";
export const DEMO_COLLAB_SUPERVISOR_ID = "10000000-0000-4000-8000-000000000002";
export const DEMO_PROVINCIAL_ID = "20000000-0000-4000-8000-000000000005";

export interface DemoPersona {
  id: string;
  label: string;
  status: string;
  summary: string;
  user: CurrentUser;
}

function makeUser(
  id: string,
  fullName: string,
  phoneNumber: string,
  role: SystemRole,
  stage: UserStage,
  provinceId?: string,
): CurrentUser {
  return {
    id,
    fullName,
    phoneNumber,
    role,
    roles: [role],
    stage,
    isSuspended: false,
    ...(provinceId ? { provinceId } : {}),
  };
}

export const DEMO_PERSONAS: readonly DemoPersona[] = [
  {
    id: "apprentice-reading",
    label: "نیلوفر احمدی",
    status: "کارآموز · مطالعه منابع",
    summary: "یک سند الزامی را خوانده و برای تکمیل منابع به کتابخانه می‌رود.",
    user: makeUser("20000000-0000-4000-8000-000000000001", "نیلوفر احمدی", "09000000001", "APPRENTICE", "APPRENTICE", markaziProvinceId),
  },
  {
    id: "apprentice-pending",
    label: "آرمان رضایی",
    status: "کارآموز · در انتظار ارزیابی",
    summary: "نسخه‌های الزامی را خوانده؛ درخواستش در کارتابل مدیر علمی است.",
    user: makeUser("20000000-0000-4000-8000-000000000002", "آرمان رضایی", "09000000002", "APPRENTICE", "APPRENTICE", markaziProvinceId),
  },
  {
    id: "intern-active",
    label: "سارا کریمی",
    status: "کارورز · فعال",
    summary: "پس از تأیید مدیر علمی ارتقا گرفته و پرونده پژوهشی فعال دارد.",
    user: makeUser("20000000-0000-4000-8000-000000000003", "سارا کریمی", "09000000003", "INTERN", "INTERN", markaziProvinceId),
  },
  {
    id: "scientific-supervisor",
    label: "دکتر مریم موسوی",
    status: "مدیر علمی · کارتابل پژوهشگران",
    summary: "می‌تواند درخواست‌های ارزیابی، مراحل پژوهش و سناریوها را بررسی کند.",
    user: makeUser(DEMO_SUPERVISOR_ID, "دکتر مریم موسوی", "09000000004", "SCIENTIFIC_SUPERVISOR", "INTERN", tehranProvinceId),
  },
  {
    id: "provincial-director",
    label: "دکتر علی رضایی",
    status: "مدیر استانی · پذیرش و بانک منابع",
    summary: "پرونده‌های پذیرش و منابع استان مرکزی را مدیریت می‌کند.",
    user: makeUser(DEMO_PROVINCIAL_ID, "دکتر علی رضایی", "09000000005", "PROVINCIAL_DIRECTOR", "INTERN", markaziProvinceId),
  },
  {
    id: "tracking-director",
    label: "مهندس محمد علوی",
    status: "مدیر پیگیری · نظارت و انتساب",
    summary: "پایش شبکه، بانک منابع کشوری، انتساب‌ها و قلمرو استان‌ها.",
    user: makeUser("20000000-0000-4000-8000-000000000006", "مهندس محمد علوی", "09000000006", "TRACKING_DIRECTOR", "INTERN"),
  },
  {
    id: "support-director",
    label: "مهسا نوری",
    status: "مدیر پشتیبانی · تیکت و کاربران",
    summary: "رسیدگی به تیکت‌ها و وضعیت فعال/تعلیق حساب کاربران.",
    user: makeUser("20000000-0000-4000-8000-000000000007", "مهسا نوری", "09000000007", "SUPPORT_DIRECTOR", "INTERN"),
  },
  {
    id: "system-admin",
    label: "دکتر علیرضا راد",
    status: "مدیر سامانه · تنظیمات و سلامت",
    summary: "مهلت مراحل، بایگانی، مدیران و وضعیت سرویس.",
    user: makeUser("20000000-0000-4000-8000-000000000008", "دکتر علیرضا راد", "09000000008", "SYSTEM_ADMIN", "INTERN"),
  },
];

const versionRows = [
  {
    documentId: "40000000-0000-4000-8000-000000000001",
    versionId: "41000000-0000-4000-8000-000000000001",
    storedObjectId: "42000000-0000-4000-8000-000000000001",
    title: "راهنمای مطالعه و انتخاب موضوع پژوهش",
    description: "گام‌های مطالعه منابع، محدودکردن مسئله و ثبت پرسش اولیه پژوهش.",
    category: "راهنمای پژوهش",
    fileName: "research-topic-guide.md",
    assetPath: "/demo-documents/research-topic-guide.md",
    isRequired: true,
  },
  {
    documentId: "40000000-0000-4000-8000-000000000002",
    versionId: "41000000-0000-4000-8000-000000000002",
    storedObjectId: "42000000-0000-4000-8000-000000000002",
    title: "شیوه‌نامه نگارش گزارش پژوهشی",
    description: "ساختار پیشنهادی گزارش، ثبت شواهد و اصول ارجاع‌دهی.",
    category: "شیوه‌نامه",
    fileName: "research-report-guide.md",
    assetPath: "/demo-documents/research-report-guide.md",
    isRequired: true,
  },
  {
    documentId: "40000000-0000-4000-8000-000000000003",
    versionId: "41000000-0000-4000-8000-000000000003",
    storedObjectId: "42000000-0000-4000-8000-000000000003",
    title: "راهنمای محرمانگی و حفاظت از داده‌ها",
    description: "نکات پایه برای نگهداری امن اطلاعات و حذف شناسه‌های غیرضروری.",
    category: "حفاظت از داده",
    fileName: "data-privacy-guide.md",
    assetPath: "/demo-documents/data-privacy-guide.md",
    isRequired: false,
  },
] as const;

export type DemoDocumentSeed = (typeof versionRows)[number];
export const DEMO_DOCUMENT_SEEDS: readonly DemoDocumentSeed[] = versionRows;

export const DEMO_PUBLISHED_DOCUMENTS: PublishedLibraryDocumentDto[] = versionRows.map((item) => ({
  id: item.documentId,
  currentVersion: {
    id: item.versionId,
    version: 1,
    title: item.title,
    description: item.description,
    category: item.category,
    isRequired: item.isRequired,
    status: "PUBLISHED",
    publishedAt,
    isRead: false,
    fileName: item.fileName,
    scanStatus: "AVAILABLE",
  },
}));

export const DEMO_MANAGED_DOCUMENTS: LibraryDocumentDto[] = versionRows.map((item) => {
  const currentVersion = {
    id: item.versionId,
    version: 1,
    title: item.title,
    description: item.description,
    category: item.category,
    isRequired: item.isRequired,
    status: "PUBLISHED" as const,
    publishedAt,
    isRead: false,
    fileName: item.fileName,
    scanStatus: "AVAILABLE" as const,
    uploadedById: DEMO_SUPERVISOR_ID,
    storedObjectId: item.storedObjectId,
  };
  return { id: item.documentId, archivedAt: null, createdAt, currentVersion, versions: [currentVersion] };
});

function snapshotFor(seed: DemoDocumentSeed, readAt = createdAt): StudyDocumentSnapshot {
  return {
    documentId: seed.documentId,
    versionId: seed.versionId,
    title: seed.title,
    category: seed.category,
    version: 1,
    isRequired: seed.isRequired,
    readAt,
  };
}

export const DEMO_PENDING_EVALUATION: StudyEvaluationStatus = {
  id: "50000000-0000-4000-8000-000000000001",
  userId: "20000000-0000-4000-8000-000000000002",
  status: "PENDING",
  notes: "مطالعه منابع الزامی را به پایان رسانده‌ام.",
  completedDocuments: DEMO_DOCUMENT_SEEDS.map((seed) => snapshotFor(seed)),
  createdAt: "2026-11-02T09:00:00.000Z",
  updatedAt: "2026-11-02T09:00:00.000Z",
};

function applicant(
  id: string,
  fullName: string,
  phoneNumber: string,
  status: ApplicantStatus,
  nationalId: string,
  notes: string,
  overrides: Partial<ApplicantItem> = {},
): ApplicantItem {
  return {
    id,
    fullName,
    nationalId,
    phoneNumber,
    age: 24,
    provinceId: markaziProvinceId,
    education: "کارشناسی ارشد",
    educationLevel: "کارشناسی ارشد",
    fieldOfStudy: "علوم اجتماعی",
    status,
    notes,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

export const DEMO_APPLICANTS: ApplicantItem[] = [
  applicant("60000000-0000-4000-8000-000000000001", "نیلوفر احمدی", "09000000001", "APPROVED", "0000000001", "حساب نمونه کارآموز پس از تأیید علمی فعال شده است."),
  applicant("60000000-0000-4000-8000-000000000002", "پارسا محمدی", "09000000016", "IN_REVIEW", "0000000002", "پرونده در انتظار تصمیم علمی است."),
  applicant("60000000-0000-4000-8000-000000000003", "هستی مرادی", "09000000017", "PENDING", "0000000003", "پیش‌نویس نمونه مدیر استانی."),
  applicant("60000000-0000-4000-8000-000000000004", "کیان رستگار", "09000000018", "REJECTED", "0000000004", "پرونده ردشده حساب کاربری ندارد.", { rejectionReason: "تکمیل پیش‌نیازهای علمی توصیه می‌شود." }),
];

const demoCaseId = "80000000-0000-4000-8000-000000000001";
const sourcesStageId = "81000000-0000-4000-8000-000000000001";
const explanationStageId = "81000000-0000-4000-8000-000000000002";
const prescriptionStageId = "81000000-0000-4000-8000-000000000003";
const scenarioStageId = "81000000-0000-4000-8000-000000000004";

export const DEMO_RESEARCH_CASES: ResearchCaseItem[] = [{
  id: demoCaseId,
  code: "TS-DEMO-001",
  title: "تقویت مشارکت دانش‌آموزان در فعالیت‌های مدرسه",
  subject: "شناسایی راهکارهای افزایش مشارکت دانش‌آموزان در برنامه‌های داوطلبانه",
  researcherId: "20000000-0000-4000-8000-000000000003",
  status: "SCENARIO_STAGE",
  version: 4,
  canReview: true,
  stages: [
    { id: sourcesStageId, stageType: "SOURCES", status: "APPROVED", version: 1 },
    { id: explanationStageId, stageType: "EXPLANATION", status: "APPROVED", version: 1 },
    { id: prescriptionStageId, stageType: "PRESCRIPTION", status: "APPROVED", version: 1 },
    { id: scenarioStageId, stageType: "SCENARIO", status: "SUBMITTED", version: 1 },
  ],
  supervisors: [{ id: "83000000-0000-4000-8000-000000000001", userId: DEMO_SUPERVISOR_ID, role: "MAIN_SUPERVISOR", isActive: true }],
  createdAt,
  updatedAt: "2026-11-07T11:30:00.000Z",
}];

export const DEMO_CASE_RESOURCES: ResourceItem[] = [{
  id: "84000000-0000-4000-8000-000000000001",
  researchCaseId: demoCaseId,
  type: "INDIVIDUAL",
  title: "آموزگار پایه ششم (نمونه)",
  description: "گفت‌وگوی نمونه درباره تجربه دانش‌آموزان در برنامه‌های گروهی مدرسه.",
  personAge: 38,
  position: "آموزگار",
  contactInfo: "09180001122",
  provinceId: markaziProvinceId,
  province: "مرکزی",
  county: "اراک",
  organization: { name: "دبستان شهید بهشتی", educationLevel: "دوره دوم ابتدایی", organizationType: "دولتی" },
  hasInterview: true,
  interview: {
    id: "85000000-0000-4000-8000-000000000001",
    resourceId: "84000000-0000-4000-8000-000000000001",
    intervieweeName: "آموزگار نمونه",
    intervieweeAge: 38,
    conductedAt: "2026-11-02T08:30:00.000Z",
    hasReport: true,
    reportsCount: 1,
    durationMinutes: 45,
    mode: "حضوری",
    location: "اراک",
    notes: "داده ساختگی برای نمایش پرونده در دمو.",
    latestReport: { id: "86000000-0000-4000-8000-000000000001", title: "گزارش گفت‌وگوی نمونه", version: 1 },
  },
}];

export const DEMO_STAGE_SUBMISSIONS: Record<string, Array<{
  id: string;
  version: number;
  content: string;
  status: string;
  submittedAt: string;
}>> = {
  [explanationStageId]: [{
    id: "87000000-0000-4000-8000-000000000001",
    version: 1,
    content: "پرسش پژوهش بر تجربه دانش‌آموزان از مشارکت داوطلبانه و عوامل تقویت‌کننده آن متمرکز است.",
    status: "APPROVED",
    submittedAt: "2026-11-04T10:00:00.000Z",
  }],
  [prescriptionStageId]: [{
    id: "87000000-0000-4000-8000-000000000002",
    version: 1,
    content: "پیشنهاد نمونه: فعالیت‌های کوتاه و دانش‌آموزمحور طراحی شود و بازخورد شرکت‌کنندگان پس از هر نوبت ثبت گردد.",
    status: "APPROVED",
    submittedAt: "2026-11-06T12:00:00.000Z",
  }],
};

const demoScenarioContent = JSON.stringify({
  audience: "STUDENT",
  province: "مرکزی",
  category: "مشارکت مدرسه‌ای",
  keywords: ["مشارکت", "فعالیت گروهی", "بازخورد"],
  implementationSteps: ["جمع‌آوری ایده‌ها", "تشکیل گروه‌های کوچک", "اجرای فعالیت", "ثبت بازخورد"],
});

export const DEMO_CASE_SCENARIOS: Array<{
  id: string;
  researchCaseId: string;
  version: number;
  title: string;
  summary: string;
  content: string;
  status: string;
  createdById: string;
  versions: ScenarioVersionDto[];
  decisions: ScenarioDecisionDto[];
}> = [{
  id: "88000000-0000-4000-8000-000000000001",
  researchCaseId: demoCaseId,
  version: 1,
  title: "باشگاه ایده‌های دانش‌آموزی",
  summary: "یک مدرسه برای هر ماه یک نشست کوتاه برگزار می‌کند تا دانش‌آموزان فعالیت داوطلبانه پیشنهاد دهند و نتیجه را گزارش کنند.",
  content: demoScenarioContent,
  status: "UNDER_REVIEW",
  createdById: "20000000-0000-4000-8000-000000000003",
  versions: [{
    version: 1,
    title: "باشگاه ایده‌های دانش‌آموزی",
    summary: "یک مدرسه برای هر ماه یک نشست کوتاه برگزار می‌کند تا دانش‌آموزان فعالیت داوطلبانه پیشنهاد دهند.",
    content: demoScenarioContent,
    status: "UNDER_REVIEW",
    createdById: "20000000-0000-4000-8000-000000000003",
    createdAt: "2026-11-07T11:30:00.000Z",
  }],
  decisions: [],
}];

export const DEMO_CHANGE_REQUESTS: ResearchChangeRequestDto[] = [];

export const DEMO_RESOURCE_BANK: ResourceBankItem[] = [
  {
    id: "84000000-0000-4000-8000-000000000001",
    fullName: "آموزگار پایه ششم (نمونه)",
    age: 38,
    position: "آموزگار",
    contactInfo: "09180001122",
    provinceId: markaziProvinceId,
    province: "مرکزی",
    county: "اراک",
    organization: { name: "دبستان شهید بهشتی", educationLevel: "ابتدایی", organizationType: "دولتی" },
    referrals: [],
    createdAt,
  },
  {
    id: "84000000-0000-4000-8000-000000000002",
    fullName: "حسین طاهری (نمونه)",
    age: 41,
    position: "مشاور تربیتی",
    contactInfo: "09123334455",
    provinceId: tehranProvinceId,
    province: "تهران",
    county: "تهران",
    organization: { name: "دبیرستان فرزانگان", educationLevel: "متوسطه", organizationType: "استعدادهای درخشان" },
    referrals: [{
      id: "89000000-0000-4000-8000-000000000001",
      recipientId: DEMO_PROVINCIAL_ID,
      status: "REFERRED",
      applicantId: null,
      createdAt: "2026-11-06T09:00:00.000Z",
    }],
    createdAt: "2026-11-03T10:00:00.000Z",
  },
];

export const DEMO_DIRECTORY_USERS: DirectoryUserDto[] = DEMO_PERSONAS.map((p) => ({
  id: p.user.id,
  fullName: p.user.fullName,
  phoneNumber: p.user.phoneNumber,
  stage: p.user.stage,
  role: p.user.role,
  roles: p.user.roles ?? [p.user.role],
  isActive: !p.user.isSuspended,
  provinceId: p.user.provinceId ?? null,
  createdAt,
}));

export const DEMO_SUPPORT_TICKETS = [
  {
    id: "71000000-0000-4000-8000-000000000001",
    userId: "20000000-0000-4000-8000-000000000001",
    subject: "سؤال درباره تکمیل مطالعه منابع",
    description: "پس از خواندن دومین سند، چه زمانی دکمه درخواست ارزیابی فعال می‌شود؟",
    status: "OPEN" as const,
    createdAt: "2026-11-05T10:00:00.000Z",
    updatedAt: "2026-11-05T10:00:00.000Z",
    userFullName: "نیلوفر احمدی",
    userPhone: "09000000001",
  },
];

export const DEMO_CONVERSATIONS = [
  {
    id: "72000000-0000-4000-8000-000000000001",
    type: "DIRECT_SUPERVISOR_TRAINEE",
    researchCaseId: demoCaseId,
    updatedAt: "2026-11-07T10:00:00.000Z",
    participantIds: [DEMO_SUPERVISOR_ID, "20000000-0000-4000-8000-000000000003"],
  },
];

export const DEMO_MESSAGES: MessageDto[] = [
  {
    id: "73000000-0000-4000-8000-000000000001",
    conversationId: "72000000-0000-4000-8000-000000000001",
    senderId: DEMO_SUPERVISOR_ID,
    content: "سلام سارا جان، نسخه پیش‌نویس سناریو را بررسی می‌کنم و تا عصر نتیجه را اعلام می‌کنم.",
    attachmentId: null,
    createdAt: "2026-11-07T10:00:00.000Z",
  },
];

export const DEMO_CONTACTS: ConversationContactDto[] = DEMO_PERSONAS
  .filter((p) => ["APPRENTICE", "INTERN", "SCIENTIFIC_SUPERVISOR"].includes(p.user.role))
  .map((p) => ({
    id: p.user.id,
    fullName: p.user.fullName,
    phoneNumber: p.user.phoneNumber,
    stage: p.user.stage,
    role: p.user.role,
  }));

export const DEMO_SETTINGS: SystemSetting[] = [
  { key: "deadline_days.SOURCES", value: "14", description: "مهلت مرحله ۱: منابع و مصاحبه‌ها (روز)", updatedAt: createdAt },
  { key: "deadline_days.EXPLANATION", value: "21", description: "مهلت مرحله ۲: تبیین مسئله (روز)", updatedAt: createdAt },
  { key: "deadline_days.PRESCRIPTION", value: "21", description: "مهلت مرحله ۳: تجویز راهکار (روز)", updatedAt: createdAt },
  { key: "deadline_days.SCENARIO", value: "14", description: "مهلت مرحله ۴: سناریونویسی (روز)", updatedAt: createdAt },
];

export const DEMO_ARCHIVE_JOBS: ArchiveJobDto[] = [];

export const DEMO_AUDIT_EVENTS: AuditEventDto[] = [
  {
    id: "74000000-0000-4000-8000-000000000001",
    aggregateType: "ResearchCase",
    aggregateId: demoCaseId,
    action: "SCENARIO_SUBMITTED",
    actorId: "20000000-0000-4000-8000-000000000003",
    payload: { code: "TS-DEMO-001", version: 4 },
    createdAt: "2026-11-07T11:30:00.000Z",
  },
];

export const DEMO_SUPERVISOR_HISTORY: SupervisorHistoryEvent[] = [
  {
    id: "74000000-0000-4000-8000-000000000001",
    aggregateType: "ResearchCase",
    aggregateId: demoCaseId,
    action: "REVIEW_DECISION_RECORDED",
    actorId: DEMO_SUPERVISOR_ID,
    actorName: "دکتر مریم موسوی",
    createdAt: "2026-11-06T12:30:00.000Z",
  },
];

export const DEMO_SCOPES = [
  { managerId: DEMO_PROVINCIAL_ID, provinceId: markaziProvinceId, assignedAt: createdAt, revokedAt: null as string | null },
];
