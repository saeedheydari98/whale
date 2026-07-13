"use client";

import { CustomInput } from "./input";
import { CustomSelect } from "./select";
import {
  formatPersianDateInput,
  getCurrentPersianYear,
  normalizePersianDate,
  readPersianDateParts,
  toEnglishDigits,
  toPersianDigits,
} from "@/lib/persian-date";

const PERSIAN_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

function getMonthDayCount(month: string) {
  const monthNumber = Number(month);
  if (!Number.isFinite(monthNumber)) return 31;
  if (monthNumber <= 6) return 31;
  if (monthNumber <= 11) return 30;
  return 29;
}

type PersianDateInputProps = {
  value: string;
  invalid?: boolean;
  required?: boolean;
  onChange: (value: string) => void;
};

export function PersianDateInput({ value, invalid = false, required = false, onChange }: PersianDateInputProps) {
  const currentYear = getCurrentPersianYear();
  const years = Array.from({ length: 111 }, (_, index) => String(currentYear - index));
  const { year, month, day } = readPersianDateParts(value);
  const days = Array.from({ length: getMonthDayCount(month) }, (_, index) => String(index + 1).padStart(2, "0"));

  const updatePart = (part: "year" | "month" | "day", nextValue: string) => {
    const nextYear = part === "year" ? nextValue : year || String(currentYear);
    const nextMonth = part === "month" ? nextValue : month || "01";
    const nextDay = part === "day" ? nextValue : day || "01";
    const dayCount = getMonthDayCount(nextMonth);
    const safeDay = String(Math.min(Number(nextDay), dayCount)).padStart(2, "0");
    onChange(`${nextYear}/${nextMonth}/${safeDay}`);
  };

  return (
    <div className="flex flex-col gap-2">
      <CustomInput
        value={formatPersianDateInput(value)}
        variant="primary"
        placeholder=""
        pattern="[۰-۹0-9]{4}/[۰-۹0-9]{2}/[۰-۹0-9]{2}"
        inputMode="numeric"
        required={required}
        invalid={invalid}
        showLabel={false}
        dir="rtl"
        className="text-right"
        aria-label="تاریخ تولد"
        onChange={(event) => onChange(normalizePersianDate(toEnglishDigits(event.target.value)))}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <CustomSelect
          value={year}
          aria-label="سال تولد"
          className="text-right"
          onChange={(event) => updatePart("year", event.target.value)}
        >
          <option value="">سال</option>
          {years.map((item) => (
            <option key={item} value={item}>{toPersianDigits(item)}</option>
          ))}
        </CustomSelect>
        <CustomSelect
          value={month}
          aria-label="ماه تولد"
          className="text-right"
          onChange={(event) => updatePart("month", event.target.value)}
        >
          <option value="">ماه</option>
          {PERSIAN_MONTHS.map((label, index) => {
            const item = String(index + 1).padStart(2, "0");
            return <option key={item} value={item}>{label}</option>;
          })}
        </CustomSelect>
        <CustomSelect
          value={day}
          aria-label="روز تولد"
          className="text-right"
          onChange={(event) => updatePart("day", event.target.value)}
        >
          <option value="">روز</option>
          {days.map((item) => (
            <option key={item} value={item}>{toPersianDigits(item)}</option>
          ))}
        </CustomSelect>
      </div>
    </div>
  );
}
