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

