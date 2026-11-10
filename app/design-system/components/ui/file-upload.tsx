"use client";

import { useId } from "react";
import { IoCloudUploadOutline } from "react-icons/io5";
import { cx } from "../../variants/shared.variant";

export function CustomFileUpload({ label, accept, multiple = false, disabled = false, onSelectFiles }: {
  label: string;
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  onSelectFiles: (files: FileList | null) => void;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className={cx("flex items-center justify-center gap-2 rounded-md border border-dashed border-primary-border bg-primary-card py-4 text-sm font-semibold text-secondary-text transition-colors focus-within:ring-2 focus-within:ring-primary-border", disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-primary-bg")}>
      <IoCloudUploadOutline className="text-xl" aria-hidden="true" />
      <span>{label}</span>
      <input id={id} type="file" accept={accept} multiple={multiple} disabled={disabled} className="sr-only" onChange={(event) => onSelectFiles(event.target.files)} />
    </label>
  );
}
