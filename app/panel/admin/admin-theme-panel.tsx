"use client";

import { ThemePalettePicker } from "@/app/panel/theme-palette-picker";
import { useTheme } from "../../design-system/theme/provider";

export function AdminThemePanel() {
  const { adminTheme, updateAdminTheme } = useTheme();

  const updatePalette = (next: Parameters<typeof updateAdminTheme>[0]) => {
    const themeUpdate: Parameters<typeof updateAdminTheme>[0] = {};

    if (next.primary) {
      themeUpdate.primary = next.primary;
    }

    if (next.style) {
      themeUpdate.style = next.style;
    }

    return updateAdminTheme(themeUpdate);
  };

  return (
    <section
      className="flex w-full max-w-3xl flex-col gap-4 rounded-xl border border-primary-border bg-primary-bg p-4 text-primary-text"
    >
      <ThemePalettePicker
        scope="admin"
        selectedColor={adminTheme.primary}
        selectedStyle={adminTheme.style}
        selectionClassName="text-primary"
        onChange={(next) =>
          updatePalette({
            primary: next.color,
            style: next.style,
          })
        }
      />
    </section>
  );
}
