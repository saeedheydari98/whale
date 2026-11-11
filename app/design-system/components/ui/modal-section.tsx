"use client";

import { type ReactNode } from "react";
import { CustomAccordion, type CustomAccordionStatus } from "./accordion";
import { AppHeading } from "./text";

export type CustomModalSectionStatus = Extract<CustomAccordionStatus, "complete" | "incomplete" | "optional">;

export function CustomModalSection({ title, status, children, meta, defaultOpen, open, onOpenChange, invalid = false }: {
  title: string;
  status: CustomModalSectionStatus;
  children: ReactNode;
  meta?: string;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  invalid?: boolean;
}) {
  return (
    <section className="flex flex-col gap-2">
      <AppHeading level={3} className="sr-only text-sm font-bold text-primary-text">{title}</AppHeading>
      <CustomAccordion title={title} status={status} meta={meta} defaultOpen={defaultOpen} open={open} onOpenChange={onOpenChange} invalid={invalid}>{children}</CustomAccordion>
    </section>
  );
}
