# عملیات، پشتیبان‌گیری و استقرار در ایران (Operations & Infrastructure)

## توپولوژی استقرار اولیه (Production)
- **VPS-A (برنامه):** Reverse Proxy (Nginx/Caddy) + API NestJS + Worker + Static Web Build.
- **VPS-B (پایگاه داده):** PostgreSQL با NVMe، اتصال امن صرفاً از طریق Private Network/VPN.
- **Object Storage:** ذخیره‌سازی S3 سازگار با موقعیت جغرافیایی ایران.
- **Backup Repository:** مخزن بکاپ مستقل خارج از سرورهای اجرا برای Disaster Recovery.

## اهداف سنجه بازیابی (Targets)
- **RPO <= 1 ساعت:** از طریق تهیه پشتیبان پایه (Base Backup) و آرشیو WAL.
- **RTO <= 4 ساعت:** از طریق Runbook بازگردانی استاندارد و دیتابیس جایگزین.

## ذخیره‌سازی فایل خصوصی و متغیرهای اجرا
- فایل‌های باینری خارج از PostgreSQL نگهداری می‌شوند؛ جدول `stored_objects` فقط فراداده، `storage_provider` (`LOCAL` یا `S3`)، `bucket` و وضعیت اسکن را ذخیره می‌کند تا فایل‌های قبلی با تغییر ارائه‌دهنده گم نشوند.
- در توسعه، آداپتور خصوصی محلی (`FILE_STORAGE_PROVIDER=LOCAL`، مسیر `PRIVATE_FILES_DIR` با پیش‌فرض `var/private-files`) فعال است. برای S3 متغیرهای `S3_BUCKET`، `S3_ENDPOINT`، `S3_REGION`، `S3_ACCESS_KEY`، `S3_SECRET_KEY` و `S3_FORCE_PATH_STYLE` تنظیم می‌شوند؛ `S3_SERVER_SIDE_ENCRYPTION=AES256` اختیاری است. سقف پیش‌فرض PDF/DOCX برابر `FILE_MAX_BYTES=26214400` است.
- مهاجرت روی دیتابیس هدف با `pnpm --filter @tstaff/database prisma migrate deploy` اجرا می‌شود. پس از `pnpm build` می‌توان API را با `node --env-file=.env apps/api/dist/main.js` اجرا کرد. `scripts/seed-data.mjs` فقط برای محیط توسعه و دادهٔ آزمایشی با گذرواژهٔ ثابت است. برای وب متصل به API مقدار `VITE_DEMO_MODE=false` لازم است.
- پیکربندی Vercel فقط وب استاتیک و مسیرهای SPA را ارائه می‌دهد. در میزبان `vercel.app` حالت دمو به‌صورت پیش‌فرض فعال است؛ API و ذخیره‌سازی واقعی باید جداگانه مستقر و پیکربندی شوند.

