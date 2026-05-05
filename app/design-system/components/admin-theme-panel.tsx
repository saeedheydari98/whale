"use client";

import { CustomButton } from "./button";
import { useTheme } from "../theme/provider";
import { resolveColor, ThemeColorKey, ThemeStyle, ThemeTone } from "../theme/theme";

const colorOptions: ThemeColorKey[] = [
  "yellow",
  "red",
  "blue",
  "green",
  "orange",
  "purple",
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

export function AdminThemePanel() {
  const { adminTheme, updateAdminTheme } = useTheme();

  const renderColorButton = (color: ThemeColorKey) => {
    const background = resolveColor(color, adminTheme.style, adminTheme.tone);
    const selected = adminTheme.primary === color;

    return (
      <CustomButton
        key={color}
        style={{
          backgroundColor: background,
          borderColor: background,
          color: getContrastColor(background),
        }}
        className={selected ? "ring-2 ring-ui-primary/80" : ""}
        onClick={() => updateAdminTheme({ primary: color })}
      >
        {color}
      </CustomButton>
    );
  };

  const renderStyleButton = (item: ThemeStyle) => {
    const background = resolveColor(adminTheme.primary, item, adminTheme.tone);
    const selected = adminTheme.style === item;

    return (
      <CustomButton
        key={item}
        style={{
          backgroundColor: background,
          borderColor: background,
          color: getContrastColor(background),
        }}
        className={selected ? "ring-2 ring-ui-primary/80" : ""}
        onClick={() => updateAdminTheme({ style: item })}
      >
        {item}
      </CustomButton>
    );
  };

  const renderToneButton = (tone: ThemeTone) => {
    const background = resolveColor(adminTheme.primary, adminTheme.style, tone);
    const selected = adminTheme.tone === tone;

    return (
      <CustomButton
        key={tone}
        style={{
          backgroundColor: background,
          borderColor: background,
          color: getContrastColor(background),
        }}
        className={selected ? "ring-2 ring-ui-primary/80" : ""}
        onClick={() => updateAdminTheme({ tone })}
      >
        tone {tone}
      </CustomButton>
    );
  };

  return (
    <section className="w-full max-w-3xl rounded-xl border border-ui-primary/30 bg-bg-surface p-4">
      <h2 className="mb-3 text-xl font-bold">Admin Panel Theme</h2>

      <div className="mb-3 flex flex-wrap gap-2">
        {colorOptions.map(renderColorButton)}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {styleOptions.map(renderStyleButton)}
      </div>

      <div className="flex flex-wrap gap-2">
        {toneOptions.map(renderToneButton)}
      </div>
    </section>
  );
}
