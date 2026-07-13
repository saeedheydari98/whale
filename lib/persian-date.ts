const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toPersianDigits(value: string | number) {
  return String(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)] ?? digit);
}

export function toEnglishDigits(value: string) {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persianIndex = PERSIAN_DIGITS.indexOf(digit);
    if (persianIndex >= 0) return String(persianIndex);
    const arabicIndex = ARABIC_DIGITS.indexOf(digit);
    return arabicIndex >= 0 ? String(arabicIndex) : digit;
  });
}

export function normalizePersianDate(value: string) {
  const normalized = toEnglishDigits(value.trim()).replace(/-/g, "/");
  const match = normalized.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!match) return normalized;

  const [, year, month, day] = match;
  return `${year}/${month.padStart(2, "0")}/${day.padStart(2, "0")}`;
}

export function formatPersianDateInput(value: string) {
  const digits = toEnglishDigits(value).replace(/\D/g, "").slice(0, 8);
  const year = digits.slice(0, 4);
  const month = digits.slice(4, 6);
  const day = digits.slice(6, 8);
  return toPersianDigits([year, month, day].filter(Boolean).join("/"));
}

export function readPersianDateParts(value: string) {
  const normalized = normalizePersianDate(value);
  const match = normalized.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (!match) return { year: "", month: "", day: "" };
  return {
    year: match[1],
    month: match[2],
    day: match[3],
  };
}

function div(a: number, b: number) {
  return Math.trunc(a / b);
}

function jalaliToGregorian(jy: number, jm: number, jd: number) {
  jy += 1595;
  let days = -355668 + 365 * jy + div(jy, 33) * 8 + div((jy % 33) + 3, 4) + jd;
  days += jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186;
  let gy = 400 * div(days, 146097);
  days %= 146097;

  if (days > 36524) {
    gy += 100 * div(--days, 36524);
    days %= 36524;
    if (days >= 365) days++;
  }

  gy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    gy += div(days - 1, 365);
    days = (days - 1) % 365;
  }

  const gd = days + 1;
  const salA = [0, 31, (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  let day = gd;
  for (gm = 1; gm <= 12 && day > salA[gm]; gm++) {
    day -= salA[gm];
  }

  return { gy, gm, gd: day };
}

function gregorianToJalali(gy: number, gm: number, gd: number) {
  const gDaysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const jDaysInMonth = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
  gy -= 1600;
  gm -= 1;
  gd -= 1;

  let gDayNo = 365 * gy + div(gy + 3, 4) - div(gy + 99, 100) + div(gy + 399, 400);
  for (let i = 0; i < gm; ++i) gDayNo += gDaysInMonth[i];
  if (gm > 1 && ((gy + 1600) % 4 === 0 && ((gy + 1600) % 100 !== 0 || (gy + 1600) % 400 === 0))) {
    gDayNo++;
  }
  gDayNo += gd;

  let jDayNo = gDayNo - 79;
  const jNp = div(jDayNo, 12053);
  jDayNo %= 12053;

  let jy = 979 + 33 * jNp + 4 * div(jDayNo, 1461);
  jDayNo %= 1461;

  if (jDayNo >= 366) {
    jy += div(jDayNo - 1, 365);
    jDayNo = (jDayNo - 1) % 365;
  }

  let jm = 0;
  for (jm = 0; jm < 11 && jDayNo >= jDaysInMonth[jm]; ++jm) {
    jDayNo -= jDaysInMonth[jm];
  }

  return { jy, jm: jm + 1, jd: jDayNo + 1 };
}

export function getCurrentPersianYear() {
  const now = new Date();
  return gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate()).jy;
}

export function persianDateToTime(value: string) {
  const normalized = normalizePersianDate(value);
  const match = normalized.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (!match) return NaN;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return NaN;
  if (year < 1200 || year > 1500 || month < 1 || month > 12) return NaN;

  const maxDay = month <= 6 ? 31 : month <= 11 ? 30 : 29;
  if (day < 1 || day > maxDay) return NaN;

  const gregorian = jalaliToGregorian(year, month, day);
  return Date.UTC(gregorian.gy, gregorian.gm - 1, gregorian.gd);
}

export function isValidPastPersianDate(value: string) {
  const time = persianDateToTime(value);
  return Number.isFinite(time) && time <= Date.now();
}
