"use client";

import { useEffect, useState } from "react";
import { PiStarFourFill } from "react-icons/pi";

interface ToggleProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

export default function Toggle({ checked, onChange }: ToggleProps) {
  const [dark, setDark] = useState(checked || false);

  useEffect(() => {
    if (checked !== undefined) {
      setDark(checked);
    }
  }, [checked]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const handleToggle = () => {
    const newValue = !dark;
    setDark(newValue);
    onChange?.(newValue);
  };
  return (
    <div className="w-15 h-8.5 relative cursor-pointer" onClick={handleToggle}>
      <div
        className={`
          w-full h-full rounded-full relative overflow-hidden 
          transition-all duration-700 ease-out
          ${dark 
            ? "bg-linear-to-b from-[#0b1020] to-[#0f172a]" 
            : "bg-linear-to-b from-[#87ceeb] to-[#e0f6ff]"
          }
        `}
      >
        {/* SUN */}
        {!dark && (
          <div className="absolute w-4 h-4 top-[9px] left-2 rounded-full bg-yellow-400 shadow-[0_0_8px_#facc15]" />
        )}

        {/* CLOUDS */}
        {!dark && (
          <div className="absolute inset-0">
            <div className="absolute bottom-[-10px] right-[-24px] w-[55px] h-[18px] bg-slate-400 rounded-full animate-[cloudMove1_5s_ease-in-out_infinite]">
              <div className="absolute w-[22px] h-[18px] top-[-9px] left-2 rounded-full bg-inherit" />
              <div className="absolute w-[26px] h-5 top-[-10px] right-[6px] rounded-full bg-inherit" />
            </div>
            <div className="absolute bottom-[-12px] right-[-16px] w-10 h-[14px] bg-white rounded-full animate-[cloudMove2_3.8s_ease-in-out_infinite]">
              <div className="absolute w-[18px] h-[14px] top-[-7px] left-[6px] rounded-full bg-inherit" />
              <div className="absolute w-5 h-4 top-[-8px] right-[6px] rounded-full bg-inherit" />
            </div>
          </div>
        )}

        {/* STARS */}
        {dark && (
          <div className="absolute inset-0">
            <PiStarFourFill className="absolute top-1 left-[10px] w-2.5 h-2.5 text-white drop-shadow-[0_0_2px_white] animate-[twinkle_4s_infinite_0s]" />
            <PiStarFourFill className="absolute top-4 left-[6px] w-[5px] h-[5px] text-white drop-shadow-[0_0_2px_white] animate-[twinkle_4s_infinite_1s]" />
            <PiStarFourFill className="absolute top-[6px] left-6 w-2 h-2 text-white drop-shadow-[0_0_2px_white] animate-[twinkle_4s_infinite_2s]" />
            <PiStarFourFill className="absolute top-[22px] left-4 w-1.5 h-1.5 text-white drop-shadow-[0_0_2px_white] animate-[twinkle_4s_infinite_3s]" />
          </div>
        )}

        {/* KNOB */}
        <div
          className={`
            absolute w-6 h-6 top-[5px] rounded-full z-10 
            transition-all duration-700
            ${dark ? "left-8 bg-gray-200" : "left-1 bg-yellow-400 shadow-[0_0_6px_#facc15]"}
          `}
        >
          {dark && (
            <div
              className="relative w-6 h-6 rounded-full"
              style={{
                background: "radial-gradient(circle at 35% 30%, #f8fafc 0%, #e5e7eb 45%, #cbd5e1 100%)",
                boxShadow: "inset -3px -3px 6px rgba(0,0,0,0.22), inset 2px 2px 4px rgba(255,255,255,0.25), 0 2px 4px rgba(0,0,0,0.12)",
              }}
            >
              <div className="absolute w-1.5 h-1.5 top-0.5 left-[9px] rounded-full bg-[rgba(67,70,75,0.55)]" />
              <div className="absolute w-[9px] h-[9px] top-[9px] left-[3px] rounded-full bg-[rgba(67,70,75,0.55)]" />
              <div className="absolute w-[3px] h-[3px] top-4 left-[15px] rounded-full bg-[rgba(67,70,75,0.55)]" />
              <div className="absolute w-6 h-6 rounded-full left-[-10px] top-0 bg-white/15 blur-[0.8px] -z-10" />
              <div className="absolute w-6 h-6 rounded-full left-[-16px] top-0 bg-white/10 blur-[1px] -z-20" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}