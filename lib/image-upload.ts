export const WEBP_IMAGE_ACCEPT = "image/webp,.webp";

export const WEBP_ONLY_ERROR =
  "فقط تصاویر WebP مجاز هستند. لطفاً فایل را با فرمت WebP آپلود کنید.";

export function isWebpUploadFile(file: File): boolean {
  const type = String(file.type ?? "").toLowerCase();
  const name = String(file.name ?? "").toLowerCase();
  return type === "image/webp" || name.endsWith(".webp");
}

export function isAllowedWebpImageValue(value: unknown): boolean {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return true;

  if (trimmed.startsWith("data:image/webp")) return true;

  const lower = trimmed.toLowerCase();
  if (lower.startsWith("data:image/")) return false;

  try {
    const url = trimmed.startsWith("http") ? new URL(trimmed) : new URL(trimmed, "http://local");
    return url.pathname.toLowerCase().endsWith(".webp");
  } catch {
    return lower.endsWith(".webp");
  }
}

export function filterWebpUploadFiles(files: FileList | File[] | null | undefined) {
  const selected = Array.from(files ?? []);
  const accepted: File[] = [];
  const rejected: File[] = [];

  for (const file of selected) {
    if (isWebpUploadFile(file)) accepted.push(file);
    else rejected.push(file);
  }

  return { accepted, rejected };
}

export type WebpDataUrlResult =
  | { ok: true; dataUrl: string }
  | { ok: false; error: string };

export async function readWebpFileAsDataUrl(file: File | null | undefined): Promise<WebpDataUrlResult> {
  if (!file) return { ok: false, error: "" };
  if (!isWebpUploadFile(file)) return { ok: false, error: WEBP_ONLY_ERROR };

  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });

  if (!dataUrl || !isAllowedWebpImageValue(dataUrl)) {
    return { ok: false, error: WEBP_ONLY_ERROR };
  }

  return { ok: true, dataUrl };
}

export type WebpDataUrlsResult =
  | { ok: true; dataUrls: string[] }
  | { ok: false; error: string };

export async function readWebpFilesAsDataUrls(
  files: FileList | File[] | null | undefined
): Promise<WebpDataUrlsResult> {
  const { accepted, rejected } = filterWebpUploadFiles(files);
  if (rejected.length > 0) return { ok: false, error: WEBP_ONLY_ERROR };
  if (accepted.length === 0) return { ok: false, error: "" };

  const dataUrls: string[] = [];
  for (const file of accepted) {
    const result = await readWebpFileAsDataUrl(file);
    if (!result.ok) return { ok: false, error: result.error || WEBP_ONLY_ERROR };
    dataUrls.push(result.dataUrl);
  }

  return { ok: true, dataUrls };
}

export function findInvalidWebpImageValue(values: unknown[]): string | null {
  for (const value of values) {
    if (!isAllowedWebpImageValue(value)) return WEBP_ONLY_ERROR;
  }
  return null;
}
