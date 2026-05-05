"use client";

import React from "react";
import { CustomButton } from "./button";
import { UICommonVariant } from "../variants/ui.variant";

type FloatButtonProps = {
  onClick?: () => void;
  icon?: React.ReactNode;
  label?: string;
  variant?: UICommonVariant;
  position?: "bottom-right" | "bottom-left";
};

export function FloatButton({
  onClick,
  icon = "+",
  label = "Action",
  variant = "primary",
  position = "bottom-right",
}: FloatButtonProps) {
  const positionClass =
    position === "bottom-left" ? "left-6 bottom-6" : "right-6 bottom-6";

  return (
    <div className={`fixed z-40 ${positionClass}`}>
      <CustomButton
        variant={variant}
        rounded="full"
        shadow="lg"
        hover="lift"
        border="base"
        onClick={onClick}
        icon={<span className="text-lg leading-none">{icon}</span>}
      >
        {label}
      </CustomButton>
    </div>
  );
}
