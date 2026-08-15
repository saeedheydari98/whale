"use client";

import React from "react";
import { IoEyeOffOutline, IoEyeOutline } from "react-icons/io5";
import { resolveControlCssVars, UICommonVariant } from "../../variants/ui.variant";
import { borderVariants, cx, glassSurfaceClasses, GradientDirection, interactionStates, motionVariants, radiusVariants, resolveGlassBackground, resolveGradientStyle, shadowVariants, sizeVariants } from "../../variants/shared.variant";
import Loading, { LoadingVariant } from "../loading/loading";

type CustomInputElement = HTMLInputElement | HTMLTextAreaElement;

type CustomInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'height' | 'onChange' | 'onBlur' | 'onFocus'> &
  Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size' | 'height' | 'onChange' | 'onBlur' | 'onFocus'> & {
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
  onFocus?: React.FocusEventHandler<CustomInputElement>;
};

export function CustomInput({
  variant = "primary",
  size = "md",
  rounded = "md",
  border = "base",
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
  onFocus,
  value,
  type,
  ...rest
}: CustomInputProps) {
  const inputId = React.useId();
  const [showPassword, setShowPassword] = React.useState(false);
  const [numberDraft, setNumberDraft] = React.useState<string | null>(null);
  const [isFocused, setIsFocused] = React.useState(false);
  const [hasUncontrolledValue, setHasUncontrolledValue] = React.useState(() => hasInputValue(rest.defaultValue));
  const colorStyle = resolveControlCssVars(variant);
  const glassBackground = resolveGlassBackground(colorStyle.backgroundColor, 74);
  const isDisabled = disabled || isLoading;
  const isPassword = !multiline && type === "password";
  const isNumber = !multiline && type === "number";
  const isSearchInput = !multiline && (
    type === "search"
    || rest.inputMode === "search"
    || rest.enterKeyHint === "search"
  );
  const labelText = label || String(rest.placeholder || rest["aria-label"] || "");
  const visibleLabel = showLabel && !isSearchInput ? labelText : "";
  const resolvedId = rest.id || inputId;
  const displayedValue = isNumber && numberDraft !== null ? numberDraft : value;
  const hasControlledValue = value !== undefined;
  const hasCurrentValue = numberDraft !== null
    ? hasInputValue(numberDraft)
    : hasControlledValue
      ? hasInputValue(value)
      : hasUncontrolledValue;
  const shouldShowFloatingLabel = Boolean(visibleLabel && (isFocused || hasCurrentValue));
  const resolvedPlaceholder = shouldShowFloatingLabel ? "" : rest.placeholder;
  const resolvedHeightProp = height === "" ? undefined : height;
  const resolvedHeight = resolvedHeightProp ?? (multiline ? style?.height ?? "8rem" : undefined);
  const wrapperStyle = {
    backgroundColor: glassBackground,
    ...resolveGradientStyle(glassBackground, gradient),
    ...style,
    ...(resolvedHeight !== undefined ? { height: resolvedHeight } : {}),
  };
  const controlStyle = {
    backgroundColor: "transparent",
    borderColor: "transparent",
    ...(resolvedHeight !== undefined ? { height: resolvedHeight } : {}),
  };
  const fieldsetStyle = {
    borderColor: invalid
      ? "var(--danger-border-nomode)"
      : isFocused
        ? "var(--primary-border)"
        : colorStyle.borderColor,
  };
  const handleChange = (event: React.ChangeEvent<CustomInputElement>) => {
    if (!hasControlledValue) setHasUncontrolledValue(hasInputValue(event.target.value));
    if (isNumber && event.target.value === "") {
      setNumberDraft("");
      return;
    }
    if (isNumber) setNumberDraft(null);
    onChange?.(event);
  };
  const handleBlur = (event: React.FocusEvent<CustomInputElement>) => {
    setIsFocused(false);
    if (isNumber && numberDraft !== null) setNumberDraft(null);
    onBlur?.(event);
  };
  const handleFocus = (event: React.FocusEvent<CustomInputElement>) => {
    setIsFocused(true);
    onFocus?.(event);
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
    "peer relative z-10 bg-transparent text-primary-text placeholder:text-secondary-text",
    "focus:outline-none",
    sizeVariants[size],
    radiusVariants[rounded],
    "border border-transparent",
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
  const labelOffsetClass = icon !== undefined ? "right-10" : "right-3";
  const legendOffsetClass = icon !== undefined ? "mr-10" : "mr-3";
  const control = (
    <div
      className={cx(
        "relative inline-flex",
        multiline ? "items-start" : "items-center",
        fullWidth && "w-full",
        radiusVariants[rounded],
        glassSurfaceClasses
      )}
      style={wrapperStyle}
    >
      {multiline ? (
        <textarea
          {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          id={resolvedId}
          value={displayedValue}
          placeholder={resolvedPlaceholder}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
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
          placeholder={resolvedPlaceholder}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          aria-invalid={invalid || rest["aria-invalid"]}
          disabled={isDisabled}
          className={controlClassName}
          style={controlStyle}
        />
      )}
      <fieldset
        aria-hidden="true"
        className={cx(
          "pointer-events-none absolute inset-0 z-0 min-w-0",
          radiusVariants[rounded],
          borderVariants[border],
          "peer-focus:border-2",
          motionVariants.smooth
        )}
        style={fieldsetStyle}
      >
        {visibleLabel ? (
          <legend
            className={cx(
              "invisible h-3 max-w-0 overflow-hidden whitespace-nowrap px-0 text-[11px] font-bold leading-none text-primary transition-all duration-200",
              shouldShowFloatingLabel && "max-w-[calc(100%-1.5rem)] px-1.5",
              legendOffsetClass
            )}
          >
            <span>{visibleLabel}</span>
          </legend>
        ) : null}
      </fieldset>
      {shouldShowFloatingLabel ? (
        <label
          htmlFor={resolvedId}
          className={cx(
            "pointer-events-none absolute top-0 z-20 flex -translate-y-1/2 items-center px-1.5 text-[11px] font-bold leading-none text-primary transition-colors",
            labelOffsetClass
          )}
        >
          <span>{visibleLabel}</span>
        </label>
      ) : null}
      {!isLoading && icon && (
        <span className={cx("absolute right-3 z-20 text-secondary-text", multiline && "top-3")}>{icon}</span>
      )}
      {isLoading && (
        <span className={cx("absolute left-3 z-20 flex items-center gap-2 text-secondary-text", multiline && "top-3")}>
          <Loading loading={loading} size={size} />
          {loadingText && <span className="text-sm">{loadingText}</span>}
        </span>
      )}
      {!isLoading && resolvedIconAfter && (
        <span className={cx("absolute left-3 z-20 text-primary-text", multiline && "top-3")}>{resolvedIconAfter}</span>
      )}
    </div>
  );

  if (!visibleLabel) return control;

  return <div className={cx("flex flex-col", fullWidth && "w-full")}>{control}</div>;
}

function hasInputValue(value: unknown) {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  return String(value).length > 0;
}
