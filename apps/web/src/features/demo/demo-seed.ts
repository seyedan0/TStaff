import type {
  ApplicantStatus,
  LibraryDocumentDto,
  PublishedLibraryDocumentDto,
  StudyDocumentSnapshot,
  StudyEvaluationStatus,
  SystemRole,
  UserStage,
} from "@tstaff/contracts";
import type { ApplicantItem, CurrentUser, ResearchCaseItem, ResourceItem } from "../../shared/types.js";

const createdAt = "2026-11-01T09:00:00.000Z";
const publishedAt = "2026-10-25T09:00:00.000Z";
const supervisorId = "10000000-0000-4000-8000-000000000001";

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
    status: "کارآموز · مطالعه‌ی منابع",
    summary: "یک سند الزامی را خوانده و برای تکمیل منابع به کتابخانه می‌رود.",
    user: makeUser("20000000-0000-4000-8000-000000000001", "نیلوفر احمدی", "09000000001", "APPRENTICE", "APPRENTICE"),
  },
  {
    id: "apprentice-pending",
    label: "آرمان رضایی",
    status: "کارآموز · در انتظار ارزیابی",
    summary: "نسخه‌های الزامی را خوانده؛ درخواستش در کارتابل مدیر علمی است.",
    user: makeUser("20000000-0000-4000-8000-000000000002", "آرمان رضایی", "09000000002", "APPRENTICE", "APPRENTICE"),
  },
  {
    id: "intern-active",
    label: "سارا کریمی",
    status: "کارورز · فعال",
    summary: "پس از تأیید مدیر علمی ارتقا گرفته و منابع همچنان برایش در دسترس است.",
    user: makeUser("20000000-0000-4000-8000-000000000003", "سارا کریمی", "09000000003", "INTERN", "INTERN"),
  },
  {
    id: "scientific-supervisor",
    label: "دکتر مریم موسوی",
    status: "مدیر علمی · کارتابل ارزیابی",
    summary: "می‌تواند درخواست ارزیابی آرمان و نسخه‌های مطالعه‌شده را بررسی کند.",
    user: makeUser(supervisorId, "دکتر مریم موسوی", "09000000004", "SCIENTIFIC_SUPERVISOR", "INTERN"),
  },
  {
    id: "provincial-director",
    label: "دکتر علی رضایی",
    status: "مدیر استانی · پذیرش",
    summary: "چند پرونده‌ی نمونه در وضعیت‌های مختلف پذیرش را می‌بیند.",
    user: makeUser("20000000-0000-4000-8000-000000000005", "دکتر علی رضایی", "09000000005", "PROVINCIAL_DIRECTOR", "INTERN", "30000000-0000-4000-8000-000000000001"),
  },
];

const versionRows = [
  {
    documentId: "40000000-0000-4000-8000-000000000001",
    versionId: "41000000-0000-4000-8000-000000000001",
    storedObjectId: "42000000-0000-4000-8000-000000000001",
    title: "راهنمای مطالعه و انتخاب موضوع پژوهش",
    description: "گام‌های مطالعه‌ی منابع، محدودکردن مسئله و ثبت پرسش اولیه‌ی پژوهش.",
    category: "راهنمای پژوهش",
    fileName: "research-topic-guide.md",
    assetPath: "/demo-documents/research-topic-guide.md",
    isRequired: true,
  },
  {
    documentId: "40000000-0000-4000-8000-000000000002",
    versionId: "41000000-0000-4000-8000-000000000002",
    storedObjectId: "42000000-0000-4000-8000-000000000002",
    title: "شیوه‌نامه‌ی نگارش گزارش پژوهشی",
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
    uploadedById: supervisorId,
    storedObjectId: item.storedObjectId,
  };
  return { id: item.documentId, archivedAt: null, createdAt, currentVersion, versions: [currentVersion] };
});

