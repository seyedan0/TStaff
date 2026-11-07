# پروپزال جامع فنی و نقشه اجرای سامانه TStaff

**نسخه:** ۰.۱ — پیش‌نویس اجرایی برای تصویب فنی  
**تاریخ مبنا:** ۱۶ آبان ۱۴۰۵ / ۷ نوامبر ۲۰۲۶  
**مرجع محصول:** TStaff — سند نهایی نیازمندی‌های اجرایی، نسخه ۱.۰  
**مخاطب:** مالک محصول، مسئول فنی، تیم Frontend، Backend، زیرساخت، امنیت، آزمون و عملیات  
**وضعیت تصمیم‌ها:** قواعد RFP مصوب‌اند؛ انتخاب‌های فنی این سند «پیشنهاد» هستند مگر در دفتر تصمیم به‌صراحت مصوب معرفی شوند.

> هدف این سند تبدیل RFP به مبنای قابل اجرا، قابل آزمون و قابل توسعه برای تیم داخلی است. این سند قرارداد پیمانکاری، برآورد مالی یا تعهد زمانی نیست. اعداد مربوط به ظرفیت، RPO/RTO و حدود فایل تا پیش از آزمون و تصویب نهایی، هدف طراحی‌اند.

## ۱. خلاصه تصمیم اجرایی

TStaff یک سامانه مدیریت شبکه پژوهشگران و گردش‌کار انسانی/علمی است. معماری پیشنهادی، **Modular Monolith + API-First** در یک **pnpm Monorepo** با **React + Vite + TypeScript** برای رابط، **NestJS + TypeScript** برای API، **PostgreSQL** برای داده تراکنشی و **Object Storage سازگار با S3** برای فایل‌هاست. ذخیره‌سازی، احراز هویت پیامکی، اعلان‌ها و لاگ‌ها با Adapter طراحی می‌شوند تا تعویض ارائه‌دهنده ایرانی بدون تغییر منطق دامنه ممکن باشد.

- **مصوب محصول:** پرونده متقاضی قبل از ایجاد حساب؛ وضعیت کارآموز/کارورز جدا از نقش؛ امکان چند پژوهش؛ مدیر علمی اصلی و حداکثر یک همکار فعال برای هر پژوهش؛ تأیید یک مدیر علمی کافی؛ هر منبع حداکثر یک مصاحبه و هنگام اتمام دقیقاً یک مصاحبه و گزارش اصلی؛ نسخه‌بندی و حفظ تاریخچه؛ بازبینی خروجی‌های وابسته؛ چت خصوصی یک‌به‌یک؛ آرشیو امن؛ نظارت و اعلان گزینشی.
- **انتخاب کاربر در این گفت‌وگو:** تیم TypeScript/Node.js/React؛ میزبانی در ابر یا VPS داخل ایران.
- **پیشنهاد معماری:** Modular Monolith با کنترل دسترسی در سطح رکورد و انتساب، تراکنش PostgreSQL، Transactional Outbox، State Machine صریح، ماژول‌های قابل جداشدن در آینده؛ بدون Microservices و Kubernetes در MVP.
- **فرضیه استقرار نیازمند تصویب:** دو ماشین منطقی برای برنامه و پایگاه داده، به‌علاوه Object Storage و مخزن پشتیبان مستقل؛ محیط توسعه می‌تواند تک‌ماشینه باشد.
- **شاخص‌های اولیه RFP، نه SLA قطعی:** ۱۰۰۰ حساب، ۱۰۰ کاربر همزمان، فایل معمولی ۲۵MB، P95 درخواست‌های متعارف کمتر از ۲ ثانیه در بار مصوب.

## ۲. مرزبندی و اصول غیرقابل نقض RFP

### ۲.۱. داخل MVP

پذیرش متقاضی توسط مدیر استانی بدون حساب؛ ارزیابی و تأیید/رد علمی؛ ایجاد حساب کارآموز پس از تأیید؛ ورود OTP و عامل دوم مدیران؛ کتابخانه شیوه‌نامه‌ها؛ ارتقا به کارورز؛ تعریف و انجام چند پژوهش؛ مراحل «منابع ← تبیین ← تجویز ← سناریو» با اصلاح/تأیید، نسخه و تاریخچه؛ ثبت فرد/مجموعه/مصاحبه و گام مستقل گزارش؛ سناریوی تأییدشده در بانک داخلی؛ مدیریت انتساب، تفویض، گزارش ممیزی، داشبوردهای خلوت، چت خصوصی، اعلان‌ها، تعلیق، آرشیو و درخواست تغییر.

### ۲.۲. خارج MVP

ارتقا و پنل مسئله‌پژوه؛ کنشگری؛ هدایت تحصیلی؛ تالار عمومی/گروهی؛ اکسپلور عمومی بانک سناریو؛ پنل مدیر هسته. **نباید API یا دکمه عملیاتی مخفی برای قابلیت خارج MVP نیز ارائه شود**. تنها مدل داده برای توسعه آینده مانع ایجاد نکند.

### ۲.۳. مرز بین تصمیم قطعی و طراحی فنی

- RFP درباره تعداد مصاحبه، اختیار مدیر علمی و ترتیب مراحل تصمیم گرفته؛ پروپزال مجاز به تغییر این قواعد نیست.
- RFP نوع فناوری، مقادیر قطعی عمر داده‌ها، سقف نهایی فرمت/حجم هر نوع فایل، نحوه نگهداری حقوقی، شرکت زیرساخت و SLA را تعیین نکرده؛ این سند برای آن‌ها پیشنهاد و دروازه تأیید تعریف می‌کند.
- جابه‌جایی داده واقعی مصاحبه‌شوندگان به محیط‌های خارج ایران یا سرویس‌های شخص ثالث، بدون مصوبه حریم خصوصی و کنترل انتقال داده ممنوع فرض شود؛ این یک سیاست طراحی پیشنهادی است، نه نقل مستقیم قانون.

## ۳. معماری منطقی و سبک طراحی

### ۳.۱. انتخاب: Modular Monolith

یک API فرایندی با ماژول‌های دارای مرز دامنه صریح. هر ماژول مالک موجودیت‌ها، قوانین، کاربردها، Adapterها و کنترل‌های امنیتی مربوط خود است؛ ارتباط بین ماژول‌ها از طریق **public application service / domain event** انجام می‌شود، نه import مستقیم Repository یا جدول ماژول دیگر. یک PostgreSQL مشترک مجاز است ولی «دسترسی آزاد به جدول هر ماژول» ممنوع است.

**مزیت:** هماهنگی تراکنش تصمیم علمی + تغییر وضعیت + رویداد ممیزی آسان‌تر از Microservices؛ هزینه عملیات کمتر؛ امکان جداسازی ماژول‌های پرمصرف بعد از اثبات نیاز. **محدودیت:** همه ماژول‌ها یک واحد استقرار API دارند؛ بنابراین وابستگی، کیفیت کد و تست مرز ماژول‌ها حیاتی است.

### ۳.۲. نمای کانتینری

```text
Browser / PWA (RTL)
    | HTTPS, secure cookie
    v
Reverse Proxy (TLS, routing, rate limit)
    |--------------------------|
    v                          v
Web static build            NestJS API (REST /api/v1, Socket.IO /ws)
                               |
                         Application Modules
                               |
               +---------------+-----------------+
               |               |                 |
          PostgreSQL       Object Storage       Worker
          (private)        (private S3)         (outbox/jobs)
               |               |                 |
               +---- Backup/Archive/Monitoring --+

External boundary: Iranian SMS Provider behind SmsGateway adapter
```

اجزای زیرساختی بر حسب ظرفیت می‌توانند در VPSهای جدا یا سرویس‌های مدیریت‌شده اجرا شوند؛ «نمودار منطقی» به معنای یک ماشین برای هر جعبه نیست. قابلیت File/Archive نباید روی دیسک محلی API ذخیره ماندگار کند.

### ۳.۳. استاندارد لایه‌ها داخل هر ماژول

```text
modules/<module>/
  domain/           entities, value-objects, domain-errors, policies
  application/      use-cases, ports, commands, queries, DTO mapping
  infrastructure/   db repositories, provider adapters, event handlers
  presentation/     controllers, DTO validation, socket handlers
  <module>.module.ts
  index.ts          ONLY explicitly exported public interfaces
```

**قاعده وابستگی:** presentation → application → domain؛ infrastructure به interfaceهای application وابسته است؛ domain هیچ import از NestJS/ORM/HTTP ندارد. کتابخانه «shared» نباید به سطل همه کدهای مشترک تبدیل شود. Cross-module DB JOIN اگر لازم باشد صرفاً در **read-model/reporting** اختصاصی با قرارداد مشخص و بازبینی معماری انجام شود.

### ۳.۴. ماژول‌های MVP و مرز مالکیت

| ماژول | مسئولیت و داده مالک | وابستگی مجاز |
|---|---|---|
| identity | حساب، OTP، MFA، Session، وضعیت تعلیق | notifications, audit از طریق port/event |
| applicants | متقاضی قبل از حساب، ارجاع پذیرش، رد و بازگشایی | identity در هنگام تأیید؛ assignments |
| organization | استان/شهرستان، مجموعه‌ها، داده مرجع | بدون خواندن جدول پرونده |
| authorization | نقش، مجوز، Scope، تفویض و Policy Decision | identity, assignments از طریق port |
| assignments | انتساب مدیر علمی/استانی/معاون، دوره اعتبار و انتقال | authorization, research ports |
| research | پژوهش، مسئله، Stage State، تغییر مرحله و قواعد وابستگی | review, files از طریق port |
| resources | منبع، فرد مصاحبه‌شونده، مصاحبه یکتا، گزارش نسخه‌دار | research, files |
| reviews | submission نسخه‌دار، review، تصمیم معتبر، درخواست اصلاح | research, audit |
| scenarios | پیش‌نویس سناریو، داوری، بانک داخلی تأییدشده | research, reviews |
| documents | شیوه‌نامه‌ها و نسخه انتشار | storage |
| files | متادیتا، شناسه blob، ACL، scan، لینک موقت | object storage adapter |
| messaging | مکالمه خصوصی یک‌به‌یک، پیام، خوانده‌شدن و آرشیو | authorization, files |
| notifications | Inbox درون‌سامانه و delivery | event/outbox |
| audit | رویدادهای غیرقابل‌ویرایش عادی و جست‌وجو | append-only API |
| archival | سیاست نگهداری، انتقال/بازگردانی کنترل‌شده | owners via archive ports |
| reporting | projection/read model و گزارش مدیریتی | مجوز سطح رکورد + نماهای محدود |
| settings | دسته‌بندی‌ها، پارامترهای قابل تنظیم و ثبت تغییر | audit |

