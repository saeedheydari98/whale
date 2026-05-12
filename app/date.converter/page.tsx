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
import { CustomTag } from "../design-system/components/ui/tag";

const calendarMap: any = {
  gregorian: { calendar: gregorian, locale: gregorian_en },
  persian: { calendar: persian, locale: persian_fa },
  arabic: { calendar: arabic, locale: arabic_en },
};

export default function Home() {
  const [calendars, setCalendars] = useState<any[]>([]);
  const [fromType, setFromType] = useState("");
  const [toType, setToType] = useState("");
  const [date, setDate] = useState<any>(null);
  const [result, setResult] = useState("");
  const [history, setHistory] = useState<any[]>([]);
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
      const res = await fetch("/api/history");
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching history:", error);
      setHistory([]);
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

      await fetch("/api/save", {
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

      fetchHistory();
    } catch (err: any) {
      console.error("Error:", err);
      setError(err.message);
    }

    setLoading(false);
  };

  const currentCalendar = calendarMap[fromType] || calendarMap.gregorian;

  return (
    <div className="flex justify-center items-center h-screen bg-bg-base text-text-primary">
      <div className="flex flex-col gap-2 w-1/3 h-[calc(100vh-100px)] bg-bg-surface/40 backdrop-blur-md shadow-2xl rounded-2xl p-6 border border-ui-secondary/40" dir="rtl">
        <div className="flex flex-col h-[30%] justify-center items-center gap-4">
          <div className="text-2xl font-bold text-center bg-user-user-user bg-clip-text text-transparent">
            تبدیل تاریخ
          </div>

          <CustomSelect
            variant="secondary"
            size="xxxl"
            rounded="lg"
            value={fromType}
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
            size="xxxl"
            rounded="lg"
            value={toType}
            onChange={(e) => setToType(e.target.value)}
          >
            {calendars
              .filter((c) => c.key !== fromType)
              .map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
          </CustomSelect>

          <DatePicker
            value={date}
            onChange={setDate}
            calendar={currentCalendar.calendar}
            locale={currentCalendar.locale}
            placeholder="انتخاب تاریخ"
            className="font-bold bg-bg-base "
            inputClass="w-full border border-ui-secondary/40 bg-bg-surface/70 backdrop-blur-sm p-1 rounded-xl font-bold 
            text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-ui-info hover:bg-bg-surface/80"
          />
          <CustomButton
            onClick={handleSubmit}
            disabled={loading}
            variant="secondary"
            size="xxl"
            fullWidth
            hover="lift"
            rounded="lg"
          >
            {loading ? "در حال تبدیل..." : "تبدیل"}
          </CustomButton>
        </div>

        <div className="flex flex-col h-[10%] justify-center items-center gap-2">
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

        <div className="flex flex-col h-[60%] justify-center items-center gap-4">
          <div className="font-bold text-xl bg-user-user-user bg-clip-text text-transparent">
            تاریخچه
          </div>

          <div className="overflow-y-auto border border-ui-secondary/40 rounded-xl w-full h-full bg-bg-surface/30 backdrop-blur-sm p-2 custom-scrollbar">
            {history.length === 0 && (
              <div className="text-sm text-text-secondary text-center py-8">موردی ثبت نشده</div>
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