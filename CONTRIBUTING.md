# راهنمای مشارکت در توسعه TStaff

## اصول راهبردی

1. **مرجعیت سند نیازمندی‌ها (RFP v1.0):** هر قابلیت یا تغییر در منطق باید به یکی از شناسه‌های `FR-001` تا `FR-062`، `BR-01` تا `BR-19`، یا مصوبات `D-01` تا `D-07` متصل باشد. هیچ تغییری در دامنه بدون ثبت رسمی Change Request پذیرفته نیست.
2. **مرزهای لایه‌بندی معماری:**
   - لایه Domain در ماژول‌های API نباید هیچ وابستگی به NestJS، ORM یا کتابخانه‌های HTTP داشته باشد.
   - لایه Application صرفاً از طریق Portها با زیرساخت در ارتباط است.
   - رابط کاربری `apps/web` به هیچ عنوان مجاز به ایمپورت از `apps/api/src` یا `packages/database` نیست؛ تمام تعاریف مشترک از طریق `packages/contracts` منتقل می‌شوند.

---

## نام‌گذاری شاخه‌ها (Branch Naming)

- برای نیازمندی‌های عملکردی: `feat/FR-XXX-short-title` (مثال: `feat/FR-001-applicant-registration`)
- برای رفع باگ: `fix/FR-XXX-short-title` یا `fix/issue-description`
- برای زیرساخت و معماری: `chore/M0-baseline-setup` یا `refactor/module-port-cleanup`

---

## قالب پیام‌های Commit (Conventional Commits)

پیام‌های Commit باید از استاندارد Conventional Commits پیروی کنند:

```text
<type>(<scope>): <short description in persian or english>

[optional body referencing FR/BR/AT]
```

انواع مجاز:
- `feat`: ویژگی جدید
- `fix`: رفع خطا
- `refactor`: بازآرایی کد بدون تغییر در رفتار بیرونی
- `test`: افزودن یا اصلاح آزمون‌ها
- `docs`: به‌روزرسانی مستندات
- `chore`: تغییرات پیکربندی، ابزارها و نگهداری

---

## چک‌لیست پیش از Pull Request

پیش از ثبت PR، اطمینان حاصل کنید:
- [ ] دستور `pnpm lint` بدون خطا پاس می‌شود.
- [ ] دستور `pnpm typecheck` موفق است.
- [ ] دستور `pnpm test` تمام تست‌های واحد و یکپارچه را پاس می‌کند.
- [ ] مرزهای ماژول با `pnpm test:boundaries` کنترل شده است.
- [ ] هیچ کلید یا متغیر محرمانه‌ای در کد وارد نشده است.
- [ ] برای تغییرات مهم، آزمون‌های منفی دسترسی (Negative Authorization Tests) نوشته شده است.

