"use client";

import React from "react";
import { IoEyeOffOutline, IoEyeOutline } from "react-icons/io5";
import { resolveControlCssVars, UICommonVariant } from "../../variants/ui.variant";
import { borderVariants, cx, GradientDirection, interactionStates, motionVariants, radiusVariants, resolveGradientStyle, shadowVariants, sizeVariants } from "../../variants/shared.variant";
import Loading, { LoadingVariant } from "../loading/loading";

type CustomInputElement = HTMLInputElement | HTMLTextAreaElement;

type CustomInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'height' | 'onChange' | 'onBlur'> &
  Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size' | 'height' | 'onChange' | 'onBlur'> & {
  variant?: UICommonVariant;
  size?: keyof typeof sizeVariants;
  rounded?: keyof typeof radiusVariants;
  border?: keyof typeof borderVariants;
  gradient?: GradientDirection;
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
  multiline?: boolean;
  height?: React.CSSProperties["height"];
  onChange?: React.ChangeEventHandler<CustomInputElement>;
  onBlur?: React.FocusEventHandler<CustomInputElement>;
};

export function CustomInput({
  variant = "primary",
  size = "md",
  rounded = "md",
  border = "borderB",
  gradient = "btu",
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
  multiline = false,
  height,
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
  const isPassword = !multiline && type === "password";
  const isNumber = !multiline && type === "number";
  const visibleLabel = showLabel ? label || String(rest["aria-label"] || rest.placeholder || "") : "";
  const resolvedId = rest.id || inputId;
  const displayedValue = isNumber && numberDraft !== null ? numberDraft : value;
  const resolvedHeightProp = height === "" ? undefined : height;
  const resolvedHeight = resolvedHeightProp ?? (multiline ? style?.height ?? "8rem" : undefined);
  const controlStyle = {
    backgroundColor: colorStyle.backgroundColor,
    ...resolveGradientStyle(colorStyle.backgroundColor, gradient),
    borderColor: invalid ? "var(--danger-border-nomode)" : colorStyle.borderColor,
    ...style,
    ...(resolvedHeight !== undefined ? { height: resolvedHeight } : {}),
  };
  const handleChange = (event: React.ChangeEvent<CustomInputElement>) => {
    if (isNumber && event.target.value === "") {
      setNumberDraft("");
      return;
    }
    if (isNumber) setNumberDraft(null);
    onChange?.(event);
  };
  const handleBlur = (event: React.FocusEvent<CustomInputElement>) => {
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
  const controlClassName = cx(
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
    multiline && "resize-y py-3 leading-6",
    className
  );
  const control = (
    <div className={cx("relative inline-flex", multiline ? "items-start" : "items-center", fullWidth && "w-full")}>
      {!isLoading && icon && (
        <span className={cx("absolute right-3 text-secondary-text", multiline && "top-3")}>{icon}</span>
      )}
      {multiline ? (
        <textarea
          {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          id={resolvedId}
          value={displayedValue}
          onChange={handleChange}
          onBlur={handleBlur}
          aria-invalid={invalid || rest["aria-invalid"]}
          disabled={isDisabled}
          className={controlClassName}
          style={controlStyle}
        />
      ) : (
        <input
          {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
          id={resolvedId}
          type={isPassword && showPassword ? "text" : type}
          value={displayedValue}
          onChange={handleChange}
          onBlur={handleBlur}
          aria-invalid={invalid || rest["aria-invalid"]}
          disabled={isDisabled}
          className={controlClassName}
          style={controlStyle}
        />
      )}
      {isLoading && (
        <span className={cx("absolute left-3 flex items-center gap-2 text-secondary-text", multiline && "top-3")}>
          <Loading loading={loading} size={size} />
          {loadingText && <span className="text-sm">{loadingText}</span>}
        </span>
      )}
      {!isLoading && resolvedIconAfter && (
        <span className={cx("absolute left-3 text-primary-text", multiline && "top-3")}>{resolvedIconAfter}</span>
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
