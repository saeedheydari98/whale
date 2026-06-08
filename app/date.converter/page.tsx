"use client";

import { useEffect, useState } from "react";
import DatePicker from "react-multi-date-picker";
import gregorian from "react-date-object/calendars/gregorian";
import persian from "react-date-object/calendars/persian";
import arabic from "react-date-object/calendars/arabic";
import gregorian_en from "react-date-object/locales/gregorian_en";
import persian_fa from "react-date-object/locales/persian_fa";
import arabic_en from "react-date-object/locales/arabic_en";
import { CustomButton } from "../design-system/components/ui/button";
import { CustomSelect } from "../design-system/components/ui/select";

type HistoryItem = {
  id: number | string;
  date: string;
  fromType: string;
  toType: string;
  result: string;
  createdAt?: string;
};

const calendarMap: any = {
  gregorian: { calendar: gregorian, locale: gregorian_en },
  persian: { calendar: persian, locale: persian_fa },
  arabic: { calendar: arabic, locale: arabic_en },
};

const HISTORY_STORAGE_KEY = "date-converter-history";

const readLocalHistory = (): HistoryItem[] => {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalHistory = (items: HistoryItem[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items.slice(0, 20)));
};

const normalizeHistory = (value: any): HistoryItem[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const mergeHistory = (...lists: HistoryItem[][]) => {
  const seen = new Set<string>();
  const merged: HistoryItem[] = [];

  for (const item of lists.flat()) {
    const key = String(item.id ?? `${item.date}-${item.fromType}-${item.toType}-${item.result}`);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  return merged.slice(0, 20);
};

export default function Home() {
  const [calendars, setCalendars] = useState<any[]>([]);
  const [fromType, setFromType] = useState("");
  const [toType, setToType] = useState("");
  const [date, setDate] = useState<any>(null);
  const [result, setResult] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCalendars = async () => {
      const res = await fetch("/api/calendars");
      const data = await res.json();
      setCalendars(data);
      if (data.length > 0) {
        setFromType(data[0].key);
        setToType(data[1]?.key || data[0].key);
      }
    };

    fetchCalendars();
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/history?limit=20", { cache: "no-store" });
      if (!res.ok) {
        setHistory((current) => mergeHistory(current, readLocalHistory()));
        return;
      }

      const data = await res.json();
      setHistory(mergeHistory(normalizeHistory(data), readLocalHistory()));
    } catch {
      setHistory((current) => mergeHistory(current, readLocalHistory()));
    }
  };

  const formatDateForAPI = (date: any, type: string) => {
    if (!date) return "";

    if (typeof date === "object" && date !== null) {
      if (typeof date.format === "function") {
        return date.format("YYYY-MM-DD");
      }

      if (typeof date.year === "number" && typeof date.month === "number" && typeof date.day === "number") {
        return `${String(date.year).padStart(4, "0")}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
      }
    }

    return String(date);
  };

  const handleSubmit = async () => {
    if (!date) {
      setError("لطفاً تاریخی انتخاب کنید");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formattedDate = formatDateForAPI(date, fromType);

      const res = await fetch("/api/convert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: formattedDate,
          from: fromType,
          to: toType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "خطا در تبدیل");
      }

      setResult(data.result);

      const newHistoryItem: HistoryItem = {
        id: `local-${Date.now()}`,
        date: formattedDate,
        fromType,
        toType,
        result: data.result,
        createdAt: new Date().toISOString(),
      };

      let savedHistoryItem = newHistoryItem;

      try {
        const saveRes = await fetch("/api/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            date: formattedDate,
            fromType: fromType,
            toType: toType,
            result: data.result,
          }),
        });

        const saveData = await saveRes.json().catch(() => ({}));
        if (saveRes.ok && saveData.saved) {
          savedHistoryItem = saveData.saved;
        } else {
          const localHistory = mergeHistory([newHistoryItem], readLocalHistory());
          writeLocalHistory(localHistory);
        }
      } catch {
        const localHistory = mergeHistory([newHistoryItem], readLocalHistory());
        writeLocalHistory(localHistory);
      }

      setHistory((current) => mergeHistory([savedHistoryItem], current, readLocalHistory()));
      await fetchHistory();
    } catch (err: any) {
      console.error("Error:", err);
      setError(err.message);
    }

    setLoading(false);
  };

  const currentCalendar = calendarMap[fromType] || calendarMap.gregorian;

  return (
    <div className="flex min-h-screen justify-center bg-bg-base text-text-primary p-4">
      <div className="flex min-h-[calc(100vh-2rem)] w-full flex-col items-center gap-4 overflow-hidden rounded-2xl border border-ui-secondary/40 bg-bg-surface/40 p-6 shadow-2xl backdrop-blur-md md:w-1/2" dir="rtl">
        <div className="flex w-full shrink-0 flex-col items-center justify-center gap-4">
          <div className="text-2xl font-bold text-center bg-user-user-user bg-clip-text text-transparent">
            تبدیل تاریخ
          </div>

          <CustomSelect
            variant="secondary"
            size="xxl"
            rounded="lg"
            value={fromType}
            className="text-user-user-800"
            onChange={(e) => {
              const newFrom = e.target.value;
              setFromType(newFrom);
              setDate(null);
              setResult("");
              setError("");

              const newTo = calendars.find((c) => c.key !== newFrom)?.key || newFrom;
              setToType(newTo);
            }}
          >
            {calendars.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </CustomSelect>

          <CustomSelect
            variant="secondary"
            size="xxl"
            rounded="lg"
            value={toType}
            className="text-user-user-800"
            onChange={(e) => setToType(e.target.value)}
          >
            {calendars
              .filter((c) => c.key !== fromType)
              .map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
          </CustomSelect>
          
        </div>

        <div className="flex w-full max-w-sm shrink-0 flex-col items-stretch justify-center gap-2">
            <DatePicker
              value={date}
              onChange={setDate}
              calendar={currentCalendar.calendar}
              locale={currentCalendar.locale}
              placeholder="انتخاب تاریخ"
              className="font-bold bg-bg-base"
              inputClass="w-full border border-ui-secondary/40 bg-bg-surface/70 backdrop-blur-sm p-1 rounded-xl font-bold 
            text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-ui-info hover:bg-bg-surface/80"
            />
            <CustomButton
              onClick={handleSubmit}
              disabled={loading}
              variant="secondary"
              fullWidth
              hover="lift"
              rounded="lg"
              isLoading={loading}
              loading="dots"
              loadingText="در حال تبدیل..."
              className="text-user-user-100"
            >
              تبدیل
            </CustomButton>
            <div className="flex min-h-10 flex-col items-center justify-center gap-2">
              {error && (
                <div className="text-red-admin-600 font-bold text-sm bg-ui-danger/30 backdrop-blur-sm px-4 py-2 rounded-full  shadow-md border border-ui-danger/50">
                  {error}
                </div>
              )}

              {!error && result && (
                <div className="p-2 bg-admin-admin-100 backdrop-blur-sm rounded-xl text-center font-bold text-admin-admin-600 border border-admin-admin-600 shadow-md">
                  {result}
                </div>
              )}
            </div>
          </div>

        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-4">
          <div className="font-bold text-xl bg-user-user-user bg-clip-text text-transparent">
            تاریخچه
          </div>

          <div className="custom-scrollbar min-h-40 w-full flex-1 overflow-y-auto rounded-xl border border-ui-secondary/40 bg-bg-surface/30 p-2 backdrop-blur-sm">
            {history.length === 0 && (
              <div className="text-sm text-user-user-800 text-center py-8">موردی ثبت نشده</div>
            )}

            {history.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center bg-bg-surface/60 backdrop-blur-sm p-3 rounded-xl hover:bg-bg-surface/80 transition-all duration-200 text-sm w-full mb-2 last:mb-0 shadow-sm hover:shadow-md"
              >
                <div>
                  <div className="text-xs text-text-secondary">
                    {item.date}
                  </div>
                  <div className="text-text-primary font-medium">
                    {item.fromType} → {item.toType}
                  </div>
                  <div className="font-bold text-user-user-user bg-clip-text text-transparent">
                    {item.result}
                  </div>
                </div>
                <div className="p-1 min-w-6 flex justify-center rounded-full font-bold bg-user-user-user text-xs text-text-primary">
                  {item.id}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: color-mix(in srgb, var(--bg-surface) 80%, transparent);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: color-mix(in srgb, var(--ui-info) 40%, transparent);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: color-mix(in srgb, var(--ui-info) 70%, transparent);
        }
      `}</style>
    </div>
  );
}
