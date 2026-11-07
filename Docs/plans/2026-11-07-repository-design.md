# طرح آغاز مخزن TStaff

وضعیت: پیشنهادی برای تأیید کاربر  
تاریخ: ۲۰۲۶-۱۱-۰۷

هدف این مرحله ثبت نقشه راه و ایجاد مخزن اولیه با ساختار بخش ۵ پروپزال است. پیاده‌سازی قابلیت‌های محصول و نصب پشته اجرا در M1 و مراحل بعد قرار می‌گیرند.

## رویکرد

مسیر پیشنهادی، ساختار اولیه همراه مستندات و گیت است: تغییر کم‌حجم و قابل بازبینی، با مرزبندی روشن برای توسعه بعدی. ساخت فقط مستندات، درخواست ساختار را پوشش نمی‌دهد؛ راه‌اندازی کامل React/NestJS و CI دامنه بزرگ‌تری دارد و مستلزم تثبیت نسخه‌ها و تصمیم‌های M0 است. انتخاب مسیر نخست پیشنهاد این طرح است و هنوز تصویب فنی کل پروپزال محسوب نمی‌شود.

## ساختار پیشنهادی

```text
.github/                 templates و workflows پس از آماده‌شدن دستورات واقعی
apps/
  web/                   public، src/app، pages، features، entities، shared، e2e
  api/                   src/modules، src/platform، test
  worker/                src/outbox، handlers، maintenance، test
packages/
  contracts/             قراردادهای مستقل از ORM
  database/              schema، migrations و seed
  config/                تنظیمات مشترک ابزارها
  test-utils/            ابزار آزمون مشترک
infra/
  compose/
  proxy/
  monitoring/
  backup/
  runbooks/
Docs/
  00-product/
  01-architecture/
  02-domain/
  03-api/
  04-data/
  05-security/
  06-operations/
  07-quality/
  08-delivery/roadmap.md
  adr/
  plans/
scripts/
README.md
CONTRIBUTING.md
SECURITY.md
.gitignore
.editorconfig
```

نام فعلی Docs حفظ می‌شود؛ این پوشه معادل docs در پروپزال است و پوشه موازی با تفاوت حروف ایجاد نمی‌شود. منابع Word فعلی حفظ می‌شوند؛ نسخه Markdown پروپزال نیز برای ارجاع افزوده شود. packages/ui طبق شرط پروپزال فقط در صورت نیاز واقعی برنامه دوم ساخته شود. .husky و Turbo اختیاری‌اند و فعلاً اضافه نمی‌شوند.

ماژول‌های API: identity، applicants، organization، authorization، assignments، research، resources، reviews، scenarios، documents، files، messaging، notifications، audit، archival، reporting، settings. هر ماژول چهار لایه domain، application، infrastructure و presentation دارد. پوشه‌ها در مرحله ساختار با توضیح مسئولیت و نشانگر قابل ثبت در گیت نگهداری می‌شوند؛ فایل TypeScript صوری یا قابلیت ظاهراً اجراشدنی ساخته نمی‌شود.

## قیود توسعه

presentation به application و application به domain وابسته است؛ domain مستقل از NestJS و ORM می‌ماند. ارتباط بین ماژول‌ها فقط از رابط عمومی یا رویداد است. web به کد داخلی API یا database وابسته نمی‌شود. Worker از قرارداد رویداد و application port استفاده می‌کند. انتخاب React/Vite/TypeScript، NestJS، PostgreSQL و pnpm بر اساس پیشنهاد پروپزال است؛ نسخه‌های دقیق و ORM در ADR همراه شواهد سازگاری تثبیت می‌شوند.

## گیت و پذیرش

گیت محلی با شاخه main و origin معرفی‌شده کاربر آماده شود؛ پیش از push باید تاریخچه remote بررسی شود و هیچ force push یا بازنویسی تاریخچه انجام نشود. فایل‌های محرمانه، dependencies، خروجی build و داده واقعی وارد گیت نشوند. commit اولیه تنها فایل‌های بازبینی‌شده پروژه را شامل شود. نام و ایمیل نویسنده از تنظیمات واقعی گیت خوانده شود و جعل نشود.

پذیرش این مرحله: منابع حفظ شده، نقشه راه در Docs قرار گرفته، ساختار با پروپزال تطبیق داده شده، وضعیت قابلیت‌ها صریح است و وضعیت commit/push قابل گزارش است. ایجاد pipeline و manifest اجراشدنی، lockfile و نصب وابستگی‌ها جزو M1 است و تنها همراه ابزارها و کنترل‌های واقعی انجام می‌شود.
