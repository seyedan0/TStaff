const names = ["آذربایجان شرقی", "آذربایجان غربی", "اردبیل", "اصفهان", "البرز", "ایلام", "بوشهر", "تهران", "چهارمحال و بختیاری", "خراسان جنوبی", "خراسان رضوی", "خراسان شمالی", "خوزستان", "زنجان", "سمنان", "سیستان و بلوچستان", "فارس", "قزوین", "قم", "کردستان", "کرمان", "کرمانشاه", "کهگیلویه و بویراحمد", "گلستان", "گیلان", "لرستان", "مازندران", "مرکزی", "هرمزگان", "همدان", "یزد"] as const;
export const IRAN_PROVINCES = names.map((name, index) => ({ id: `91000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`, name }));
export function provinceIdFromName(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalize = (text: string) => text.normalize("NFKC").replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[\s‌]+/g, "").replace(/^استان/, "");
  return IRAN_PROVINCES.find((province) => province.id === value || normalize(province.name) === normalize(value))?.id ?? null;
}
