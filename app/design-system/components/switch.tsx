"use client";

import React from "react";
import { useTheme } from "../theme/provider";
import { resolveVariantColors, UICommonVariant } from "../variants/ui.variant";
import { cx, motionVariants } from "../variants/shared.variant";

type CustomSwitchProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  variant?: UICommonVariant;
  token?: string;
  customColor?: string;
  label?: string;
};

export function CustomSwitch({
  checked,
  onChange,
  disabled = false,
  variant = "primary",
  token,
  customColor,
  label,
}: CustomSwitchProps) {
  const { theme } = useTheme();
  const colorStyle = resolveVariantColors(variant, theme);
  const switchColor = customColor ?? colorStyle.backgroundColor;
  const borderColor = customColor ?? colorStyle.borderColor;

  return (
    <label className="inline-flex items-center gap-2">
      <button
        type="button"
        aria-pressed={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative h-7 w-12 rounded-full border",
          motionVariants.smooth,
          disabled && "opacity-50 cursor-not-allowed"
        )}
        style={{
          backgroundColor: checked ? switchColor : "#9ca3af",
          borderColor,
        }}
      >
        <span
          className={cx(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white",
            motionVariants.smooth,
            checked ? "left-6" : "left-0.5"
          )}
        />
      </button>
      {label && <span>{label}</span>}
    </label>
  );
}
