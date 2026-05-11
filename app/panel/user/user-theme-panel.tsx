"use client";

import { CustomButton } from "@/app/design-system/components/ui/button";
import { useTheme } from "@/app/design-system/theme/provider";
import { resolveColor, ThemeColorKey, ThemeStyle, ThemeTone } from "@/app/design-system/theme/theme";



const colorOptions: ThemeColorKey[] = [
  "green",
  "blue",
  "purple",
  "orange",
  "red",
  "yellow",
  "gray",
];
const styleOptions: ThemeStyle[] = ["light", "dark", "fantasy"];
const toneOptions = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

const getContrastColor = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? "#111111" : "#ffffff";
};

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export function UserThemePanel() {
  const { mode, modePreference, setModePreference, userTheme, updateUserTheme, theme } =
    useTheme();
  const accentColor = resolveColor(userTheme.preferredColor, userTheme.style, userTheme.tone);
  const selectedUserThemeLabel = `${userTheme.preferredColor}-${userTheme.style}-${userTheme.tone}`;

  const renderModeButton = (value: "system" | "light" | "dark", label: string) => {
    const selected = modePreference === value;
    return (
      <CustomButton
        key={value}
        variant="secondary"
        rounded="full"
        size="sm"
        style={{
          backgroundColor: selected ? accentColor : "transparent",
          borderColor: selected ? accentColor : hexToRgba(accentColor, 0.3),
          color: selected ? getContrastColor(accentColor) : theme.tokens.colors.text.primary,
        }}
        onClick={() => setModePreference(value)}
      >
        {label}
      </CustomButton>
    );
  };

  const renderStyleButton = (item: ThemeStyle) => {
    const background = resolveColor(userTheme.preferredColor, item, userTheme.tone);
    const selected = userTheme.style === item;

    return (
      <CustomButton
        key={item}
        rounded="full"
        style={{
          backgroundColor: background,
          borderColor: background,
          borderStyle: "solid",
          borderWidth: selected ? "2px" : "0",
          boxShadow: selected ? `0 0 0 2px ${hexToRgba(background, 0.45)}` : "none",
          color: getContrastColor(background),
        }}
        className="w-10 h-10"
        onClick={() => updateUserTheme({ style: item })}
      >
        {/* {item} */}
      </CustomButton>
    );
  };

  const renderColorButton = (color: ThemeColorKey) => {
    const background = resolveColor(color, userTheme.style, userTheme.tone);
    const selected = userTheme.preferredColor === color;

    return (
      <CustomButton
        key={color}
        rounded="full"
        style={{
          backgroundColor: background,
          borderColor: background,
          borderStyle: "solid",
          borderWidth: selected ? "2px" : "0",
          boxShadow: selected ? `0 0 0 2px ${hexToRgba(background, 0.45)}` : "none",
          color: getContrastColor(background),
        }}
        className="w-10 h-10"
        onClick={() => updateUserTheme({ preferredColor: color })}
      >
        {/* {color} */}
      </CustomButton>
    );
  };

  const renderToneButton = (tone: ThemeTone) => {
    const background = resolveColor(userTheme.preferredColor, userTheme.style, tone);
    const selected = userTheme.tone === tone;

    return (
      <CustomButton
        key={tone}
        rounded="full"
        style={{
          backgroundColor: background,
          borderColor: background,
          borderStyle: "solid",
          borderWidth: selected ? "2px" : "0",
          boxShadow: selected ? `0 0 0 2px ${hexToRgba(background, 0.45)}` : "none",
          color: getContrastColor(background),
        }}
        className="w-10 h-10"
        onClick={() => updateUserTheme({ tone })}
      >
        {/* tone {tone} */}
      </CustomButton>
    );
  };

  return (
    <section
      className="flex flex-col gap-4 w-full max-w-3xl rounded-xl p-4"
      style={{
        border: `1px solid ${hexToRgba(accentColor, 0.3)}`,
        backgroundColor: hexToRgba(accentColor, 0.1),
        color: theme.tokens.colors.text.primary,
      }}
    >
      <div className="text-sm font-semibold text-text-secondary">
        selected: <span className="font-bold text-user-user-user">{selectedUserThemeLabel}</span>
      </div>

      <div className=" flex flex-wrap items-center gap-4">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-text-secondary">
            mode: <span className="font-bold text-user-user-user">{mode}</span>
          </div>
          <div
            className="flex flex-wrap items-center gap-2 rounded-full border px-2 py-2"
            style={{ borderColor: hexToRgba(accentColor, 0.3) }}
          >
            {renderModeButton("system", "device")}
            {renderModeButton("light", "light")}
            {renderModeButton("dark", "dark")}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {colorOptions.map(renderColorButton)}
      </div>

      <div className=" flex flex-wrap gap-2">
        {styleOptions.map(renderStyleButton)}
      </div>

      <div className=" flex flex-wrap gap-2">
        {toneOptions.map(renderToneButton)}
      </div>
    </section>
  );
}