مرزهای `research/resources/reviews/scenarios` از روز اول در کد جدا می‌شوند، هرچند همگی در یک فرایند NestJS اجرا شوند.

## ۴. انتخاب پشته، نسخه و سیاست وابستگی

| لایه | پیشنهاد اصلی | توضیح انتخاب و قید |
|---|---|---|
| Runtime | Node.js LTS مورد پشتیبانی در زمان شروع | نسخه دقیق در ADR-TECH-001 و engines قفل شود؛ از نسخه آزمایشی پرهیز |
| زبان | TypeScript strict | noImplicitAny، exactOptionalPropertyTypes، noUncheckedIndexedAccess با تصمیم تیم |
| Frontend | React + Vite، React Router/TanStack Router طبق PoC | پنل عمدتاً احراز هویت‌شده؛ SSR الزام MVP نیست؛ Router از ابتدا یکی انتخاب شود |
| UI | Tailwind CSS، shadcn/ui، Design Tokens | RTL و فونت فارسی؛ تست دسترسی‌پذیری |
| Server State | TanStack Query | Cache بر اساس session + scope؛ invalidation پس از mutation |
| Forms | React Hook Form + Zod | draft سمت سرور، validation دوطرفه |
| Backend | NestJS | REST + OpenAPI؛ Guard تنها لایه UI نیست |
| ORM | Drizzle ORM (انتخاب پیشنهادی) | SQL migrations بازبینی‌شده؛ PoC تراکنش همزمان لازم |
| Database | PostgreSQL نسخه پشتیبانی‌شده | تراکنش، FK، ایندکس شرطی، WAL/PITR |
| Realtime | Socket.IO برای چت خصوصی | room authorization و reconnect/replay |
| Jobs | Worker درون Repo، Outbox در PostgreSQL | Redis/BullMQ فقط هنگام نیاز اثبات‌شده |
| Storage | Object Storage S3-compatible | Adapter + presigned link کوتاه‌عمر + ACL API |
| SMS | SmsGateway abstraction | Provider ایرانی بعد از آزمون مسیر، ظرفیت و قرارداد |
| Testing | Vitest/Jest مطابق سازگاری Nest، Playwright | integration با PostgreSQL واقعی، e2e API/UI |
| Repository | pnpm Workspaces + Turbo اختیاری | شروع با pnpm، Turbo تنها پس از نیاز به cache build |
| Deployment | Docker, Compose, Caddy/Nginx | Managed database در صورت توافق؛ بدون Kubernetes در MVP |
| Observability | Structured JSON logs, OpenTelemetry, Prometheus/Grafana در صورت توجیه | عدم ثبت PII/OTP/فایل در لاگ |

**سیاست قفل نسخه:** همه نسخه‌ها در lockfile ثبت، Imageها با digest برای Production قفل و به‌روزرسانی‌ها از مسیر PR/آزمون امنیت عبور کنند. این سند عمداً اعداد نسخه فریم‌ورک‌ها را تحمیل نمی‌کند، چون نسخه دقیق باید با ماتریس سازگاری روز شروع توسعه تعیین شود.

## ۵. معماری Monorepo و ساختار مخزن

### ۵.۱. درخت Repository هدف

```text
tstaff/
├── .github/
│   ├── CODEOWNERS
│   ├── pull_request_template.md
│   └── workflows/{ci.yml,security.yml,deploy-staging.yml}
├── .husky/                      # optional pre-commit after team agreement
├── apps/
│   ├── web/
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── app/{router,providers,layouts}
│   │   │   ├── pages/{applicants,research,inbox,settings}
│   │   │   ├── features/{admission,research-workflow,chat,assignments}
│   │   │   ├── entities/{user,research,resource,scenario}
│   │   │   ├── shared/{api,ui,lib,i18n,assets}
│   │   │   └── main.tsx
│   │   ├── e2e/
│   │   └── vite.config.ts
│   ├── api/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── modules/{identity,applicants,organization,authorization,
│   │   │   │   assignments,research,resources,reviews,scenarios,documents,
│   │   │   │   files,messaging,notifications,audit,archival,reporting,settings}/
│   │   │   └── platform/{config,db,events,errors,logging,health,security}
│   │   └── test/{integration,contract,e2e}
│   └── worker/
│       ├── src/{main.ts,outbox,handlers,maintenance}
│       └── test/
├── packages/
│   ├── contracts/               # OpenAPI generated client, shared schemas; no ORM models
│   ├── database/                # migrations, schema registration, seed, DB test helpers
│   ├── ui/                      # design system shared if second app appears
│   ├── config/                  # tsconfig/eslint/prettier presets
│   └── test-utils/
├── infra/
│   ├── compose/{compose.dev.yml,compose.prod.example.yml}
│   ├── proxy/
│   ├── monitoring/
│   ├── backup/
│   └── runbooks/
├── docs/
│   ├── 00-product/{rfp-baseline.md,scope.md,traceability.md}
│   ├── 01-architecture/{context.md,containers.md,modules.md,decisions.md}
│   ├── 02-domain/{admission.md,research-workflow.md,permissions.md}
│   ├── 03-api/{api-rules.md,error-codes.md,websocket.md}
│   ├── 04-data/{erd.mmd,data-dictionary.md,migrations.md}
│   ├── 05-security/{threat-model.md,controls.md,privacy.md}
│   ├── 06-operations/{deployment.md,backup-recovery.md,incident.md}
│   ├── 07-quality/{test-strategy.md,definition-of-done.md}
│   ├── 08-delivery/{roadmap.md,backlog.md,release-checklist.md}
│   └── adr/{0001-modular-monolith.md,0002-storage.md,...}
├── scripts/{check-boundaries,seed-demo,verify-backup}
├── .editorconfig
├── .env.example
├── .gitignore
├── AGENTS.md
├── CONTRIBUTING.md
├── SECURITY.md
├── README.md
├── package.json
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

**قاعده:** `apps/web` نباید از `apps/api/src` یا `packages/database` import کند. قراردادها فقط از `packages/contracts` و خروجی تولیدشده OpenAPI به سمت Frontend منتشر شوند. `apps/worker` از application ports/event schema استفاده کند و به Controllerهای HTTP وابسته نباشد. تست boundary باید این قواعد را در CI enforce کند.

### ۵.۲. مرز واردات و قرارداد وابستگی

- `apps/api` فقط از public export ماژول دیگر import می‌کند؛ import مسیر داخلی `modules/a/infrastructure/...` از ماژول b خطای CI است.
- Domain از NestJS/Drizzle/WebSocket و `process.env` بی‌اطلاع است؛ زمان و شناسه تصادفی از Port تزریق شوند.
- DTO ورودی HTTP مستقیماً Entity دیتابیس نیست؛ Mapper مشخص و validation وجود دارد.
- API + Worker از رویداد versioned استفاده می‌کنند: `research.review.decided.v1`؛ اضافه‌کردن فیلد سازگار مجاز و تغییر مخرب نیازمند event version تازه است.
- قرارداد `packages/contracts` از OpenAPI ساخته می‌شود؛ Schemaهای اضافی مستقل از DB تعریف شوند؛ تغییر قرارداد با contract test سنجیده شود.
- هر ماژول `README.md` با مالک، واژه‌نامه، ورودی/خروجی، permission، event و تست‌های حیاتی داشته باشد.

### ۵.۳. راهبرد Branch، Commit و PR

شاخه اصلی `main` محافظت‌شده؛ شاخه‌های کوتاه `feat/FR-0xx-topic`، `fix/...`؛ توسعه trunk-based با Feature Flag برای قابلیت‌های ناتمام. حداقل یک Review انسانی، پاس شدن typecheck/lint/unit/integration حساس، عدم انتشار secret و بررسی migration الزامی است. Conventional Commits پیشنهاد می‌شود. Release با Tag و changelog، نه استقرار مستقیم از سیستم شخصی.

### ۵.۴. پرونده راهنما برای Agentها

`AGENTS.md` باید قواعد دامنه مصوب، دستورهای توسعه، مسیر معماری، مرزهای ممنوع، انتظار تست و قاعده «عدم تغییر RFP بدون ثبت CR» را توضیح دهد. هر Agent موظف است قبل از تغییر Business Rule، FR/BR مربوط را بررسی و در PR لینک دهد؛ تولید کد بدون تست مجوز و حالت قابل قبول نیست.

## ۶. مدل داده و قیود یکپارچگی

### ۶.۱. قواعد طراحی

کلیدهای UUID/ULID در سطح API (انتخاب دقیق در ADR)؛ Timestamp با UTC و نمایش تاریخ شمسی در UI؛ سن عدد صحیح ثبت‌شده بدون مشتق‌سازی از تولد؛ داده PII با طبقه‌بندی و دسترسی محدود؛ `created_at`, `updated_at`, `version` برای موجودیت‌های قابل تغییر؛ soft delete تنها وقتی با سیاست حقوقی/دامنه سازگار است؛ audit event حذف‌ناپذیر در مسیر عادی.

### ۶.۲. جداول هسته پیشنهادی

| محدوده | موجودیت‌های اصلی | قاعده کلیدی |
|---|---|---|
| پذیرش | applicants, admission_reviews, applicant_reopen_requests | applicant قبل از user و رد بدون ساخت user |
| هویت | users, profiles, login_challenges, user_sessions, mfa_factors, membership_transitions | role با stage رشد یکی نیست |
| مجوز | roles, permissions, role_grants, scopes, delegated_grants | دامنه استان/پرونده + انقضا/لغو تفویض |
| انتساب | research_assignments, provincial_assignments, assignment_history | دقیقاً یک MAIN و حداکثر یک COLLAB فعال برای هر پژوهش |
| پژوهش | research_cases, stage_instances, stage_transitions, stage_dependencies | مرحله جاری و وضعیت اعتبار وابستگی جدا |
| منابع | resources, interviewees, organizations, interviews | UNIQUE(interviews.resource_id) |
| گزارش | interview_reports, report_revisions, stage_submissions, stage_submission_files | هر منبع هنگام اتمام گزارش اصلی نسخه‌دار دارد |
| داوری | review_decisions, change_requests, invalidation_events | تصمیم فقط روی revision جاری؛ first valid decision wins |
| سناریو | scenarios, scenario_revisions, scenario_categories, tags, scenario_tags | بانک داخلی فقط revision تأییدشده |
| فایل | stored_objects, file_links, upload_sessions, malware_scan_events | object_key غیرقابل حدس و private |
| چت | conversations, conversation_participants, messages, message_attachments | یک‌به‌یک با مدیر مرتبط؛ مجوز هر اتصال |
| اعلان | notifications, notification_receipts | فوری فقط رخداد نیازمند رسیدگی |
| ممیزی/صف | audit_events, outbox_events, processed_event_keys | immutability و idempotency |
| آرشیو | archive_jobs, archive_manifests, retention_policies, restore_requests | آرشیو ≠ بکاپ |

### ۶.۳. قیود دیتابیس غیرقابل واگذاری به UI

```sql
-- هر منبع، حداکثر یک مصاحبه؛ تکمیل نهایی در تراکنش سرویس کنترل می‌شود
CREATE UNIQUE INDEX uq_interview_resource ON interviews(resource_id);

