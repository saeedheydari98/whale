"use client";

import { CustomActionButton } from "@/app/design-system/components/ui/action";

import { resolveVariantCssVars, strengthenBorderColor, UICommonVariant } from "../../variants/ui.variant";
import { borderVariants, cx, glassSurfaceClasses, GradientDirection, motionVariants, radiusVariants, resolveGlassBackground, resolveGradientStyle, shadowVariants, sizeVariants } from "../../variants/shared.variant";
import Loading, { LoadingVariant } from "../loading/loading";

type CustomSwitchProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  variant?: UICommonVariant;
  size?: keyof typeof sizeVariants;
  rounded?: keyof typeof radiusVariants;
  border?: keyof typeof borderVariants;
  gradient?: GradientDirection;
  shadow?: keyof typeof shadowVariants;
  customColor?: string;
  label?: string;
  showLabel?: boolean;
  labelClickable?: boolean;
  layout?: "horizontal" | "vertical";
  className?: string;
  loading?: LoadingVariant;
  isLoading?: boolean;
  loadingText?: string;
};

export function CustomSwitch({
  checked,
  onChange,
  disabled = false,
  variant = "primary",
  size = "md",
  rounded = "full",
  border = "base",
  gradient,
  shadow = "none",
  customColor,
  label,
  showLabel = true,
  labelClickable = true,
  layout = "horizontal",
  className,
  loading = "spinner",
  isLoading = false,
  loadingText,
}: CustomSwitchProps) {
  const colorStyle = resolveVariantCssVars(variant);
  const resolvedCustomColor = customColor || undefined;
  const switchColor = resolvedCustomColor ?? colorStyle.backgroundColor;
  const switchBackgroundColor = resolveGlassBackground(checked ? switchColor : "var(--neutral)", checked ? 86 : 24);
  const borderColor = resolvedCustomColor ? strengthenBorderColor(resolvedCustomColor) : colorStyle.borderColor;
  const isDisabled = disabled || isLoading;
  const Wrapper = labelClickable ? "label" : "div";

  return (
    <Wrapper className={cx("inline-flex min-w-0 items-center gap-2", layout === "vertical" && "flex-col text-center", className)}>
      <CustomActionButton
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={isDisabled}
        onClick={() => onChange(!checked)}
        onMouseDown={(event) => event.preventDefault()}
        className={cx(
          "relative h-7 w-12 shrink-0 select-none outline-none [-webkit-tap-highlight-color:transparent] focus:outline-none focus-visible:outline-none",
          radiusVariants[rounded],
          borderVariants[border],
          shadowVariants[shadow],
          glassSurfaceClasses,
          motionVariants.smooth,
          isDisabled && "opacity-50 cursor-not-allowed"
        )}
        style={{
          backgroundColor: switchBackgroundColor,
          ...resolveGradientStyle(switchBackgroundColor, gradient, borderColor),
          borderColor,
        }}
      >
        {isLoading ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Loading loading={loading} size={size} />
          </span>
        ) : (
          <span
            className={cx(
              "pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white",
              motionVariants.smooth,
              checked ? "left-6" : "left-0.5"
            )}
          />
        )}
      </CustomActionButton>
      {showLabel && label && <span className="min-w-0 break-words">{label}</span>}
      {isLoading && loadingText && <span className="text-sm text-secondary-text">{loadingText}</span>}
    </Wrapper>
  );
}
