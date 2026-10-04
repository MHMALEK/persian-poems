const TEHRAN_TZ = "Asia/Tehran";

export type Occasion = "nowruz" | "yalda";

/** `YYYY-MM-DD` of the current day in Tehran. */
function tehranDateKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TEHRAN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Solar Hijri month/day in Tehran (1-based), via ICU's Persian calendar. */
function persianDateTehran(now: Date = new Date()): { month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {
    timeZone: TEHRAN_TZ,
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  return { month, day };
}

/** Nowruz = 1 Farvardin; Yalda = 30 Azar (the last night of autumn). */
function occasionToday(now: Date = new Date()): Occasion | null {
  const { month, day } = persianDateTehran(now);
  if (month === 1 && day === 1) return "nowruz";
  if (month === 9 && day === 30) return "yalda";
  return null;
}

export { occasionToday, persianDateTehran, tehranDateKey, TEHRAN_TZ };
