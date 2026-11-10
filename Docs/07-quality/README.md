# راهنمای آزمون و CI

جریان GitHub Actions در `.github/workflows/ci.yml` روی push به `main` و شاخه‌های `feat/*` و روی pull request به `main` اجرا می‌شود. Node 20 و pnpm 9.15.0 نصب می‌شوند؛ سپس وابستگی‌ها با lockfile، بررسی مرزهای معماری، تولید Prisma Client، build بسته‌های دیتابیس و قراردادها، ممیزی امنیت، typecheck، آزمون‌ها و build اجرا می‌شوند.

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm --filter @tstaff/database build
pnpm --filter @tstaff/contracts build
pnpm test:boundaries
pnpm security:audit
pnpm typecheck
pnpm test
pnpm build
```

تولید Prisma Client در CI فقط به یک `DATABASE_URL` صوری نیاز دارد. مجموعه‌های API که repository ساختگی دارند، transaction runner و Prisma را نیز در محیط آزمون جایگزین می‌کنند؛ اتصال آن‌ها به دیتابیس توسعه لازم نیست. این transaction runner ساختگی rollback یا ایزوله‌سازی تراکنش PostgreSQL را اثبات نمی‌کند. برای بازسازی خطای قبلی می‌توان آزمون‌ها را با `DATABASE_URL=postgresql://dummy:dummy@127.0.0.1:1/dummy` اجرا کرد؛ آدرس باید فقط در همان فرایند آزمون تنظیم شود.

پوشش فعلی شامل آزمون‌های قرارداد و دامنه، آزمون سرویس و API با داده‌های ساختگی، دسترسی منفی، جریان علمی، بانک منابع، دمو و مسیریابی است. شناسه‌های FR و AT مربوط در آزمون‌ها درج شده‌اند. آزمون یکتایی واقعی دیتابیس، migration، رقابت تراکنش روی PostgreSQL، بازیابی پشتیبان و مرورگر واقعی باید به‌صورت جداگانه در محیط آزمایشی اجرا و ثبت شوند؛ CI فعلی آن‌ها را اجرا نمی‌کند. اسکریپت‌های `test` در بسته‌های database و test-utils و اسکریپت‌های lint چند بسته placeholder هستند و نشانهٔ پوشش واقعی نیستند.

پیش از انتشار، مسیرهای ورود، لینک مستقیم، refresh، Back/Forward، فرم دارای تغییر ذخیره‌نشده، دسترسی نقش‌ها و نمایش RTL و موبایل در مرورگر واقعی بررسی شوند. هدف پوشش ۸۰٪ برای بخش‌های حیاتی، هدف کیفیت است؛ اجرای فعلی CI گزارش یا آستانهٔ پوشش تولید نمی‌کند.
