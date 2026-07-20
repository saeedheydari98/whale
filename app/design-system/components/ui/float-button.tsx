"use client";

import React from "react";
import { CustomButton } from "./button";
import { UICommonVariant } from "../../variants/ui.variant";
import { LoadingVariant } from "../loading/loading";
import { borderVariants, cursorVariants, GradientDirection, interactionStates, radiusVariants, shadowVariants, sizeVariants } from "../../variants/shared.variant";

type FloatButtonProps = {
  onClick?: () => void;
  icon?: React.ReactNode;
  iconAfter?: React.ReactNode;
  label?: string;
  variant?: UICommonVariant;
  size?: keyof typeof sizeVariants;
  rounded?: keyof typeof radiusVariants;
  border?: keyof typeof borderVariants;
  gradient?: GradientDirection;
  shadow?: keyof typeof shadowVariants;
  hover?: keyof typeof interactionStates.hover;
  cursor?: keyof typeof cursorVariants;
  fullWidth?: boolean;
  position?: "bottom-right" | "bottom-left";
  loading?: LoadingVariant;
  isLoading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  className?: string;
};

export function FloatButton({
  onClick,
  icon = "+",
  iconAfter,
  label = "Action",
  variant = "primary",
  size = "md",
  rounded = "full",
  border = "strong",
  gradient = "btu",
  shadow = "lg",
  hover = "lift",
  cursor = "pointer",
  fullWidth = false,
  position = "bottom-right",
  loading = "spinner",
  isLoading = false,
  loadingText,
  disabled = false,
  className,
}: FloatButtonProps) {
  const positionClass =
    position === "bottom-left" ? "left-4 bottom-20 md:left-6 md:bottom-6" : "right-4 bottom-20 md:right-6 md:bottom-6";

  return (
    <div className={`fixed z-[60] ${positionClass} ${className || ""}`}>
      <CustomButton
        variant={variant}
        size={size}
        rounded={rounded}
        border={border}
        gradient={gradient}
        shadow={shadow}
        hover={hover}
        cursor={cursor}
        fullWidth={fullWidth}
        onClick={onClick}
        icon={<span className="text-lg leading-none">{icon}</span>}
        iconAfter={iconAfter}
        loading={loading}
        isLoading={isLoading}
        loadingText={loadingText}
        disabled={disabled}
      >
        {label}
      </CustomButton>
    </div>
  );
}