export const DEMO_READ_VERSIONS: Record<string, string[]> = {
  "20000000-0000-4000-8000-000000000001": ["41000000-0000-4000-8000-000000000001"],
  "20000000-0000-4000-8000-000000000002": DEMO_DOCUMENT_SEEDS.map((document) => document.versionId),
  "20000000-0000-4000-8000-000000000003": [],
};

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
  notes: "مطالعه‌ی منابع الزامی را به پایان رسانده‌ام.",
  completedDocuments: DEMO_DOCUMENT_SEEDS.map((seed) => snapshotFor(seed)),
  createdAt,
  updatedAt: createdAt,
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
    provinceId: "30000000-0000-4000-8000-000000000001",
    education: "کارشناسی ارشد",
    fieldOfStudy: "علوم اجتماعی",
    status,
    notes,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

export const DEMO_APPLICANTS: ApplicantItem[] = [
  applicant("60000000-0000-4000-8000-000000000001", "نیلوفر احمدی", "09000000001", "APPROVED", "0000000001", "حساب نمونه‌ی کارآموز پس از تأیید علمی فعال شده است."),
  applicant("60000000-0000-4000-8000-000000000002", "پارسا محمدی", "09000000006", "IN_REVIEW", "0000000002", "پرونده در انتظار تصمیم علمی است."),
  applicant("60000000-0000-4000-8000-000000000003", "هستی مرادی", "09000000007", "PENDING", "0000000003", "پیش‌نویس نمونه‌ی مدیر استانی."),
  applicant("60000000-0000-4000-8000-000000000004", "کیان رستگار", "09000000008", "REJECTED", "0000000004", "پرونده‌ی ردشده حساب کاربری ندارد.", { rejectionReason: "تکمیل پیش‌نیازهای علمی توصیه می‌شود." }),
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
  status: "IN_PROGRESS",
  version: 4,
  stages: [
    { id: sourcesStageId, stageType: "SOURCES", status: "APPROVED", version: 1 },
    { id: explanationStageId, stageType: "EXPLANATION", status: "APPROVED", version: 1 },
    { id: prescriptionStageId, stageType: "PRESCRIPTION", status: "APPROVED", version: 1 },
    { id: scenarioStageId, stageType: "SCENARIO", status: "SUBMITTED", version: 1 },
  ],
  supervisors: [{ id: "83000000-0000-4000-8000-000000000001", userId: supervisorId, role: "MAIN_SUPERVISOR", isActive: true }],
  createdAt,
  updatedAt: "2026-11-07T11:30:00.000Z",
}];

export const DEMO_CASE_RESOURCES: ResourceItem[] = [{
  id: "84000000-0000-4000-8000-000000000001",
  researchCaseId: demoCaseId,
  type: "INDIVIDUAL",
  title: "آموزگار پایه ششم (نمونه)",
  description: "گفت‌وگوی نمونه درباره‌ی تجربه‌ی دانش‌آموزان در برنامه‌های گروهی مدرسه.",
  personAge: 38,
  position: "آموزگار",
  province: "مرکزی",
  county: "اراک",
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
    notes: "داده‌ی ساختگی برای نمایش پرونده در دمو.",
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
    content: "پرسش پژوهش بر تجربه‌ی دانش‌آموزان از مشارکت داوطلبانه و عوامل تقویت‌کننده‌ی آن متمرکز است. این متن نمونه است و داده‌ی واقعی ندارد.",
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

export const DEMO_CASE_SCENARIOS = [{
  id: "88000000-0000-4000-8000-000000000001",
  researchCaseId: demoCaseId,
  version: 1,
  title: "باشگاه ایده‌های دانش‌آموزی",
  summary: "یک مدرسه برای هر ماه یک نشست کوتاه برگزار می‌کند تا دانش‌آموزان فعالیت داوطلبانه پیشنهاد دهند، گروه تشکیل دهند و نتیجه را به هم‌کلاسی‌ها گزارش کنند.",
  content: JSON.stringify({
    audience: "STUDENT",
    province: "مرکزی",
    category: "مشارکت مدرسه‌ای",
    keywords: ["مشارکت", "فعالیت گروهی", "بازخورد"],
    implementationSteps: ["جمع‌آوری ایده‌ها", "تشکیل گروه‌های کوچک", "اجرای فعالیت", "ثبت بازخورد"],
  }),
  status: "UNDER_REVIEW",
}];

export const DEMO_STAGE_IDS = {
  sources: sourcesStageId,
  explanation: explanationStageId,
  prescription: prescriptionStageId,
  scenario: scenarioStageId,
} as const;