-- یک مدیر علمی اصلی فعال برای هر پژوهش
CREATE UNIQUE INDEX uq_research_main_active
ON research_assignments(research_id)
WHERE assignment_kind = 'MAIN' AND revoked_at IS NULL;

-- حداکثر یک همکار علمی فعال
CREATE UNIQUE INDEX uq_research_collab_active
ON research_assignments(research_id)
WHERE assignment_kind = 'COLLABORATOR' AND revoked_at IS NULL;

-- جلوگیری از ثبت تکراری درخواست کلاینت
CREATE UNIQUE INDEX uq_review_idempotency
ON review_decisions(actor_id, idempotency_key);
```

`exactly one MAIN` برای پرونده فعال، با کنترل گذار/تراکنش و تست جامع تضمین می‌شود؛ ایندکس یکتا تنها «حداکثر یک» را تضمین می‌کند. محدودیت «در پایان هر منبع دقیقاً یک مصاحبه و گزارش اصلی» نیز شرط transition است، نه الزام هنگام ساخت draft.

### ۶.۴. نسخه‌بندی و اعتبار خروجی

`stage_submissions` به‌صورت رکوردهای append-only ذخیره شوند؛ `stage_instances.current_submission_id` به آخرین نسخه اشاره کند؛ `approved_submission_id` نسخه معتبر را مشخص کند؛ `status` از `validity_state` جدا باشد. نمونه: وضعیت تبیین `APPROVED` ولی `validity_state=REVIEW_REQUIRED` به علت تغییر منابع، به‌معنی مجوز عبور نیست.

درخواست تغییر برای داده تأییدشده، **نسخه پیشنهادی جدا** تولید می‌کند؛ قبل از تأیید، اشاره‌گر نسخه معتبر تغییر نکند. `stage_dependencies` نسخه خروجی مرحله پیشین را به نسخه بعدی متصل می‌کند؛ در صورت اصلاح پیش‌نیاز، وابسته‌ها به `REVIEW_REQUIRED` می‌روند، نسخه تاریخی حذف نمی‌شود و انتشار سناریوی متأثر متوقف می‌گردد.

### ۶.۵. یکپارچگی فایل و دیتابیس

بین PostgreSQL و S3 تراکنش توزیع‌شده نداریم. آپلود با `upload_session` و وضعیت `PENDING → SCANNING → AVAILABLE | REJECTED` مدیریت می‌شود؛ دیتابیس ابتدا metadata pending و سپس پس از صحت upload/scan نسخه قابل ارجاع را ثبت می‌کند؛ شیء رهاشده از طریق cleanup job کنترل می‌شود. حذف شیء فیزیکی فقط پس از محاسبه ارجاعات، دوره نگهداری و سیاست حذف مصوب انجام شود.

## ۷. State Machine و الگوریتم تصمیم علمی

### ۷.۱. وضعیت‌های پیشنهادی

- **Applicant:** `DRAFT → PENDING_SCIENTIFIC_REVIEW → APPROVED/REJECTED`; مسیر ویژه `REJECTED → REOPEN_REQUESTED → REOPEN_APPROVED → PENDING_SCIENTIFIC_REVIEW` با مجوز مدیر پیگیری.
- **User:** `APPRENTICE → INTERN`؛ حالت مستقل `ACTIVE/SUSPENDED/CLOSED_ARCHIVED` برای دسترسی؛ «مسئله‌پژوه» در MVP فعال نیست.
- **Stage:** `DRAFT → SUBMITTED → CHANGES_REQUESTED/APPROVED`؛ از `CHANGES_REQUESTED` فقط نسخه جدید و ارسال مجدد؛ `APPROVED → CHANGE_REQUESTED` از مسیر مجاز.
- **Dependency validity:** `VALID`, `REVIEW_REQUIRED` (مجزا از وضعیت ارسال). خروجی‌ای که به پیش‌نیاز منسوخ وابسته است قابل انتشار نهایی نیست.
- **Scenario:** `DRAFT → SUBMITTED → CHANGES_REQUESTED/APPROVED`; تنها approved revision در بانک داخلی.

### ۷.۲. الگوریتم کنترل تعارض همزمان

```text
POST /api/v1/review-decisions
input: submissionId, expectedVersion, decision, idempotencyKey
1) authenticate + MFA/session policy + authorize(actor, case, scope)
2) BEGIN TRANSACTION
3) lock current stage/submission row or perform compare-and-swap
4) assert submission.currentVersion == expectedVersion
5) assert stage.status == SUBMITTED and no final decision for this revision
6) insert immutable review_decision(actor, time, reason, version)
7) advance stage or request changes; record stage_transition + audit_event
8) insert outbox_event for later notification/projections
9) COMMIT
10) return new state/version
If stale: 409 STALE_REVISION + current state; do not overwrite.
If identical retry: return idempotent prior response; do not duplicate decision.
```

قید «تصمیم اول معتبر» به معنای استفاده از ساعت کلاینت نیست؛ ترتیب معتبر توسط تراکنش commit‌شده و constraint/locking پایگاه داده تعیین می‌شود. تلاش ناموفق/همزمان با حداقل متادیتای امن در audit/operational log ثبت شود؛ رویدادهای محرمانه نباید محتوای کامل گزارش را در log عمومی کپی کنند.

### ۷.۳. آزمون‌های حساس گردش‌کار

دو مدیر علمی همزمان یک نسخه را تأیید/اصلاح می‌کنند → فقط یک تصمیم معتبر؛ ارسال نسخه قدیمی → 409؛ تغییر منابع تأییدشده → خروجی‌های وابسته `REVIEW_REQUIRED`؛ تعلیق کاربر → API و Socket قطع/رد؛ انتقال مدیر علمی → دسترسی جدید معتبر و قبلی لغو، تاریخچه محفوظ؛ آرشیو کاربر → چت عادی مخفی و بازیابی با مجوز قابل آزمون.

## ۸. امنیت و مدل مجوزدهی

### ۸.۱. AuthN

سامانه ثبت‌نام عمومی آزاد ندارد: پس از پذیرش علمی، حساب ایجاد و شماره همراه از مسیر OTP راستی‌آزمایی می‌شود. مدیران علاوه بر ورود پایه، عامل مستقل مانند TOTP یا Passkey دارند؛ SMS دوم به‌تنهایی عامل مستقل مطلوب نیست. نشستی که لغو/تعلیق شده در REST و WebSocket نامعتبر است. OTP یک‌بارمصرف، هش‌شده، دارای TTL و rate limit؛ مقادیر اجرایی پس از تست SMS و تحلیل تهدید تعیین می‌شوند (پیشنهاد آزمایشی: TTL دو دقیقه، پنج تلاش، cooldown متغیر).

کوکی Session امن (`HttpOnly`, `Secure`, `SameSite`) همراه با دفاع CSRF متناسب با الگوی Cookie؛ شناسه نشست قابل ابطال سمت سرور؛ محدودکردن دستگاه/نشست مدیران بر پایه سیاست؛ عدم ذخیره توکن بلندعمر در LocalStorage.

### ۸.۲. AuthZ

هر تصمیم مجوز حاصل **role × action × target × assigned_scope × current_state × delegation** است. Guard در NestJS، Policy Service و Query Scope همگی لازم‌اند. Frontend تنها کنترل نمایش UX است. تغییر انتساب باید در درخواست بعدی اثر داشته باشد؛ برای Socket نیز قطع/بازاعتبارسنجی room اتفاق بیفتد.

| نقش | دسترسی معمول | منع/شرط اساسی |
|---|---|---|
| متقاضی | بدون حساب و ورود | فقط پرونده پذیرش داخلی |
| کارآموز | اسناد مرحله و گفت‌وگوی مجاز | API پژوهش مسدود |
| کارورز | پژوهش‌های خود و ارسال اصلاح | تصمیم علمی ممنوع |
| مدیر استانی | کاربران استان + انتساب موردی خارج استان | سایر استان‌ها ممنوع |
| مدیر علمی اصلی | پرونده‌های منتسب، تصمیم علمی، تعلیق/بازگشت | سایر پژوهش‌ها ممنوع |
| مدیر علمی همکار | برابر با اصلی در پژوهش منتسب | صرف نقش، دسترسی عمومی نمی‌دهد |
| مدیر پیگیری | کنترل انتساب، تفویض و ممیزی | تصمیم علمی به‌طور خودکار فرض نشود |
| معاون پیگیری | فقط قلمرو/مجوز صریح تفویض‌شده | اختیار ذاتی سراسری ندارد |
| پشتیبانی | چت کاربران مرتبط | دسترسی پیش‌فرض به محتوای پژوهش ندارد |
| مدیر کل | پایش سراسری و تنظیمات فنی مجاز | قدرت فنی ≠ اختیار داوری علمی |

### ۸.۳. حفاظت داده و ممیزی

- طبقه‌بندی `PUBLIC / INTERNAL / CONFIDENTIAL / RESTRICTED`؛ مصاحبه‌ها و PII حداقل CONFIDENTIAL پیش‌فرض تا تصویب سیاست.
- TLS، رمزگذاری داده‌های حساس در ذخیره‌سازی در حد نیاز، کلیدها خارج Git و جدا از بکاپ؛ ثبت secret در CI ممنوع.
- audit event برای تصمیم‌ها و تغییر مجوز: `actor_id, effective_role, action, entity_type, entity_id, before/after summary, reason, happened_at, trace_id`؛ کنترل عدم تغییر برای کاربران عادی DB، پشتیبان و سیاست نگهداری جدا.
- جلوگیری از IDOR/BOLA با Policy Service و negative tests، فهرست دسترسی‌ها و query filtering؛ ممیزی دسترسی به آرشیو و دانلود فایل.
- مدل تهدید حداقل برای OTP، فایل آپلودی، تصمیم همزمان، WebSocket، انتساب بین‌استانی، ارجاع مجدد و export داده.
- حقوق داده و مبنای جمع‌آوری اطلاعات مصاحبه‌شونده، رضایت/اطلاع‌رسانی، حذف قانونی و محل پردازش باید پیش از UAT با داده واقعی توسط مسئول حقوقی/مالک محصول بررسی شوند؛ RFP عدد/قاعده حقوقی قطعی ارائه نکرده است.

## ۹. قرارداد API و ارتباطات

### ۹.۱. اصول

REST با پیشوند `/api/v1`، مستند OpenAPI، JSON با نام‌گذاری پایدار، Pagination مبتنی بر cursor برای فهرست‌های حجیم، فیلترهای whitelisted، ISO 8601 UTC، خطا در قالب Problem Details همراه کد دامنه و `traceId`. برای عملیات حساس `Idempotency-Key` و `If-Match/expectedVersion` الزامی. `PATCH` تغییرات معتبر را بدون مجوز و revision آزاد اعمال نکند.

### ۹.۲. کاتالوگ Endpoint پیشنهادی

| بخش | مسیر نمونه | عملیات و کنترل |
|---|---|---|
| Auth | POST `/auth/otp/request`, `/auth/otp/verify`, `/auth/mfa/verify`, `/auth/logout` | rate limit, session revoke |
| Applicants | POST/GET `/applicants`; POST `/:id/decisions`; POST `/:id/reopen-requests` | مدیر استانی/علمی/پیگیری با scope |
| Users | GET `/users/:id`, PATCH `/:id/status`; POST `/:id/promotions` | stage و account status مستقل |
| Assignments | POST `/assignments`, DELETE `/:id`, GET `/assignments` | تفویض/اصالت مدیر پیگیری |
| Research | POST/GET `/research-cases`; GET `/:id/timeline`; POST `/:id/return-stage` | فرایند و scope |
| Resources | POST `/research-cases/:id/resources`; POST `/resources/:id/interview` | یک مصاحبه به ازای منبع |
| Reports | POST `/interviews/:id/report-revisions` | upload جدا از interview form |
| Reviews | POST `/stage-submissions`; POST `/review-decisions` | CAS + idempotency |
| Changes | POST `/change-requests`; POST `/:id/decisions` | نسخه معتبر بدون تغییر تا تأیید |
| Scenarios | POST `/scenarios`; POST `/:id/submissions`; GET `/scenario-bank` | بانک فقط داخلی/مجاز |
| Files | POST `/uploads/initiate`, `/uploads/:id/complete`; GET `/files/:id/download` | scan/private/policy |
| Chat | GET `/conversations`; GET `/:id/messages`; POST `/:id/messages` | یک‌به‌یک، cursor، idempotency |
| Notifications | GET `/notifications`; POST `/:id/read` | فقط گیرنده مجاز |
| Oversight | GET `/audit-events`; GET `/reports/...` | filter + authorization + pagination |
| Archive | POST `/archive-requests`, POST `/:id/restore` | approval, job, audit |

**نکته:** این‌ها نمونه قراردادند، نه جدول نهایی مسیرهای مصوب. قبل از پیاده‌سازی هر ماژول OpenAPI، DTOها، کدهای خطا و مجوزهای آن در Definition of Ready قفل می‌شوند.

### ۹.۳. قرارداد خطا

```json
{
  "type": "https://docs.tstaff.local/errors/stale-revision",
  "title": "Stale revision",
  "status": 409,
  "code": "STALE_REVISION",
  "detail": "The current submission changed.",
  "traceId": "01EXAMPLETRACE",
  "currentVersion": 8
}
```

کدهای پایه: `AUTH_REQUIRED` (401), `SCOPE_DENIED` (403), `ENTITY_NOT_FOUND` (404), `VALIDATION_FAILED` (422), `STALE_REVISION` (409), `INVALID_STAGE_TRANSITION` (409), `RATE_LIMITED` (429), `SERVICE_UNAVAILABLE` (503). برای جلوگیری از افشای وجود پرونده نامجاز ممکن است `404` به‌جای `403` استفاده شود؛ سیاست یکسان و قابل آزمون باشد.

### ۹.۴. چت خصوصی

یک مکالمه یک‌به‌یک بین عضو و مدیر مجاز؛ عضویت در room فقط با Policy Service؛ هر پیام `client_message_id`, `server_message_id`, timestamp, sender و وضعیت تحویل دارد؛ ارسال دوباره با client ID تکراری، پیام دوباره نسازد؛ بعد از reconnect با cursor پیام از‌دست‌رفته خوانده شود. رویداد realtime نشانه «پیام جدید» است، پایگاه داده منبع حقیقت است. اتصال WebSocket مجوز کاربر را دائم نمی‌کند؛ لغو انتساب، تعلیق و آرشیو باید اتصالات/roomها را محدود کند.

## ۱۰. ذخیره‌سازی فایل و آرشیو

### ۱۰.۱. چرخه فایل

`INITIATED → UPLOADED_QUARANTINED → SCANNED → AVAILABLE | REJECTED`؛ تشخیص content-type به‌صورت server-side، allowlist پسوند و magic bytes، سقف تعداد/اندازه و quota؛ Object key تصادفی؛ متادیتا و SHA-256، مالک و رابطه با revision در PostgreSQL. فایل نسخه تأییدشده immutable باشد؛ ویرایش، فایل جدید و revision جدید می‌سازد. دسترسی دانلود با ارزیابی مجدد مجوز، لینک کوتاه‌عمر یا proxy؛ هرگز bucket عمومی برای فایل خصوصی.

### ۱۰.۲. مرزهای پیشنهادی پیش از تصویب

فایل معمولی ۲۵MB تنها هدف اولیه RFP است؛ فهرست مجاز MIME، سقف صوت/ویدئو، تعداد ضمائم هر گزارش، ظرفیت Object Storage و سیاست ضدبدافزار باید قبل از اجرای عملیاتی مصوب شود. پیشنهاد فنی: دسته‌های Document (`pdf, docx`)، Image (`jpg,png`) و Audio (`mp3,m4a`) و Video در صورت ضرورت؛ نه مجازکردن پیش‌فرض همه فرمت‌ها.

### ۱۰.۳. آرشیو حساب بسته‌شده

Archive Job با snapshot/manifest، ثبت تعداد و هش رکورد/فایل، انتقال امن به حوزه آرشیوی، کنترل دسترسی مستقل و حذف از نمای عملیاتی پس از تأیید موفق. سوابق علمی، ممیزی و پیام‌ها طبق RFP حفظ شوند؛ **مدت نگهداری و قواعد حذف قانونی هنوز نیازمند تصویب‌اند**. بازیابی آرشیو نباید حساب بسته‌شده را خودکار فعال کند و هر مشاهده/Restore ثبت ممیزی شود.

### ۱۰.۴. تفکیک Archive و Backup

Archive با هدف بازیابی سازمانی و جست‌وجوی مجاز؛ Backup با هدف Disaster Recovery. فایل‌های آرشیوی نیز باید Backup داشته باشند. «پوشه temp» یا یک volume متصل به همان VPS، آرشیو پایدار محسوب نمی‌شود.

## ۱۱. استقرار داخل ایران و توپولوژی زیرساخت

### ۱۱.۱. پیشنهاد Production اولیه (هنوز تصویب نشده)

| جزء | مکان/پیکربندی اولیه | قید |
|---|---|---|
| Web/API/Worker/Proxy | VPS-A داخل ایران، ۴ vCPU / ۸GB RAM به‌عنوان نقطه شروع | سرور داده‌محور نیست؛ فقط 80/443 عمومی |
| PostgreSQL | VPS-B یا DB مدیریت‌شده داخل ایران، ۲–۴ vCPU / ۸GB و NVMe | دسترسی تنها از شبکه خصوصی/VPN، نه اینترنت عمومی |
| Object Storage | سرویس S3-compatible با موقعیت واقعی داده در ایران | Bucket خصوصی، credentials محدود، lifecycle کنترل‌شده |
| Backup | مخزن مستقل ترجیحاً failure domain متفاوت داخل ایران | رمزگذاری، off-host، تست restore |
| SMS | ارائه‌دهنده داخلی با Adapter | SLA و مسیر ارسال/پیامک الگو بررسی شود |
| DNS/TLS | DNS و گواهی معتبر، reverse proxy | تمدید خودکار با مسیر دسترس‌پذیر |
| Monitoring | ترکیب metrics، log و alert | حساسیت داده و نگهداری log کنترل شود |

این پیشنهاد «High Availability» چنددیتاسنتری نیست؛ دو VPS در یک دیتاسنتر نقطه خرابی مشترک دارند. اگر بودجه/فنی تنها یک VPS را مجاز کند، یک VPS برای شروع آزمایشی قابل قبول است ولی برای Production باید ریسک و بکاپ مستقل کتبی تصویب شود. نام ارائه‌دهنده ایران و ظرفیت نهایی پس از PoC شبکه، کیفیت دیسک، پشتیبانی S3 و هزینه تثبیت می‌شود.

### ۱۱.۲. محیط‌ها و شبکه

- **Local:** Docker Compose و داده ساختگی؛ SMS mock؛ S3 local emulator برای توسعه.
- **CI:** دیتابیس یک‌بارمصرف، integration/contract tests؛ secrets test-only.
- **Staging:** تنظیمات شبیه Production، داده مصنوعی/ناشناس، مستقر با همان Docker image.
- **Production:** imageهای قفل‌شده، شبکه خصوصی DB، تنظیمات Secret جدا، deployment audit، backup و alert.

فقط Reverse Proxy در معرض اینترنت؛ PostgreSQL، queue و admin endpoint روی private network/VPN؛ firewall default deny؛ دسترسی اپراتورها حداقل و ثبت‌شده؛ HTTPS اجباری؛ egress محدود برای SMS/S3/به‌روزرسانی‌های لازم.

### ۱۱.۳. مسیر ساخت و استقرار در شرایط محدودیت شبکه

CI به Node package registry عمومی در زمان deploy وابسته نباشد: image خروجی قبلاً در pipeline ساخته، اسکن و در Registry قابل دسترس از ایران نگهداری شود. deploy با digest ثابت، migration کنترل‌شده و health-check؛ Rollback image به‌تنهایی کافی نیست، migration باید backward-compatible یا همراه runbook restore باشد. Artifactها و کلیدها روی لپ‌تاپ توسعه‌دهنده مرجع تولید نباشند.

## ۱۲. پشتیبان‌گیری، RPO/RTO و بازیابی

### ۱۲.۱. اهداف پیشنهادی

**RPO ≤ ۱ ساعت و RTO ≤ ۴ ساعت** صرفاً فرضیه برای سناریوی خرابی VPS/پایگاه داده است؛ تعهد نهایی تنها بعد از تست Full Restore همراه فایل‌ها و آرشیو صادر شود. برای قطع کامل دیتاسنتر ممکن است RTO متفاوت لازم باشد و باید در جدول سناریوها تفکیک شود.

### ۱۲.۲. راهکار

PostgreSQL base backup + WAL archiving/PITR؛ نگهداری بکاپ فایل‌ها با snapshot/versioning و manifest؛ بکاپ Secretهای مورد نیاز برای restore در مخزن محدود جدا؛ رمزگذاری در انتقال/نگهداری؛ پایش خطا در backup job؛ آزمون Restore در Staging جداگانه. تناوب base backup (پیشنهاد اولیه روزانه)، Retention و چرخه تست (پیشنهاد ماهانه) نیازمند تصویب با داده و هزینه واقعی‌اند.

### ۱۲.۳. ماتریس سناریوی بازیابی

| رخداد | روش بازیابی | شواهد لازم |
|---|---|---|
| خرابی API | redeploy image سالم | health، contract smoke |
| خرابی PostgreSQL | restore base + WAL تا point-in-time | شمارش داده، workflow consistency، RPO واقعی |
| حذف/خرابی Object | restore نسخه شیء + manifest | hash و مجوز دانلود |
| خطای migration | rollback سازگار یا restore با تایید | dry-run و backup قبل از migration |
| قطع ارائه‌دهنده اصلی | انتقال با runbook به تامین‌کننده دیگر | تست DNS/TLS/S3/DB، زمان واقعی |
| تخریب/باج‌افزار | restore از بکاپ مجزا/غیرقابل تغییر | isolation و integrity verification |

## ۱۳. Observability، عملکرد و توسعه ظرفیت

### ۱۳.۱. ثبت و پایش

لاگ JSON با `traceId`, `requestId`, `actorId` حداقلی، `module`, `eventCode`, latency و outcome؛ حذف کامل OTP، token، شماره کامل همراه و محتوای گزارش از log. Metrics: RPS، خطاهای 4xx/5xx، P50/P95/P99 API، latency DB، connection pool، ذخیره/خطای فایل، outbox lag، پیام معوق، SMS delivery failure، حجم آرشیو و موفقیت بکاپ. Alert به رخداد دارای اقدام نیازمند رسیدگی منجر شود و اعلان عادی برای مدیر پیگیری ایجاد نکند.

### ۱۳.۲. سنجه‌های طراحی و تست بار

در پایان MVP، تست با سناریوی تعریف‌شده برای ۱۰۰ کاربر همزمان و ۱۰۰۰ حساب انجام شود؛ P95 کمتر از دو ثانیه فقط برای عملیات متعارف مشخص‌شده (مثلاً فهرست پرونده و مشاهده جزئیات) و نه آپلود فایل/خروجی‌های حجیم سنجیده شود. محیط، داده آزمایشی، توزیع عملیات و شاخص خطا مستند شوند. برای چت علاوه بر API latency، زمان تحویل پیام، reconnect و replay سنجیده شود.

### ۱۳.۳. مسیر مقیاس‌پذیری

| محرک افزایش بار | اقدام اول | اقدام بعدی |
|---|---|---|
| query کند | index، EXPLAIN ANALYZE، pagination | read model/materialized projection |
| CPU API بالا | profiling و محدودسازی عملیات گران | چند instance Stateless پشت Load Balancer |
| صف اعلان/آرشیو | worker isolation، retry و backpressure | Redis/BullMQ یا queue مستقل |
| حجم فایل | lifecycle، multipart/resumable برای فایل بزرگ | storage tiering، CDN فقط برای محتوای مجاز |
| chat connection زیاد | connection benchmark و sticky/realtime adapter | scaling gateway و message broker مناسب |
| افزایش داده تاریخی | partition/index و archiving | DB replication / separate reporting store |

مهاجرت به Microservices تنها زمانی مجاز است که شواهد اندازه‌گیری‌شده، نیاز سازمانی و ADR هزینه/فایده آن را اثبات کند؛ تقسیم زودهنگام صرفاً به خاطر واژه «Scalable» ممنوع.

## ۱۴. UI/UX و قرارداد صفحات

پنل‌ها فارسی و RTL، واکنش‌گرا و اقدام‌محور باشند. مدیر علمی در پیشخوان حداکثر سه شاخص اصلی و فهرست کوتاه وظایف؛ مدیر پیگیری خلاصه مهم و لینک نمای جست‌وجوی کامل ممیزی؛ جزئیات پرونده با سه ناحیه «وضعیت فعلی، اقدام بعدی، تاریخچه/مستندات». فرم منبع چندمرحله‌ای با امکان پیش‌نویس/بازگشت به گام قبلی؛ گزارش مکتوب مصاحبه از مشخصات مصاحبه جدا. برای مدیر علمی، هدف طراحی رسیدن به تصمیم یک گزارش از پیشخوان با حداکثر سه اقدام اصلی و آزمون کاربر واقعی است.

### ۱۴.۱. ساختار route

```text
/login | /auth/verify | /auth/mfa
/app (dashboard based on role)
/app/applicants | /app/applicants/:id
/app/users | /app/users/:id
/app/research | /app/research/:caseId
/app/research/:caseId/resources/:resourceId/interview
/app/research/:caseId/resources/:resourceId/report
/app/research/:caseId/stages/:stage
/app/research/:caseId/scenario
/app/inbox | /app/chat/:conversationId
/app/assignments | /app/audit | /app/settings
```

مجوز مسیر سمت کلاینت فقط UX است؛ Backend و query/data-level باید سیاست یکسان را enforce کنند. Draft autosave debounced پیشنهاد می‌شود اما نهایی‌سازی با اقدام صریح و نتیجه برگشت‌داده‌شده از سرور انجام شود؛ در حالت قطع شبکه، پیام واضح درباره وضعیت ذخیره نمایش داده شود.

## ۱۵. کیفیت، آزمون و دروازه‌های CI/CD

### ۱۵.۱. هرم آزمون

- Unit: domain validation، policy، محاسبه وابستگی و stage machine با clock/ID mock.
- Integration: PostgreSQL واقعی برای قیود مصاحبه یکتا، ایندکس انتساب، قفل تصمیم همزمان، تراکنش audit/outbox و query scope.
- API contract: OpenAPI schema، Error codes، negative authorization، idempotency و regression.
- E2E: Playwright برای گردش پذیرش، کارآموز، کارورز، منابع، تبیین، تجویز، سناریو، چت و مدیریت.
- Non-functional: k6/Artillery، امنیت OWASP ASVS، دسترس‌پذیری/RTL، بازیابی بکاپ.

### ۱۵.۲. گیت‌های Pull Request

`format:check → lint → typecheck → unit → integration → contract → build → dependency/secret scan`؛ e2e smoke برای PRهای ماژول حساس و suite کامل در release candidate. برای migration، `up` و compatibility rollout در Staging بررسی شود؛ هیچ migration مخرب بدون plan و approve.

### ۱۵.۳. Definition of Ready (DoR)

هر Story دارای شناسه FR/BR، سناریوی کاربر، scope، ورودی/خروجی، DTO، state transition، error cases، audit/event، UI states، تست‌های مثبت/منفی، وابستگی و owner/reviewer است. مسئله‌ای که در سیاست محصول باز نیست نباید با حدس تیم تغییر کند.

### ۱۵.۴. Definition of Done (DoD)

کد Merge شده با Review، دسترسی و حالت معتبر، migration، unit/integration/security negative tests، OpenAPI آپدیت، UI RTL تست‌شده، audit/outbox، runbook/monitoring متناسب، feature flag و سناریوی UAT پذیرفته؛ مستندات معماری و وضعیت بک‌لاگ به‌روزرسانی شده‌اند.

## ۱۶. نقشه راه اجرایی از صفر تا استقرار

نقشه راه «ترتیب وابستگی‌ها» است؛ هفته و هزینه قطعی ندارد. هر مرحله یک Demo، شواهد تست و Gate تصویب دارد. آماده‌سازی فنی و UX می‌توانند تا حد کنترل‌شده همپوشانی داشته باشند.

| گام | Epicهای اصلی | خروجی قابل تحویل | گیت خروج |
|---|---|---|---|
| M0: تثبیت معماری | ADR، مدل تهدید، permission matrix، domain glossary، انتخاب provider | Architecture Baseline 1.0 + قراردادهای حساس | تأیید مالک محصول/مسئول فنی |
| M1: Foundation | pnpm monorepo، CI، Docker، DB migrations، logging، OpenAPI، design system | نسخه اجراشدنی health+CI | راه‌اندازی تکرارپذیر Local/Staging |
| M2: Identity & Admission | applicants، OTP، MFA، role/stage، admission/reopen | پذیرش تا کارآموز | AT-01/02/03، تست negative |
| M3: Assignment & Core Research | assignments/scope، research issue، resources/interview/report، drafts | منابع و داوری | AT-04، تعارض همزمان، منحصر به فرد بودن مصاحبه |
| M4: Scientific Lifecycle | تبیین، تجویز، سناریو، change request، dependency invalidation | چرخه پژوهش کامل | AT-05/06/07/08/13/16/29/33 |
| M5: Management & Communications | پنل‌ها، audit view، chat، notifications، archive workflow | عملیات مدیریتی کامل | AT-09/10/11/12/14/15/31/32/34 |
| M6: Hardening & Launch | performance، security، backup restore، UAT، آموزش | Release Candidate و Production | دروازه D-06 و Go/No-Go |

### ۱۶.۱. ترتیب کارهای حیاتی و وابستگی

1. قرارداد نقش/Scope و Applicant بدون User باید **قبل** از ساخت Identity/Admission تثبیت شود.
2. مدل State Machine/Revision/Review قبل از فرم‌های پژوهشی نهایی و قبل از راه‌اندازی چند مدیر علمی مشخص شود.
3. زیرساخت Storage و Upload session قبل از ورود گزارش مصاحبه به جریان اصلی ساخته شود.
4. Audit و Outbox پیش از ایجاد عملیات حساس پیاده‌سازی شوند، نه به‌عنوان فاز زیباسازی انتهایی.
5. Archive/Retention با داده تست و سیاست دسترسی قبل از ورود داده واقعی آماده باشد.
6. تولید OpenAPI client، boundary lint و CI از ابتدای Repository فعال باشند.

### ۱۶.۲. بسته‌های کار با شناسه اجرایی

| Work package | نمونه Story/Task قابل شکست | پیش‌نیاز | معیار قبولی |
|---|---|---|---|
| WP-01 Foundation | workspace, TypeScript strict, ESLint, format, Codeowners | M0 | `pnpm verify` موفق |
| WP-02 DevOps | compose local, registry, staging, migrations, health | WP-01 | deploy repeatable |
| WP-03 Identity | OTP challenge, MFA, session/revoke, suspension | WP-01 | OTP replay/expired rejected |
| WP-04 Permission | policies, delegation, scope query, audit | WP-03 | 403/404 unauthorized test |
| WP-05 Admission | applicant draft, review, reject/archive/reopen | WP-03/04 | بدون user تا approval |
| WP-06 Research | research create, owner assignment, stage state | WP-04 | پژوهش‌های موازی مستقل |
| WP-07 Resource | resource, person, org, interview unique | WP-06 | دومی rejected even API |
| WP-08 Files/Reports | upload, antivirus/scan, revisions, reports | WP-02/07 | گزارش در فرم جدا، private |
| WP-09 Review | submission, approve/rework, CAS, invalidation | WP-06/08 | only one valid decision |
| WP-10 Scenario | register, review, internal bank | WP-09 | فقط approved published internally |
| WP-11 Messaging | private conversation, socket, archive | WP-03/04/02 | no cross-scope read |
| WP-12 Oversight | audit search, notification, action dashboards | WP-04/09 | actor trace and selective alerts |
| WP-13 Archive/DR | close, archive, backup/PITR, restore | WP-02/11 | recovery drill proven |
| WP-14 Final UAT | end-to-end, security, load, docs, handover | all | sign-off evidence |

## ۱۷. ریسک‌ها، پاسخ و تصمیم‌های باز

| ریسک | احتمال/اثر کیفی | کنترل/اقدام |
|---|---|---|
| تغییر دامنه پنهان و افزودن فاز آینده | زیاد/زیاد | FR traceability، CR رسمی، feature flags |
| ناسازگاری تصمیم دو مدیر | متوسط/زیاد | transaction/CAS، unique، idempotency، race test |
| افشای داده استان/پرونده | متوسط/بسیار زیاد | server-side scope، negative tests، audit |
| از بین رفتن فایل یا چت آرشیوی | متوسط/بسیار زیاد | S3 private، manifest، backup جدا، restore drill |
| وابستگی به ارائه‌دهنده ایرانی | متوسط/زیاد | adapter، export/runbook، آزمون switching |
| قطع شبکه/سرویس SMS | متوسط/متوسط | SMS adapter، monitoring، retry controlled |
| مهاجرت مخرب دیتابیس | متوسط/زیاد | expand-contract migrations، staging، restore plan |
| پایش و لاگ حاوی داده حساس | متوسط/زیاد | redaction و ACL، retention policy |
| رشد اتصال چت/فایل | نامعلوم/متوسط | load test، worker isolation، queue on demand |

### ۱۷.۱. دفتر تصمیم معماری و وضعیت

| ID | تصمیم | وضعیت | اقدام لازم |
|---|---|---|---|
| DEC-001 | میزبانی داخل ایران | انتخاب‌شده توسط کاربر | بررسی تعهد محل داده در قرارداد |
| ADR-001 | Modular Monolith + API-First | پیشنهادی | تصویب مسئول فنی |
| ADR-002 | React + Vite برای پنل، NestJS برای API | پیشنهادی | PoC و سازگاری تیم |
| ADR-003 | PostgreSQL + Drizzle | پیشنهادی | PoC همزمانی/مهاجرت |
| ADR-004 | pnpm Monorepo، مرز ماژول و OpenAPI client | پیشنهادی | تثبیت tooling |
| ADR-005 | دو VPS برای Production، Object Storage مستقل | پیشنهادی (تأیید نشده) | مقایسه VPS/Managed، قیمت و شبکه |
| ADR-006 | Outbox + DB-backed Worker در شروع | پیشنهادی | آزمون حجم و نیاز Redis |
| ADR-007 | Session و MFA مستقل برای مدیران | پیشنهاد اجرایی مطابق RFP | تصویب روش و سیاست بازیابی عامل |
| ADR-008 | RPO ۱ ساعت و RTO ۴ ساعت | هدف پیشنهادی، نه تعهد | Restore Drill و تصویب |
| ADR-009 | تفکیک منطقی آرشیو از داده فعال | پیشنهادی مطابق الزام RFP | Retention/ACL/Restore approval |
| ADR-010 | حد ۲۵MB برای فایل معمولی | فقط هدف اولیه RFP | تصویب limits بر حسب MIME/use case |
| ADR-011 | دوره نگهداری/حذف داده مصاحبه و چت | باز؛ نیاز حقوقی/محصولی | سیاست رسمی پیش از Production |
| ADR-012 | SMS، VPS و S3 Provider ایرانی | باز | PoC کیفیت، قرارداد، انتقال‌پذیری |
| ADR-013 | انتخاب دقیق Router، Test Runner و Node LTS | باز اجرایی | ADR+lockfile نخستین Sprint |

### ۱۷.۲. تصویب‌های اجباری قبل از Production

تأیید فنی topology و محیط‌ها؛ نوع/سقف فایل و روش اسکن؛ سیاست نگهداری/حذف قانونی و مجوز آرشیو؛ پشتیبان‌گیری و RPO/RTO قابل سنجش؛ گزارش تست امنیت، بار، Backup Restore؛ ماتریس نقش/Scope و UAT؛ Runbook استقرار/بازگشت و مالک عملیات؛ آموزش مدیران و راهنمای توسعه.

## ۱۸. معماری دانش و مستندسازی زنده

برای جلوگیری از فرسودگی پروپزال، `docs/` مرجع زنده باشد: هر تغییر مهم با ADR، هر تغییر دامنه با Change Request و هر Story با لینک FR، Test و PR. در README فقط راه‌اندازی، مسیرهای اصلی و لینک مستندات قرار گیرد. **منبع حقیقت قواعد محصول RFP v1.0 است و این پروپزال فقط نحوه پیاده‌سازی را تعیین می‌کند**؛ تضادها به مالک محصول ارجاع و به‌عنوان تغییر دامنه ثبت شوند.

### ۱۸.۱. استاندارد مستندات ماژول

هر README ماژول با قالب: هدف؛ قوانین FR/BR؛ Entityها؛ State/Transition؛ API و Eventها؛ ماتریس دسترسی؛ فایل‌ها و داده حساس؛ Error codeها؛ تست‌های ضروری؛ محدودیت‌های performance؛ مالک و reviewer؛ ADR مرتبط. مستند صرفاً نتیجه کد نیست، بخشی از Definition of Done است.

### ۱۸.۲. استاندارد ADR

`Context → Decision → Alternatives → Consequences → Status → Date → Owner → RFP References → Validation evidence`. ADR پذیرفته‌شده «Immutable» تاریخی است و تغییر مسیر با ADR جدید و لینک `Supersedes` ثبت شود.

## ۱۹. معیار آماده‌بودن عملیاتی و تحویل

- **آمادگی کد:** branch protection، CI، مستند API، تست موضعی و end-to-end، SBOM/dependency scan، secret scan.
- **آمادگی اطلاعات:** کلیدگذاری، Migration نسخه‌دار، حقوق دسترسی، روش پاک‌سازی/Retention، Audit Search و Archive Restore.
- **آمادگی زیرساخت:** DNS/TLS، Firewall، Backup و آزمون Restore، Log/Metric/Alert، Runbook، حساب اضطراری کنترل‌شده.
- **آمادگی محصول:** UAT سناریوهای AT-01 تا AT-34 و موارد حساس FR-056 تا FR-062، آموزش کاربران، مستندات و برنامه رفع ایراد.
- **Go/No-Go:** خطاهای بحرانی در ورود/مجوز/داوری/بازگشت/آرشیو یا شکست Restore Drill اجازه انتشار نمی‌دهند.

## ۲۰. منابع مرجع و مبنای استناد

۱. **مرجع الزام‌آور محصول:** `TStaff_Requirements_Final_v1.0_BNazanin_RTL.docx`، نسخه ۱.۰، ۱۶ آبان ۱۴۰۵، به‌ویژه بخش‌های ۳ تا ۹، ۱۸ تا ۲۲، FR-001…FR-062، BR-01…BR-19، D-01…D-07.  
۲. NestJS Documentation: https://docs.nestjs.com/  
۳. pnpm Workspaces: https://pnpm.io/workspaces  
۴. PostgreSQL Documentation (CREATE INDEX / Unique Indexes / PITR): https://www.postgresql.org/docs/current/  
۵. OWASP ASVS 5.0.0: https://asvs.owasp.org/  
۶. Docker Compose Production: https://docs.docker.com/compose/how-tos/production/  
۷. OWASP File Upload Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html

> این منابع برای توجیه انتخاب‌های مهندسی‌اند؛ هر جا RFP درباره داده، دامنه یا تصمیم محصول حکم صریح دارد، سند محصول بر برداشت عمومی از فناوری اولویت دارد.

## پیوست A. ماتریس ردیابی تمام نیازمندی‌های FR-001 تا FR-062

این ماتریس از **عناوین RFP v1.0** استخراج و با ماژول و گام اجرایی پیشنهادی نگاشت شده است؛ عنوان‌ها متعلق به RFP، نگاشت‌ها و گیت‌ها پیشنهاد فنی‌اند. ارجاع AT در صورت وجود از آزمون‌های RFP است و جایگزین تست‌های ریزتر نمی‌شود.

| شناسه | عنوان نیازمندی RFP | ماژول مالک پیشنهادی | گام | شاهد UAT |
|---|---|---|---|---|
| FR-001 | ثبت متقاضی توسط مدیر استانی | `applicants` | M2 | AT-01 |
| FR-002 | ارجاع برای مصاحبه/تأیید علمی | `applicants/reviews` | M2 | تست اختصاصی + بازبینی FR |
| FR-003 | شروع فعالیت در وضعیت کارآموز | `identity/documents/messaging` | M2 | AT-02 |
| FR-004 | تأیید ارتقا به کارورز | `identity` | M2 | AT-03 |
| FR-005 | ارتقا به مسئله‌پژوه | `OUT-OF-MVP` | Future | تست اختصاصی + بازبینی FR |
| FR-006 | کتابخانه منابع و شیوه‌نامه‌ها | `documents/files` | M2 | تست اختصاصی + بازبینی FR |
| FR-007 | مدیریت نسخه اسناد | `documents/files` | M2 | تست اختصاصی + بازبینی FR |
| FR-008 | تعریف مسئله توسط مدیر علمی | `research/assignments` | M3 | تست اختصاصی + بازبینی FR |
| FR-009 | پرونده و وضعیت پژوهش | `research` | M3 | تست اختصاصی + بازبینی FR |
| FR-010 | ثبت منابع بدون سقف تجاری ثابت | `resources` | M3 | تست اختصاصی + بازبینی FR |
| FR-011 | اطلاعات فرد مصاحبه‌شونده | `resources` | M3 | تست اختصاصی + بازبینی FR |
| FR-012 | اطلاعات مجموعه وابسته | `organization/resources` | M3 | تست اختصاصی + بازبینی FR |
| FR-013 | ثبت مشخصات مصاحبه | `resources` | M3 | AT-04, AT-30 |
| FR-014 | گزارش و فایل‌های هر منبع | `resources/files` | M3 | AT-04, AT-30 |
| FR-015 | ورود به تبیین پس از تکمیل منابع | `research/reviews` | M3 | AT-04 |
| FR-016 | ارسال گزارش تبیین | `research/reviews` | M4 | تست اختصاصی + بازبینی FR |
| FR-017 | بازخورد و اصلاح تبیین | `research/reviews` | M4 | AT-05 |
| FR-018 | تأیید تبیین | `research/reviews` | M4 | AT-06 |
| FR-019 | ارسال/اصلاح گزارش تجویز | `research/reviews` | M4 | AT-07 |
| FR-020 | تأیید تجویز و شروع سناریو | `research/reviews` | M4 | AT-07 |
| FR-021 | ایجاد سناریو | `scenarios` | M4 | AT-08 |
| FR-022 | بایگانی پژوهش‌ها و درخواست تغییر | `reviews/change-requests` | M4 | AT-13 |
| FR-023 | آماده‌سازی داده سناریو برای بانک آینده | `scenarios` | M4 | تست اختصاصی + بازبینی FR |
| FR-024 | چت‌روم کاربران | `messaging` | M5 | AT-10 |
| FR-025 | نگهداری تاریخچه و بایگانی چت | `messaging/archival` | M5 | AT-14 |
| FR-026 | پنل مدیر استانی | `reporting/authorization` | M5 | AT-09/15 |
| FR-027 | کارتابل مدیر علمی | `reviews/reporting` | M5 | تست اختصاصی + بازبینی FR |
| FR-028 | داشبورد مدیر پیگیری | `assignments/audit/reporting` | M5 | تست اختصاصی + بازبینی FR |
| FR-029 | ارجاع به معاونان پیگیری | `authorization/assignments` | M5 | AT-11 |
| FR-030 | چت مدیر پشتیبانی | `messaging` | M5 | تست اختصاصی + بازبینی FR |
| FR-031 | پنل مدیر کل | `reporting/settings` | M5 | تست اختصاصی + بازبینی FR |
| FR-032 | ممیزی تصمیم‌ها و رویدادهای حساس | `audit` | M1+M5 | AT-29/31/32 |
| FR-033 | آرشیو متقاضی ردشده و بررسی مجدد | `applicants` | M2 | تست اختصاصی + بازبینی FR |
| FR-034 | چرخه داوری منابع | `reviews` | M3 | تست اختصاصی + بازبینی FR |
| FR-035 | تعلیق حساب و بازگشت مرحله | `identity/research` | M4 | AT-12 |
| FR-036 | تأیید اصلاح محتوای بایگانی‌شده | `reviews/change-requests` | M4 | تست اختصاصی + بازبینی FR |
| FR-037 | انتساب بین‌استانی مدیر استانی | `assignments/authorization` | M3 | AT-15 |
| FR-038 | دسترسی عملیاتی معاون پیگیری | `authorization` | M3 | تست اختصاصی + بازبینی FR |
| FR-039 | آرشیو پایدار چت خصوصی | `archival/messaging` | M5 | تست اختصاصی + بازبینی FR |
| FR-040 | داوری علمی سناریو و درج در بانک | `scenarios/reviews` | M4 | AT-16 |
| FR-041 | چند پژوهش همزمان و مدیران علمی هم‌سطح | `research/assignments` | M3 | تست اختصاصی + بازبینی FR |
| FR-042 | فیلد سن اجباری | `applicants/resources` | M2+M3 | تست اختصاصی + بازبینی FR |
| FR-043 | گام مستقل بارگذاری گزارش مصاحبه | `resources/files` | M3 | تست اختصاصی + بازبینی FR |
| FR-044 | ذخیره پیش‌نویس و فرم‌های چندمرحله‌ای | `applicants/resources/scenarios` | M3+M4 | تست اختصاصی + بازبینی FR |
| FR-045 | انتساب مدیر علمی اصلی و همکار | `assignments/reviews` | M3 | تست اختصاصی + بازبینی FR |
| FR-046 | کنترل مرکز انتساب‌ها | `assignments` | M3 | تست اختصاصی + بازبینی FR |
| FR-047 | لاگ تصمیم علمی برای پیگیری | `audit` | M1+M5 | تست اختصاصی + بازبینی FR |
| FR-048 | داشبوردهای ساده نقش‌محور | `reporting` | M5 | تست اختصاصی + بازبینی FR |
| FR-049 | ورود OTP و کنترل مدیران | `identity` | M2 | AT-01 |
| FR-050 | مرکز اعلان درون‌سامانه‌ای | `notifications` | M5 | تست اختصاصی + بازبینی FR |
| FR-051 | تایم‌لاین پرونده | `audit/research` | M4 | تست اختصاصی + بازبینی FR |
| FR-052 | تنظیمات قابل مدیریت | `settings` | M5 | تست اختصاصی + بازبینی FR |
| FR-053 | درخواست تغییر روی داده تأییدشده | `reviews/change-requests` | M4 | تست اختصاصی + بازبینی FR |
| FR-054 | تغییر مدیر علمی بدون اختلال | `assignments/research` | M3 | تست اختصاصی + بازبینی FR |
| FR-055 | آرشیو امن و توسعه‌پذیر | `archival/files` | M5 | تست اختصاصی + بازبینی FR |
| FR-056 | ثبت سن فقط به‌صورت عددی | `applicants/resources` | M2+M3 | AT-28 |
| FR-057 | کفایت یک تصمیم علمی معتبر | `reviews` | M4 | AT-29 |
| FR-058 | رابطه یکتای منبع و مصاحبه | `resources` | M3 | AT-30 |
| FR-059 | حدود انتساب مدیر علمی همکار | `assignments` | M3 | AT-31 |
| FR-060 | سیاست نظارت و اعلان گزینشی | `audit/notifications` | M5 | AT-32 |
| FR-061 | بازبینی مراحل وابسته پس از بازگشت | `research/reviews` | M4 | AT-33 |
| FR-062 | آرشیو پایدار و دروازه تصویب زیرساخت | `archival/operations` | M5+M6 | AT-34 |

## پیوست B. کنترل اختلاف تفسیر و اولویت منابع

| موضوع | برداشت اجرایی درست | مرجع و کنترل |
|---|---|---|
| اعلان‌های FR-050 در برابر D-04/FR-060 | اعلان مرتبط با اقدام کاربر مقصد می‌تواند در Inbox او ثبت شود؛ **اعلان فوری نظارتی مدیر پیگیری** فقط تعلیق، انتقال مسئول و رخدادهای نیازمند رسیدگی را پوشش دهد. تأیید عادی در Audit Search قابل بازیابی است. | RFP FR-050 و D-04/FR-060؛ تست AT-32 |
| هر پژوهش چند مدیر علمی | دقیقاً یک مدیر اصلی فعال، حداکثر یک همکار فعال در MVP؛ اختیار داوری برابر؛ تأیید یکی کافی؛ انتساب با پیگیری/تفویض صریح. | D-02, D-03, BR-13, FR-057/059 |
| رابطه منبع و مصاحبه | Draft می‌تواند فاقد مصاحبه باشد؛ هنگام «اتمام» دقیقاً یک مصاحبه و یک گزارش اصلی با revision؛ مصاحبه دوم در API و DB ممنوع. | D-07, BR-16, FR-058 |
| برگشت مرحله پس از تأیید | خروجی‌های تاریخی محفوظ؛ خروجی وابسته جاری غیرنهایی و نیازمند بازبینی؛ بانک سناریو نباید نسخه نامعتبر را منتشر کند. | D-05, BR-18, FR-061 |
| حد فایل و ظرفیت | ۲۵MB، ۱۰۰ کاربر همزمان و P95<2s هدف آزمون است، نه تعهد/سقف کلی دائمی؛ صدور SLA پس از تست. | RFP بخش‌های ۲ و ۹، D-06 |
| نقش مدیر کل در برابر تصمیم علمی | مدیر کل به‌صورت پیش‌فرض مسئول تصمیم علمی پرونده نیست؛ کنترل فنی با داوری علمی تفکیک شود. | RFP FR-031 و فصل نقش‌ها |
| آرشیو و حذف داده | دوام آرشیو و دسترسی محدود الزام است؛ زمان نگهداری و حذف قانونی عدد مصوب ندارد و باید قبل از داده واقعی تصویب شود. | D-06, FR-025/039/062 |

## پیوست C. دستورهای مبنا برای تیم توسعه

```bash
# پیش‌نیاز: Node LTS و Corepack/pnpm نسخه مصوب ADR
corepack enable
pnpm install --frozen-lockfile

