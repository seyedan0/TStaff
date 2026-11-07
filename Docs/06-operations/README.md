# عملیات، پشتیبان‌گیری و استقرار در ایران (Operations & Infrastructure)

## توپولوژی استقرار اولیه (Production)
- **VPS-A (برنامه):** Reverse Proxy (Nginx/Caddy) + API NestJS + Worker + Static Web Build.
- **VPS-B (پایگاه داده):** PostgreSQL با NVMe، اتصال امن صرفاً از طریق Private Network/VPN.
- **Object Storage:** ذخیره‌سازی S3 سازگار با موقعیت جغرافیایی ایران.
- **Backup Repository:** مخزن بکاپ مستقل خارج از سرورهای اجرا برای Disaster Recovery.

## اهداف سنجه بازیابی (Targets)
- **RPO <= 1 ساعت:** از طریق تهیه پشتیبان پایه (Base Backup) و آرشیو WAL.
- **RTO <= 4 ساعت:** از طریق Runbook بازگردانی استاندارد و دیتابیس جایگزین.

