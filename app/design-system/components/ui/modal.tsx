"use client";

import React from "react";
import { createPortal } from "react-dom";
import { CustomButton } from "./button";
import { CustomCard } from "./card";
import { AppHeading } from "./text";
import { UICommonVariant } from "../../variants/ui.variant";
import { LoadingVariant } from "../loading/loading";
import { borderVariants, GradientDirection, radiusVariants, resolveGlassBackground, resolveGradientStyle, shadowVariants, sizeVariants } from "../../variants/shared.variant";
import { HiMiniXMark } from "react-icons/hi2";

type CustomModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  variant?: UICommonVariant;
  size?: keyof typeof sizeVariants;
  rounded?: keyof typeof radiusVariants;
  border?: keyof typeof borderVariants;
  gradient?: GradientDirection;
  shadow?: keyof typeof shadowVariants;
  closeIcon?: React.ReactNode;
  closeText?: string;
  loading?: LoadingVariant;
  isLoading?: boolean;
  loadingText?: string;
  closeOnBackdrop?: boolean;
};

export function CustomModal({
  open,
  onClose,
  title = "پنجره",
  children,
  variant = "primary",
  size = "md",
  rounded = "lg",
  border = "dashed",
  gradient,
  shadow = "lg",
  closeIcon = <HiMiniXMark size={24}/>,
  closeText = "",
  loading = "spinner",
  isLoading = false,
  loadingText,
  closeOnBackdrop = true,
}: CustomModalProps) {
  const [mounted, setMounted] = React.useState(false);
  const titleId = React.useId();
  const overlayColor = "color-mix(in srgb, var(--primary) 8%, transparent)";

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!open) return null;

  const cardBackgroundColor = resolveGlassBackground("var(--bg-surface)", 88);
  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ backgroundColor: overlayColor }}
      onClick={closeOnBackdrop ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <CustomCard
        variant={variant}
        size={size}
        rounded={rounded}
        border={border}
        gradient={gradient}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto text-primary-text"
        style={{
          backgroundColor: cardBackgroundColor,
          ...resolveGradientStyle(cardBackgroundColor, gradient, `var(--${variant}-border)`),
          color: "var(--body-text)",
        }}
        shadow={shadow}
        hover="none"
        onClick={(event) => event.stopPropagation()}
        isLoading={isLoading}
        loading={loading}
        loadingText={loadingText}
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <AppHeading level={2} id={titleId} className="text-xl font-bold">{title}</AppHeading>
            <CustomButton variant="danger" size="sm" onClick={onClose} disabled={isLoading}>
              {closeText || closeIcon}
            </CustomButton>
          </div>
          <div>{children}</div>
        </div>
      </CustomCard>
    </div>
  );

  return mounted ? createPortal(modal, document.body) : modal;
}
