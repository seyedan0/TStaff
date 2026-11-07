import { Injectable } from "@nestjs/common";

export interface GuidelineDocument {
  id: string;
  title: string;
  version: string;
  category: string;
  description: string;
  publishedAt: string;
}

@Injectable()
export class DocumentsService {
  private guidelines: GuidelineDocument[] = [
    {
      id: "doc-guideline-01",
      title: "شیوه‌نامه مصاحبه عمیق و شناسایی منابع نخبگانی",
      version: "1.0.0",
      category: "آموزش کارآموزی",
      description:
        "راهنمای گام‌به‌گام مصاحبه و ثبت گزارش‌های مرحله منابع (FR-006)",
      publishedAt: new Date().toISOString(),
    },
    {
      id: "doc-guideline-02",
      title: "شیوه‌نامه تبیین مسائل و استخراج علل ریشه‌ای",
      version: "1.0.0",
      category: "روش تحقیق علمی",
      description: "استانداردهای علمی تدوین گزارش مرحله تبیین",
      publishedAt: new Date().toISOString(),
    },
  ];

  async listGuidelines(): Promise<GuidelineDocument[]> {
    return this.guidelines;
  }

  async getById(id: string): Promise<GuidelineDocument | null> {
    return this.guidelines.find((g) => g.id === id) || null;
  }
}
