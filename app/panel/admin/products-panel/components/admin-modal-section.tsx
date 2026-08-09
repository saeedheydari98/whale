"use client";

import { type ReactNode } from "react";
import { CustomAccordion, type CustomAccordionStatus } from "@/app/design-system/components/ui/accordion";

export type AdminModalSectionStatus = Extract<CustomAccordionStatus, "complete" | "incomplete" | "optional">;

type AdminModalSectionProps = {
  title: string;
  status: AdminModalSectionStatus;
  children: ReactNode;
  meta?: string;
  defaultOpen?: boolean;
  invalid?: boolean;
};

export function AdminModalSection({
  title,
  status,
  children,
  meta,
  defaultOpen,
  invalid = false,
}: AdminModalSectionProps) {
  return (
    <CustomAccordion
      title={title}
      status={status}
      meta={meta}
      defaultOpen={defaultOpen}
      invalid={invalid}
    >
      {children}
    </CustomAccordion>
  );
}
