"use client";

import { useEffect, useState } from "react";
import DatePicker from "react-multi-date-picker";
import gregorian from "react-date-object/calendars/gregorian";
import persian from "react-date-object/calendars/persian";
import arabic from "react-date-object/calendars/arabic";
import gregorian_en from "react-date-object/locales/gregorian_en";
import persian_fa from "react-date-object/locales/persian_fa";
import arabic_en from "react-date-object/locales/arabic_en";

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
    const res = await fetch("/api/history");
    const data = await res.json();
    setHistory(data);
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

      console.log("Sending to API:", { date: formattedDate, from: fromType, to: toType });

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
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="flex flex-col gap-2 w-1/3 h-[calc(100vh-50px)] bg-white/10 backdrop-blur-md shadow-2xl rounded-2xl p-6 border border-white/30" dir="rtl">

        <div className="flex flex-col h-[30%] justify-center items-center gap-4">
          <div className="text-2xl font-bold text-center bg-linear-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">
            تبدیل تاریخ
          </div>

          <select
            className="w-full border border-white/30 bg-white/20 backdrop-blur-sm font-bold shadow-2xl p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200 hover:bg-white/30 text-gray-800"
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
          </select>

          <select
            className="w-full border border-white/30 bg-white/20 backdrop-blur-sm font-bold p-2 shadow-2xl rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200 hover:bg-white/30 text-gray-800"
            value={toType}
            onChange={(e) => setToType(e.target.value)}
          >
            {calendars
              .filter((c) => c.key !== fromType)
              .map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
          </select>

          <DatePicker
            value={date}
            onChange={setDate}
            calendar={currentCalendar.calendar}
            locale={currentCalendar.locale}
            placeholder="انتخاب تاریخ"
            className="w-full [&_.react-datepicker-wrapper]:w-full [&_input]:w-full [&_input]:border [&_input]:border-white/30 [&_input]:bg-white/20 [&_input]:backdrop-blur-sm [&_input]:p-2 [&_input]:rounded-xl [&_input]:font-bold [&_input]:text-gray-800 [&_input]:placeholder-gray-500 [&_input]:focus:outline-none [&_input]:focus:ring-2 [&_input]:focus:ring-blue-400 [&_input]:transition-all [&_input]:duration-200 [&_input:hover]:bg-white/30"
          />

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-linear-to-r from-blue-400 to-blue-700 text-white text-2xl font-bold py-2.5 rounded-xl hover:from-blue-500 hover:to-blue-800 hover:scale-[1.02] active:scale-[0.98] hover:cursor-pointer transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "در حال تبدیل..." : "تبدیل"}
          </button>
        </div>

        <div className="flex flex-col h-[10%] justify-center items-center gap-2">
          {error && (
            <div className="text-red-600 text-sm bg-red-100/90 backdrop-blur-sm px-4 py-2 rounded-full font-medium shadow-md border border-red-300/50">
              ⚠️ {error}
            </div>
          )}

          {!error && result && (
            <div className="p-3 bg-linear-to-r from-green-400/30 to-emerald-500/30 backdrop-blur-sm rounded-xl text-center font-bold text-green-900 border border-green-400/50 shadow-md">
              ✓ {result}
            </div>
          )}
        </div>

        <div className="flex flex-col h-[60%] justify-center items-center gap-4">
          <div className="font-bold text-xl bg-linear-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">
            تاریخچه
          </div>

          <div className="overflow-y-auto border border-white/30 rounded-xl w-full h-full bg-white/5 backdrop-blur-sm p-2 custom-scrollbar">
            {history.length === 0 && (
              <div className="text-sm text-gray-500 text-center py-8">موردی ثبت نشده</div>
            )}

            {history.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center bg-white/30 backdrop-blur-sm p-3 rounded-xl hover:bg-white/50 transition-all duration-200 text-sm w-full mb-2 last:mb-0 shadow-sm hover:shadow-md"
              >
                <div>
                  <div className="text-xs text-gray-600">
                    {item.date}
                  </div>
                  <div className="text-gray-700 font-medium">
                    {item.fromType} → {item.toType}
                  </div>
                  <div className="font-bold bg-linear-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent">
                    {item.result}
                  </div>
                </div>
                <div className="p-1 min-w-6 flex justify-center rounded-full font-bold bg-linear-to-r from-blue-600 to-sky-600 text-xs text-gray-100">
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
          background: rgba(255, 255, 255, 0.15);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.4);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.7);
        }
      `}</style>
    </div>
  );
}