"use client";

import { CustomButton } from "../../design-system/components/ui/button";
import { useTheme } from "../../design-system/theme/provider";
import { resolveColor, ThemeColorKey, ThemeStyle, ThemeTone } from "../../design-system/theme/theme";

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

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export function AdminThemePanel() {
  const { adminTheme, updateAdminTheme, theme } = useTheme();
  const adminColor = resolveColor(adminTheme.primary, adminTheme.style, adminTheme.tone);
  const selectedAdminThemeLabel = `${adminTheme.primary}-${adminTheme.style}-${adminTheme.tone}`;

  const renderColorButton = (color: ThemeColorKey) => {
    const background = resolveColor(color, adminTheme.style, adminTheme.tone);
    const selected = adminTheme.primary === color;

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
        className=" w-10 h-10"
        onClick={() => updateAdminTheme({ primary: color })}
      >
        {/* {color} */}
      </CustomButton>
    );
  };

  const renderStyleButton = (item: ThemeStyle) => {
    const background = resolveColor(adminTheme.primary, item, adminTheme.tone);
    const selected = adminTheme.style === item;

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
        onClick={() => updateAdminTheme({ style: item })}
      >
        {/* {item} */}
      </CustomButton>
    );
  };

  const renderToneButton = (tone: ThemeTone) => {
    const background = resolveColor(adminTheme.primary, adminTheme.style, tone);
    const selected = adminTheme.tone === tone;

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
        onClick={() => updateAdminTheme({ tone })}
      >
        {/* tone {tone} */}
      </CustomButton>
    );
  };

  return (
    <section
      className="flex flex-col gap-4 w-full max-w-3xl rounded-xl p-4"
      style={{
        border: `1px solid ${hexToRgba(adminColor, 0.3)}`,
        backgroundColor: hexToRgba(adminColor, 0.1),
        color: theme.tokens.colors.text.primary,
      }}
    >
      <div className="text-sm font-semibold text-text-secondary">
        selected: <span className="font-bold text-admin-admin-admin">{selectedAdminThemeLabel}</span>
      </div>

      <div className=" flex flex-wrap gap-2">
        {colorOptions.map(renderColorButton)}
      </div>

      <div className=" flex flex-wrap gap-2">
        {styleOptions.map(renderStyleButton)}
      </div>

      <div className="flex flex-wrap gap-2">
        {toneOptions.map(renderToneButton)}
      </div>
    </section>
  );
}
