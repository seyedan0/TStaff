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
- در توسعه، آداپتور خصوصی محلی (`FILE_STORAGE_PROVIDER=LOCAL`، مسیر `FILE_STORAGE_DIR`) فعال است و در محیط عملیاتی از آداپتور `S3` با متغیرهای `S3_BUCKET`، `S3_ENDPOINT`، `S3_REGION`، `S3_ACCESS_KEY`، `S3_SECRET_KEY`، `S3_FORCE_PATH_STYLE` و `S3_SERVER_SIDE_ENCRYPTION=AES256` استفاده می‌شود (سقف `FILE_MAX_BYTES=26214400` برای PDF/DOCX).
- برای اجرای لوکال پس از بیلد workspace (`pnpm build` شامل خروجی `@tstaff/contracts/dist`)، مهاجرت و داده اولیه با `pnpm --filter @tstaff/database prisma migrate deploy` و `node scripts/seed-data.mjs` اعمال می‌شود و API با `node --env-file=apps/api/.env apps/api/dist/main.js` بالا می‌آید. در وب محلی، برای اتصال به API واقعی باید `VITE_DEMO_MODE=false` تنظیم شود.

