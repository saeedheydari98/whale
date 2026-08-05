"use client";

import {
  readWebpFileAsDataUrl,
  readWebpFilesAsDataUrls,
  type WebpDataUrlResult,
  type WebpDataUrlsResult,
} from "@/lib/image-upload";

export function useFileDataUrl() {
  const readFileAsDataUrl = async (file: File | null | undefined): Promise<WebpDataUrlResult> => {
    return readWebpFileAsDataUrl(file);
  };

  const readFilesAsDataUrls = async (
    files: FileList | File[] | null | undefined
  ): Promise<WebpDataUrlsResult> => {
    return readWebpFilesAsDataUrls(files);
  };

  return {
    readFileAsDataUrl,
    readFilesAsDataUrls,
  };
}
