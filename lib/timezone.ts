import { toDate, toZonedTime } from "date-fns-tz";

export type TimeSlot = string; // "day-hour"，例如 "0-9" = 週一 9 點

/** 週一為 0、週五為 4；與行事曆欄位一致 */
export const REF_YEAR = 2024;
export const REF_MONTH = 0; // January
export const REF_MONDAY = 1; // 2024-01-01 為週一

export function slotKey(day: number, hour: number): TimeSlot {
  return `${day}-${hour}`;
}

/** 將「某成員時區內」的週一到週五某一小時起點轉成 UTC 瞬間（不依賴瀏覽器本地時區） */
export function memberSlotToUtc(
  memberTz: string,
  day: number,
  hour: number
): Date {
  const dayOfMonth = REF_MONDAY + day;
  const month = String(REF_MONTH + 1).padStart(2, "0");
  const dom = String(dayOfMonth).padStart(2, "0");
  const hh = String(hour).padStart(2, "0");
  const iso = `${REF_YEAR}-${month}-${dom}T${hh}:00:00`;
  return toDate(iso, { timeZone: memberTz });
}

/** UTC 瞬間在指定時區若落在週一～週五 9–17 點，回傳該格；否則 null */
export function utcToViewerSlot(
  utc: Date,
  viewerTz: string
): { day: number; hour: number } | null {
  const z = toZonedTime(utc, viewerTz);
  const jsDay = z.getDay(); // 0 Sun … 6 Sat
  const day = (jsDay + 6) % 7; // Mon=0
  const hour = z.getHours();
  if (day < 0 || day > 4) return null;
  if (hour < 9 || hour > 17) return null;
  return { day, hour };
}

/** 將某成員的空閒（以該成員時區儲存）轉成「檢視者時區」下的格子鍵 */
export function availabilityInViewerTz(
  availability: TimeSlot[],
  memberTz: string,
  viewerTz: string
): Set<TimeSlot> {
  const out = new Set<TimeSlot>();
  for (const s of availability) {
    const [d, h] = s.split("-").map(Number);
    const utc = memberSlotToUtc(memberTz, d, h);
    const mapped = utcToViewerSlot(utc, viewerTz);
    if (mapped) out.add(slotKey(mapped.day, mapped.hour));
  }
  return out;
}

/** 所有人同時空閒的 UTC 起點（毫秒） */
export function commonUtcInstants(
  members: { availability: TimeSlot[]; timeZone: string }[]
): Set<number> {
  if (members.length === 0) return new Set();

  const toUtcSet = (m: (typeof members)[0]) =>
    new Set(
      m.availability.map((s) => {
        const [d, h] = s.split("-").map(Number);
        return memberSlotToUtc(m.timeZone, d, h).getTime();
      })
    );

  let acc = toUtcSet(members[0]);
  for (let i = 1; i < members.length; i++) {
    const next = toUtcSet(members[i]);
    acc = new Set([...acc].filter((t) => next.has(t)));
  }
  return acc;
}

export function utcInstantsToViewerSlots(
  instants: Set<number>,
  viewerTz: string
): TimeSlot[] {
  const out = new Set<TimeSlot>();
  for (const t of instants) {
    const mapped = utcToViewerSlot(new Date(t), viewerTz);
    if (mapped) out.add(slotKey(mapped.day, mapped.hour));
  }
  return [...out];
}

export const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "Asia/Taipei", label: "台北 (GMT+8)" },
  { value: "Asia/Tokyo", label: "東京 (GMT+9)" },
  { value: "Asia/Shanghai", label: "上海 (GMT+8)" },
  { value: "Asia/Hong_Kong", label: "香港 (GMT+8)" },
  { value: "Asia/Singapore", label: "新加坡 (GMT+8)" },
  { value: "Asia/Seoul", label: "首爾 (GMT+9)" },
  { value: "America/New_York", label: "紐約 (美東)" },
  { value: "America/Chicago", label: "芝加哥 (美中)" },
  { value: "America/Denver", label: "丹佛 (山地)" },
  { value: "America/Los_Angeles", label: "洛杉磯 (美西)" },
  { value: "Europe/London", label: "倫敦" },
  { value: "Europe/Paris", label: "巴黎" },
  { value: "Europe/Berlin", label: "柏林" },
  { value: "Australia/Sydney", label: "雪梨" },
  { value: "UTC", label: "UTC" },
];
