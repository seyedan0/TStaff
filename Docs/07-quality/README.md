# استراتژی آزمون و تضمین کیفیت (Quality Assurance & Test Strategy)

## هرم آزمون (Testing Pyramid)
1. **Unit Tests (Vitest/Jest):**
   - اعتبارسنجی قوانین خالص دامنه، تغییرات ماشین وضعیت، محاسبه وابستگی‌ها بدون وابستگی به دیتابیس یا فریم‌ورک.
2. **Integration Tests (PostgreSQL واقعی):**
   - آزمون قیود یکتایی (`uq_interview_resource`, `uq_research_main_active`).
   - آزمون قفل و همزمانی دو مدیر علمی (Race condition).
   - آزمون تراکنش اتمیک درج در جدول دامنه + رویداد Outbox + Audit.
3. **API Contract & Negative Security Tests:**
   - تست‌های OpenAPI Schema، کدهای خطای Problem Details.
   - تست‌های رد دسترسی (403/404) برای کاربران بدون Scope مجاز.
4. **End-to-End Tests (Playwright):**
   - آزمون جریان کامل پذیرش تا کارآموزی، ثبت منابع، داوری تبیین و تجویز، و چت خصوصی.

## آستانه پوشش آزمون
- حداقل ۸۰٪ پوشش خطوط و شاخه‌ها برای ماژول‌های حیاتی (`applicants`, `research`, `reviews`, `assignments`, `authorization`).

## پوشه آزمون‌های تکمیلی و مرورگری (۲۰۲۶-۱۱-۱۰)
- **تست‌های یکپارچه‌سازی API (`apps/api/test/`):** شامل `workspace-bank-scenarios.spec.ts` (اولویت‌بندی کارتابل مدیر علمی، جداسازی دسترسی پروفایل و پرونده، تصمیم هم‌زمان `409 STALE_REVISION`، بازگشت مرحله `D-05`، محدوده استانی بانک منابع، محافظت ارجاع/تبدیل تکراری، عدم ایجاد کاربر پیش از تأیید علمی و حذف کاوش عمومی بانک سناریوها) و `organization-grants-and-reporting.spec.ts` (کنترل مجوز `user-grants`، قلمرو استانی و گزارش‌گیری محدود به استان).
- **تست‌های دمو و کلاینت وب (`apps/web/src/`):** شامل `navigation.test.ts` (مسیرهای URL و Negative AuthZ) و `demo.test.ts` (سازگاری ۸ حساب نمونه، شناسه‌های استان، مرتب‌سازی کارتابل، مسدودسازی `SCIENTIFIC_SUPERVISOR` در بانک منابع و تفکیک قلمرو استانی/کشوری).
- **آزمون مرورگری Playwright (محیط زنده API و نسخه نمایشی):** بررسی مستقیم لینک با حفظ `returnTo`، بازیابی صفحه پس از `F5`، تاریخچه Back/Forward مرورگر، نمایش موبایل `390x844`، فرم پیش‌پرشدن از بانک منابع، اعتبارسنجی عدد صحیح سن (`D-01`) و دیالوگ `UnsavedChangesDialog`، و پیام‌های `403` / `404` / `409`.

