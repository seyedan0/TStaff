import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { PrismaService } from "../packages/database/dist/index.js";

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function main() {
  console.log("🌱 Starting TStaff Test Data & Roles Seeding...");
  const prisma = new PrismaService();
  await prisma.$connect();

  // 1. Seed Roles (Authoritative System Roles)
  const roles = [
    { name: "TRACKING_DIRECTOR", description: "مدیر پیگیری و ارشد سامانه" },
    { name: "PROVINCIAL_DIRECTOR", description: "مدیر استانی شبکه پژوهشگران" },
    { name: "SCIENTIFIC_SUPERVISOR", description: "مدیر علمی (داوری و راهبری پرونده‌ها)" },
    { name: "SUPPORT_DIRECTOR", description: "مدیر پشتیبانی و رسیدگی به کاربران" },
    { name: "SYSTEM_ADMIN", description: "مدیر کل و ادمین سامانه" },
    { name: "INTERN", description: "کارورز / دستیار پژوهش (پژوهشگر ارتقایافته)" },
    { name: "APPRENTICE", description: "کارآموز پژوهشی (سطح اولیه)" },
  ];

  const roleMap = {};
  for (const r of roles) {
    const roleRecord = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: { name: r.name, description: r.description },
    });
    roleMap[r.name] = roleRecord.id;
    console.log(`  ✓ Role: ${r.name}`);
  }

  // Common password hash for test users: TStaff@123
  const defaultPasswordHash = await hashPassword("TStaff@123");

  // 2. Seed Test Users (One per authoritative role)
  const testUsers = [
    {
      id: "10000000-0000-0000-0000-000000000001",
      phoneNumber: "09121111111",
      email: "tracking@tstaff.ir",
      firstName: "مهندس محمد",
      lastName: "علوی (مدیر پیگیری)",
      role: "TRACKING_DIRECTOR",
      stage: "INTERN",
    },
    {
      id: "10000000-0000-0000-0000-000000000002",
      phoneNumber: "09122222222",
      email: "provincial@tstaff.ir",
      firstName: "دکتر علی",
      lastName: "رضایی (مدیر استانی)",
      role: "PROVINCIAL_DIRECTOR",
      stage: "INTERN",
    },
    {
      id: "10000000-0000-0000-0000-000000000003",
      phoneNumber: "09123333333",
      email: "main.supervisor@tstaff.ir",
      firstName: "دکتر مریم",
      lastName: "حسینی (مدیر علمی)",
      role: "SCIENTIFIC_SUPERVISOR",
      stage: "INTERN",
    },
    {
      id: "10000000-0000-0000-0000-000000000004",
      phoneNumber: "09124444444",
      email: "collab.supervisor@tstaff.ir",
      firstName: "دکتر مهدی",
      lastName: "کاظمی (مدیر علمی)",
      role: "SCIENTIFIC_SUPERVISOR",
      stage: "INTERN",
    },
    {
      id: "10000000-0000-0000-0000-000000000007",
      phoneNumber: "09127777777",
      email: "support@tstaff.ir",
      firstName: "مهندس احمد",
      lastName: "محمدی (مدیر پشتیبانی)",
      role: "SUPPORT_DIRECTOR",
      stage: "INTERN",
    },
    {
      id: "10000000-0000-0000-0000-000000000009",
      phoneNumber: "09129999999",
      email: "admin@tstaff.ir",
      firstName: "دکتر علیرضا",
      lastName: "راد (مدیر کل و ادمین)",
      role: "SYSTEM_ADMIN",
      stage: "INTERN",
    },
    {
      id: "10000000-0000-0000-0000-000000000005",
      phoneNumber: "09125555555",
      email: "intern@tstaff.ir",
      firstName: "سارا",
      lastName: "ابراهیمی (کارورز)",
      role: "INTERN",
      stage: "INTERN",
    },
    {
      id: "10000000-0000-0000-0000-000000000006",
      phoneNumber: "09126666666",
      email: "apprentice@tstaff.ir",
      firstName: "رضا",
      lastName: "میرزایی (کارآموز)",
      role: "APPRENTICE",
      stage: "APPRENTICE",
    },
  ];

  for (const u of testUsers) {
    // Upsert User
    const userRecord = await prisma.user.upsert({
      where: { phoneNumber: u.phoneNumber },
      update: {
        passwordHash: defaultPasswordHash,
        stage: u.stage,
        isActive: true,
      },
      create: {
        id: u.id,
        phoneNumber: u.phoneNumber,
        email: u.email,
        passwordHash: defaultPasswordHash,
        stage: u.stage,
        isActive: true,
      },
    });

    // Upsert Profile
    await prisma.profile.upsert({
      where: { userId: userRecord.id },
      update: {
        firstName: u.firstName,
        lastName: u.lastName,
      },
      create: {
        userId: userRecord.id,
        firstName: u.firstName,
        lastName: u.lastName,
      },
    });

    // Upsert UserRole
    const roleId = roleMap[u.role];
    if (roleId) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: userRecord.id,
            roleId,
          },
        },
        update: {},
        create: {
          userId: userRecord.id,
          roleId,
        },
      });
    }

    console.log(`  ✓ User: ${u.firstName} ${u.lastName} [${u.phoneNumber}] - ${u.role}`);
  }

  // 3. Seed some initial applicants (FR-001, D-01: strict integer age)
  const applicants = [
    {
      id: "20000000-0000-0000-0000-000000000001",
      fullName: "امیرحسین کریمی",
      nationalId: "0012345678",
      phoneNumber: "09127777777",
      age: 26, // Integer only
      educationLevel: "کارشناسی ارشد",
      fieldOfStudy: "مهندسی صنایع و تحلیل داده",
      status: "IN_REVIEW",
      notes: "رزومه علمی و مصاحبه اولیه موفق بوده است.",
    },
    {
      id: "20000000-0000-0000-0000-000000000002",
      fullName: "فاطمه شریفی",
      nationalId: "0023456789",
      phoneNumber: "09128888888",
      age: 29, // Integer only
      educationLevel: "دکتری تخصصی",
      fieldOfStudy: "سیاست‌گذاری فناوری و نوآوری",
      status: "PENDING",
      notes: "منتظر تعیین وقت مصاحبه علمی است.",
    },
  ];

  for (const app of applicants) {
    await prisma.applicant.upsert({
      where: { id: app.id },
      update: {
        status: app.status,
        notes: app.notes,
      },
      create: {
        id: app.id,
        fullName: app.fullName,
        nationalId: app.nationalId,
        phoneNumber: app.phoneNumber,
        age: app.age,
        educationLevel: app.educationLevel,
        fieldOfStudy: app.fieldOfStudy,
        status: app.status,
        notes: app.notes,
      },
    });
    console.log(`  ✓ Applicant: ${app.fullName} (سن: ${app.age}) - ${app.status}`);
  }

  // 4. Seed a sample research case with stages (D-02, D-03)
  const sampleCaseId = "30000000-0000-0000-0000-000000000001";
  const researchCase = await prisma.researchCase.upsert({
    where: { id: sampleCaseId },
    update: {},
    create: {
      id: sampleCaseId,
      code: "RC-2026-001",
      title: "بررسی الگوهای تنظیم‌گری و توسعه زیست‌بوم هوش مصنوعی در ایران",
      subject: "سیاست‌گذاری هوش مصنوعی و مدل‌های کلان زبانی",
      status: "SOURCES_STAGE",
      version: 1,
    },
  });
  console.log(`  ✓ Research Case: ${researchCase.title}`);

  // Create assignments (D-02: 1 Main Supervisor, 1 Collaborator Supervisor, 1 Primary Researcher)
  const mainSupId = "10000000-0000-0000-0000-000000000003";
  const collabSupId = "10000000-0000-0000-0000-000000000004";
  const internId = "10000000-0000-0000-0000-000000000005";

  await prisma.researchAssignment.createMany({
    data: [
      {
        researchCaseId: sampleCaseId,
        userId: mainSupId,
        role: "MAIN_SUPERVISOR",
        isActive: true,
      },
      {
        researchCaseId: sampleCaseId,
        userId: collabSupId,
        role: "COLLABORATOR_SUPERVISOR",
        isActive: true,
      },
      {
        researchCaseId: sampleCaseId,
        userId: internId,
        role: "PRIMARY_RESEARCHER",
        isActive: true,
      },
    ],
    skipDuplicates: true,
  });
  console.log("  ✓ Dual Supervisors & Researcher assigned (D-02 parity)");

  // Seed sample resource and interview (D-07 single interview invariant)
  const sampleResourceId = "40000000-0000-0000-0000-000000000001";
  await prisma.resource.upsert({
    where: { id: sampleResourceId },
    update: {},
    create: {
      id: sampleResourceId,
      researchCaseId: sampleCaseId,
      type: "INDIVIDUAL",
      title: "مصاحبه با معاون مرکز ملی فضای مجازی",
      description: "بررسی اسناد بالادستی و اولویت‌های حاکمیتی در توسعه هوش مصنوعی",
      status: "INTERVIEWED",
    },
  });

  await prisma.interview.upsert({
    where: { resourceId: sampleResourceId },
    update: {},
    create: {
      resourceId: sampleResourceId,
      intervieweeName: "دکتر احمدی",
      intervieweeAge: 47, // D-01: integer age
      conductedAt: new Date(),
      status: "CONDUCTED",
    },
  });
  console.log("  ✓ Resource & Single Interview seeded (D-07 compliance)");

  await prisma.$disconnect();
  console.log("\n✅ All seed data generated successfully!");
}

main().catch((err) => {
  console.error("❌ Seed error:", err);
  process.exit(1);
});
