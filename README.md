# سامانه مدیریت شبکه پژوهشگران TStaff

TStaff سامانه‌ای برای پذیرش متقاضیان، راهبری پژوهشگران و مدیریت چرخهٔ پژوهش «منابع، تبیین، تجویز و سناریو» است. برنامه در یک monorepo با معماری modular monolith نگهداری می‌شود.

## اسناد مرجع

- [نیازمندی‌های محصول نسخه ۱.۰](Docs/TStaff_Requirements_Final_v1.0%20%282%29.docx) و [راهنمای مخزن](AGENTS.md)
- [محدوده MVP](Docs/00-product/scope.md) و [ماتریس ردیابی](Docs/00-product/traceability.md)
- [معماری](Docs/01-architecture/README.md)، [API](Docs/03-api/README.md)، [داده](Docs/04-data/README.md)، [عملیات](Docs/06-operations/README.md) و [کیفیت و CI](Docs/07-quality/README.md)
- [نقشه راه](Docs/08-delivery/roadmap.md) و [تصمیمات معماری](Docs/adr/)

## ساختار و قابلیت‌ها

- `apps/web`: رابط فارسی React، Vite، React Router و Tailwind؛ صفحه‌های نقش‌محور با URL مستقل.
- `apps/api`: API مبتنی بر NestJS با ماژول‌های دامنه، اعتبارسنجی قراردادها و کنترل دسترسی سمت سرور.
- `apps/worker`: پردازش رویدادها و کارهای نگهداری.
- `packages/contracts`: قراردادهای مشترک و Zod؛ `packages/database`: مدل Prisma و migrationهای PostgreSQL.
- `infra/compose`: PostgreSQL، MinIO و ClamAV برای توسعهٔ محلی.

پروندهٔ متقاضی تا تأیید نهایی حساب کاربری ندارد؛ سن عدد صحیح مثبت است؛ هر منبع حداکثر یک مصاحبه دارد. مدیران علمی اصلی و همکارِ منتسب اختیار برابر دارند و تصمیم هم‌زمان با کنترل نسخه انجام می‌شود. بازگشت مرحله، تاریخچه را نگه می‌دارد و خروجی‌های وابسته را نیازمند بازبینی می‌کند. OTP، کنشگری، هدایت تحصیلی، تالار عمومی، پنل مسئله‌پژوه و اکسپلور عمومی سناریو خارج از MVP هستند.

## راه‌اندازی محلی

پیش‌نیازها: Node.js نسخهٔ ۲۰.۱۸ یا بالاتر، pnpm نسخهٔ ۹.۱۵ و Docker Compose. برای استفاده از API و فایل‌ها به PostgreSQL و ClamAV نیاز است؛ MinIO برای آداپتور S3 محلی است.

```bash
cp .env.example .env                 # در PowerShell: Copy-Item .env.example .env
pnpm install --frozen-lockfile
docker compose -f infra/compose/compose.dev.yml up -d
pnpm db:generate
pnpm --filter @tstaff/database prisma migrate deploy
pnpm build
pnpm dev
```

API به‌صورت پیش‌فرض در `http://localhost:4000/api/v1` و مستندات Swagger در `http://localhost:4000/api/docs` هستند. برای اجرای API با تنظیمات فایل محیط می‌توان پس از build از `node --env-file=.env apps/api/dist/main.js` استفاده کرد. آدرس وب در خروجی Vite نمایش داده می‌شود.

حالت پیش‌فرض وب روی `localhost` و دامنه‌های `vercel.app` نمایشی است و تغییرات را در مرورگر نگه می‌دارد. برای اتصال وب به API واقعی، `VITE_DEMO_MODE=false` و `VITE_API_URL` را در محیط Vite تنظیم کنید. [محدودیت‌ها و داده‌های دمو](Docs/07-quality/vercel-demo-seed.md) را ببینید.

اسکریپت `scripts/seed-data.mjs` حساب‌های آزمایشی با گذرواژهٔ ثابت می‌سازد؛ فقط پس از build و روی دیتابیس توسعهٔ مجزا اجرا شود. از آن برای دادهٔ عملیاتی استفاده نکنید.

## کنترل‌های کیفیت

```bash
pnpm test:boundaries
pnpm security:audit
pnpm typecheck
pnpm test
pnpm build
```

CI همین کنترل‌ها را پس از نصب وابستگی و تولید Prisma Client اجرا می‌کند. آزمون‌های API عمدتاً با repository ساختگی انجام می‌شوند؛ جایگزین آزمون واقعی migration، قیود PostgreSQL و بازیابی پشتیبان نیستند. دستور `pnpm lint` فعلاً در چند بسته placeholder است.

## استقرار

`vercel.json` فقط وب استاتیک را می‌سازد و rewrite مسیرهای React Router را فراهم می‌کند. این پیکربندی API، worker، PostgreSQL یا فضای فایل را مستقر نمی‌کند. برای محیط واقعی، API، پایگاه داده، ذخیره‌سازی خصوصی، اسکن فایل، تنظیمات CORS و پشتیبان‌گیری باید جداگانه فراهم شوند؛ جزئیات در [راهنمای عملیات](Docs/06-operations/README.md) آمده است.