# محیط توسعه (طبق فایل‌های repo scaffold)
docker compose -f infra/compose/compose.dev.yml up -d
pnpm dev

# کیفیت پیش از PR
pnpm lint
pnpm typecheck
pnpm test
pnpm build

# اعمال migration صرفاً با اسکریپت مصوب و Backup مناسب
pnpm db:migrate
```

**تذکر اجرایی:** دستورات فوق قرارداد هدف Repository هستند؛ بسته Blueprint همراه، نمونه ساختار/مستندات و حداقل فایل‌های آغاز کار است و تا پیش از نصب وابستگی‌ها و اجرای PoC نباید به‌عنوان سامانه عملیاتی یا Repository تکمیل‌شده تلقی شود.

## پیوست D. دستور کار عملی «روز صفر» و آماده‌سازی Sprint نخست

این پیوست پیشنهاد اجراست و هیچ فناوری یا زمان‌بندی جدیدی را به مصوبات محصول تحمیل نمی‌کند. مسئول فنی پس از تأیید اولیه، هر ردیف را در ابزار مدیریت پروژه به Epic/Story/Task با مالک و معیار پذیرش تبدیل می‌کند.

| ترتیب | اقدام واقعی | خروجی کنترل‌پذیر | معیار توقف/قبولی |
|---|---|---|---|
| D0-01 | ثبت RFP v1.0 در مخزن مستندات و تعیین Product Owner | شناسه منبع حقیقت و Change Request template | لینک مستقیم FR/BR/D در هر Story |
| D0-02 | تصویب ADR معماری و انتخاب‌های تکنولوژی | ADR-001 تا ADR-004 با مسئول و تاریخ | بدون ADR، هیچ سرویس نهایی انتخاب نشود |
| D0-03 | نهایی‌سازی سیاست Role/Scope/Delegation | ماتریس CRUD/Action برای هر نقش و پرونده | تست منفی برای مدیر غیرمنتسب |
| D0-04 | PoC همزمانی دو مدیر علمی | تراکنش تصمیم نمونه + تست Race واقعی در PostgreSQL | تنها یک تصمیم معتبر، دیگری 409 |
| D0-05 | PoC Applicant بدون User | مدل پذیرش + تأیید/رد + ساخت حساب | قبل از approval هیچ user ایجاد نشود |
| D0-06 | PoC یکتایی مصاحبه | UNIQUE و اعتبارسنجی تکمیل منابع | مصاحبه دوم از API رد شود |
| D0-07 | ارزیابی Provider داخل ایران | برگه امتیاز VPS/DB/S3/SMS و تست شبکه | موقعیت داده، پشتیبانی و Backup مستند |
| D0-08 | Bootstrap واقعی Monorepo | pnpm lockfile، NestJS، Vite و migrations | CI سبز و یک فرمان اجرای محلی |
| D0-09 | تعریف قرارداد OpenAPI + client generator | API sample versioned و client تولیدشده | Frontend بدون import از ORM کار کند |
| D0-10 | ساخت Audit/Outbox پایه | یک عملیات حساس اتمیک + Worker mock | قطع Worker تصمیم اصلی را خراب نکند |
| D0-11 | آماده‌سازی داده مصنوعی، UX و UAT | Fixture roles/cases و سناریوهای انتها به انتها | آزمون بدون داده واقعی |
| D0-12 | طراحی Release Gate و عملیات | Runbook، Backup/Restore برنامه‌ریزی‌شده | معیارهای Go/No-Go کتبی |

**تعریف خروجی Sprint نخست:** یک مخزن قابل نصب و اجرا با Frontend پوسته، API سلامت، PostgreSQL محلی، migration نمونه، احراز هویت آزمایشی (نه واقعی Production)، مستند OpenAPI، CI سالم، آزمایش تعارض تصمیم علمی و تست سطح دسترسی منفی؛ هیچ ادعایی درباره تکمیل قابلیت‌های محصول مطرح نشود.

**توصیه ساختاری برای مقیاس بلندمدت:** قبل از افزودن ابزارهای جدید، ابتدا یک مسئله واقعی را با مرزهای ماژول، قرارداد پایدار، تست همزمانی و مشاهده‌پذیری حل کنید. اگر این معماری در نمونه کوچک قابل آزمون و استقرار تکرارپذیر نباشد، افزودن Kubernetes، صف توزیع‌شده یا Microservices صرفاً مشکل را بزرگ‌تر خواهد کرد.

## پیوست E. برگه تصویب داخلی و انتقال مسئولیت

این بخش باید پس از بازبینی با اطلاعات واقعی تکمیل شود. «موافقت کلی با پروپزال» جایگزین گیت‌های امنیت و بهره‌برداری نیست؛ تصویب هر مورد مهم باید دارای نام مسئول، تاریخ، نسخه مستند و شواهد آزمون باشد.

| موضوع مصوبه | مسئول تصویب | سند یا شاهد موردنیاز | وضعیت در نسخه ۰.۱ |
|---|---|---|---|
| مرز محصول و Traceability | مالک محصول | RFP v1.0 + ماتریس FR | مبنا مشخص؛ امضا لازم |
| معماری و پشته نهایی | مسئول فنی | ADR، PoC و ریسک‌ها | پیشنهادی |
| سیاست نقش و انتساب | مالک محصول + امنیت | Permission Matrix و تست منفی | نیازمند بررسی جزئی |
| میزبانی و محل داده ایران | زیرساخت + مدیریت | قرارداد Provider و طرح شبکه | موقعیت ایران انتخاب‌شده؛ توپولوژی باز |
| امنیت هویت و اطلاعات | مسئول امنیت | Threat Model، ASVS، MFA، اسکن فایل | نیازمند تصویب اجرایی |
| آرشیو، حذف قانونی و بکاپ | مسئول داده + عملیات | Retention Policy و Restore Drill | مقادیر باز |
| انتشار نسخه MVP | مالک محصول + مسئول فنی | گزارش UAT، بار، امنیت و Go/No-Go | فقط پس از M6 |

**مسئولیت تداوم مستندات:** مالک محصول قواعد FR/BR و تغییر دامنه را نگهداری می‌کند؛ مسئول فنی ADRها، نقشه ماژول‌ها و قرارداد API را به‌روز نگه می‌دارد؛ مسئول DB/DevOps مالک Migration، Backup و Runbook است؛ QA مالک شواهد سناریوهای پذیرش است. هیچ انتقال مسئولیتی نباید بدون دسترسی به Repository، اسرار سازمانی از مسیر امن، رویه استقرار و شیوه بازیابی انجام شود.

**وضعیت نهایی این نسخه:** Baseline پیشنهادی برای شروع تحلیل معماری و Bootstrap؛ **نه تصویب قطعی دو VPS، نه تعهد RPO/RTO، نه پایان توسعه نرم‌افزار**. با امضای ADRها و تکمیل خروجی M0، این سند می‌تواند به «Technical Baseline v1.0» ارتقا پیدا کند.
