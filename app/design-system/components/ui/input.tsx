"use client";

import React from "react";
import { IoEyeOffOutline, IoEyeOutline } from "react-icons/io5";
import { resolveControlCssVars, UICommonVariant } from "../../variants/ui.variant";
import { borderVariants, cx, interactionStates, motionVariants, radiusVariants, shadowVariants, sizeVariants } from "../../variants/shared.variant";
import Loading, { LoadingVariant } from "../loading/loading";

type CustomInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  variant?: UICommonVariant;
  size?: keyof typeof sizeVariants;
  rounded?: keyof typeof radiusVariants;
  border?: keyof typeof borderVariants;
  shadow?: keyof typeof shadowVariants;
  fullWidth?: boolean;
  loading?: LoadingVariant;
  isLoading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  iconAfter?: React.ReactNode;
  invalid?: boolean;
  label?: string;
  showLabel?: boolean;
};

export function CustomInput({
  variant = "primary",
  size = "md",
  rounded = "md",
  border = "borderB",
  shadow = "none",
  fullWidth = true,
  className,
  disabled,
  loading = "spinner",
  isLoading = false,
  loadingText,
  icon,
  iconAfter,
  invalid = false,
  label,
  showLabel = true,
  style,
  onChange,
  onBlur,
  value,
  type,
  ...rest
}: CustomInputProps) {
  const inputId = React.useId();
  const [showPassword, setShowPassword] = React.useState(false);
  const [numberDraft, setNumberDraft] = React.useState<string | null>(null);
  const colorStyle = resolveControlCssVars(variant);
  const isDisabled = disabled || isLoading;
  const isPassword = type === "password";
  const isNumber = type === "number";
  const visibleLabel = showLabel ? label || String(rest["aria-label"] || rest.placeholder || "") : "";
  const resolvedId = rest.id || inputId;
  const displayedValue = isNumber && numberDraft !== null ? numberDraft : value;
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isNumber && event.target.value === "") {
      setNumberDraft("");
      return;
    }
    if (isNumber) setNumberDraft(null);
    onChange?.(event);
  };
  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    if (isNumber && numberDraft !== null) setNumberDraft(null);
    onBlur?.(event);
  };
  const resolvedIconAfter = iconAfter ?? (isPassword ? (
    <button
      type="button"
      aria-label={showPassword ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"}
      className="flex items-center justify-center text-lg font-bold text-primary-text transition-colors hover:text-primary"
      onClick={() => setShowPassword((current) => !current)}
      disabled={isDisabled}
    >
      {showPassword ? <IoEyeOffOutline /> : <IoEyeOutline />}
    </button>
  ) : null);
  const control = (
    <div className={cx("relative inline-flex items-center", fullWidth && "w-full")}>
      {!isLoading && icon && (
        <span className="absolute right-3 text-secondary-text">{icon}</span>
      )}
      <input
        {...rest}
        id={resolvedId}
        type={isPassword && showPassword ? "text" : type}
        value={displayedValue}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-invalid={invalid || rest["aria-invalid"]}
        disabled={isDisabled}
        className={cx(
          "text-primary-text placeholder:text-secondary-text",
          invalid ? "focus:outline-none focus:ring-2 focus:ring-danger-border-nomode" : "focus:outline-none focus:ring-2 focus:ring-primary-border",
          sizeVariants[size],
          radiusVariants[rounded],
          borderVariants[border],
          shadowVariants[shadow],
          motionVariants.smooth,
          !isDisabled && interactionStates.hover.none,
          isDisabled && interactionStates.disabled.base,
          fullWidth && "w-full",
          icon !== undefined && "pr-10",
          resolvedIconAfter !== null && "pl-10",
          className
        )}
        style={{
          backgroundColor: colorStyle.backgroundColor,
          borderColor: invalid ? "var(--danger-border-nomode)" : colorStyle.borderColor,
          ...style,
        }}
      />
      {isLoading && (
        <span className="absolute left-3 flex items-center gap-2 text-secondary-text">
          <Loading loading={loading} size={size} />
          {loadingText && <span className="text-sm">{loadingText}</span>}
        </span>
      )}
      {!isLoading && resolvedIconAfter && (
        <span className="absolute left-3 text-primary-text">{resolvedIconAfter}</span>
      )}
    </div>
  );

  if (!visibleLabel) return control;

  return (
    <div className={cx("flex flex-col gap-1", fullWidth && "w-full")}>
      <label htmlFor={resolvedId} className="text-xs font-bold text-secondary-text">
        <span>{visibleLabel}</span>
      </label>
      {control}
    </div>
  );
}
