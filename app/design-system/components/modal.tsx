"use client";

import React from "react";
import { CustomButton } from "./button";
import { CustomCard } from "./card";
import { UICommonVariant } from "../variants/ui.variant";

type CustomModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  variant?: UICommonVariant;
  closeText?: string;
};

export function CustomModal({
  open,
  onClose,
  title = "Modal",
  children,
  variant = "primary",
  closeText = "Close",
}: CustomModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <CustomCard
        variant={variant}
        className="w-full max-w-lg"
        shadow="lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <CustomButton variant={variant} size="sm" onClick={onClose}>
            {closeText}
          </CustomButton>
        </div>
        <div>{children}</div>
      </CustomCard>
    </div>
  );
}
