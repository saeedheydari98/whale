"use client";

import { useCallback } from "react";

function readFile(file: File) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

export function useFileDataUrl() {
  const readFileAsDataUrl = useCallback(async (file: File | null | undefined) => {
    if (!file) return "";
    return readFile(file);
  }, []);

  const readFilesAsDataUrls = useCallback(async (files: FileList | File[] | null | undefined) => {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) return [];
    return Promise.all(selectedFiles.map(readFile));
  }, []);

  return {
    readFileAsDataUrl,
    readFilesAsDataUrls,
  };
}
