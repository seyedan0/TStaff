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

  const tehranProvinceId = "91000000-0000-4000-8000-000000000008";
  const isfahanProvinceId = "91000000-0000-4000-8000-000000000004";
  const trackingDirectorId = "10000000-0000-0000-0000-000000000001";
  const provincialDirectorId = "10000000-0000-0000-0000-000000000002";
  const mainSupId = "10000000-0000-0000-0000-000000000003";
  const collabSupId = "10000000-0000-0000-0000-000000000004";
  const internId = "10000000-0000-0000-0000-000000000005";
  const apprenticeId = "10000000-0000-0000-0000-000000000006";

  // 2.5. Seed canonical provinces & provincial scopes (FR-048 / CHG-2026-11)
  await prisma.province.upsert({
    where: { id: tehranProvinceId },
    update: { name: "تهران" },
    create: { id: tehranProvinceId, name: "تهران" },
  });
  await prisma.province.upsert({
    where: { id: isfahanProvinceId },
    update: { name: "اصفهان" },
    create: { id: isfahanProvinceId, name: "اصفهان" },
  });
  await prisma.provincialScope.upsert({
    where: { managerId_provinceId: { managerId: provincialDirectorId, provinceId: tehranProvinceId } },
    update: { revokedAt: null, assignedById: trackingDirectorId },
    create: { managerId: provincialDirectorId, provinceId: tehranProvinceId, assignedById: trackingDirectorId },
  });
  // If dev quick-login provincial directors exist, ensure they also have clear initial province scopes
  for (const [mgrId, provId] of [
    ["9439cda7-c944-423d-b185-47ca5af5b9f9", tehranProvinceId],
    ["bc6d4159-38fd-45f0-a786-c25b05546d18", isfahanProvinceId],
  ]) {
    const exists = await prisma.user.findUnique({ where: { id: mgrId } });
    if (exists) {
      await prisma.provincialScope.upsert({
        where: { managerId_provinceId: { managerId: mgrId, provinceId: provId } },
        update: { revokedAt: null, assignedById: trackingDirectorId },
        create: { managerId: mgrId, provinceId: provId, assignedById: trackingDirectorId },
      });
    }
  }

  // Scientific supervisor assignments for seeded intern & apprentice
  for (const [traineeId, supId, isPrimary] of [
    [internId, mainSupId, true],
    [apprenticeId, mainSupId, true],
  ]) {
    await prisma.scientificSupervisorAssignment.upsert({
      where: { userId_supervisorId: { userId: traineeId, supervisorId: supId } },
      update: { revokedAt: null, isPrimary, assignedById: trackingDirectorId },
      create: { userId: traineeId, supervisorId: supId, isPrimary, assignedById: trackingDirectorId },
    });
  }

  // 3. Seed some initial applicants (FR-001, D-01: strict integer age)
  const applicants = [
    {
      id: "20000000-0000-0000-0000-000000000001",
      fullName: "امیرحسین کریمی",
      nationalId: "0012345678",
      phoneNumber: "09127770001",
      age: 26, // Integer only
      provinceId: tehranProvinceId,
      initialSupervisorId: mainSupId,
      educationLevel: "کارشناسی ارشد",
      fieldOfStudy: "مهندسی صنایع و تحلیل داده",
      status: "IN_REVIEW",
      notes: "رزومه علمی و مصاحبه اولیه موفق بوده است.",
    },
    {
      id: "20000000-0000-0000-0000-000000000002",
      fullName: "فاطمه شریفی",
      nationalId: "0023456789",
      phoneNumber: "09128880002",
      age: 29, // Integer only
      provinceId: tehranProvinceId,
      initialSupervisorId: mainSupId,
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
        phoneNumber: app.phoneNumber,
        provinceId: app.provinceId,
        initialSupervisorId: app.initialSupervisorId,
        status: app.status,
        notes: app.notes,
      },
      create: {
        id: app.id,
        fullName: app.fullName,
        nationalId: app.nationalId,
        phoneNumber: app.phoneNumber,
        age: app.age,
        provinceId: app.provinceId,
        initialSupervisorId: app.initialSupervisorId,
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
    update: { researcherId: internId },
    create: {
      id: sampleCaseId,
      code: "RC-2026-001",
      title: "بررسی الگوهای تنظیم‌گری و توسعه زیست‌بوم هوش مصنوعی در ایران",
      subject: "سیاست‌گذاری هوش مصنوعی و مدل‌های کلان زبانی",
      researcherId: internId,
      status: "SOURCES_STAGE",
      version: 1,
    },
  });
  console.log(`  ✓ Research Case: ${researchCase.title}`);

  for (const [stageType, stageStatus] of [
    ["SOURCES", "IN_PROGRESS"],
    ["EXPLANATION", "PENDING"],
    ["PRESCRIPTION", "PENDING"],
    ["SCENARIO", "PENDING"],
  ]) {
    await prisma.stageInstance.upsert({
      where: { researchCaseId_stageType: { researchCaseId: sampleCaseId, stageType } },
      update: {},
      create: { researchCaseId: sampleCaseId, stageType, status: stageStatus, version: 1 },
    });
  }

  // Create deduplicated assignments (D-02: 1 Main Supervisor, 1 Collaborator Supervisor, 1 Primary Researcher)
  await prisma.researchAssignment.deleteMany({ where: { researchCaseId: sampleCaseId } });
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

  // Seed sample resources and interview (D-07 single interview invariant + multi-province bank test)
  const sampleResourceId = "40000000-0000-0000-0000-000000000001";
  await prisma.resource.upsert({
    where: { id: sampleResourceId },
    update: { province: "تهران", provinceId: tehranProvinceId, county: "تهران", contactInfo: "09123450001", personAge: 47, position: "معاون سیاست‌گذاری" },
    create: {
      id: sampleResourceId,
      researchCaseId: sampleCaseId,
      type: "INDIVIDUAL",
      title: "مصاحبه با معاون مرکز ملی فضای مجازی",
      description: "بررسی اسناد بالادستی و اولویت‌های حاکمیتی در توسعه هوش مصنوعی",
      contactInfo: "09123450001",
      personAge: 47,
      position: "معاون سیاست‌گذاری",
      province: "تهران",
      provinceId: tehranProvinceId,
      county: "تهران",
      status: "INTERVIEWED",
    },
  });

  const isfahanResourceId = "40000000-0000-0000-0000-000000000002";
  await prisma.resource.upsert({
    where: { id: isfahanResourceId },
    update: { province: "اصفهان", provinceId: isfahanProvinceId, county: "اصفهان", contactInfo: "09133450002", personAge: 41, position: "پژوهشگر ارشد صنعتی" },
    create: {
      id: isfahanResourceId,
      researchCaseId: sampleCaseId,
      type: "INDIVIDUAL",
      title: "دکتر حسین نجفی",
      description: "متخصص انتقال فناوری و زیست‌بوم علم و فناوری استان اصفهان",
      contactInfo: "09133450002",
      personAge: 41,
      position: "پژوهشگر ارشد صنعتی",
      province: "اصفهان",
      provinceId: isfahanProvinceId,
      county: "اصفهان",
      status: "IDENTIFIED",
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
  console.log("  ✓ Resources & Single Interview seeded (D-07 compliance + Tehran/Isfahan bank)");

  await prisma.$disconnect();
  console.log("\n✅ All seed data generated successfully!");
}

main().catch((err) => {
  console.error("❌ Seed error:", err);
  process.exit(1);
});
