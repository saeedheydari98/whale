import { NextResponse } from "next/server";

type ApiInit = {
  status?: number;
  message?: string;
  showMessage?: string;
};

export function apiOk<T>(data: T, init: ApiInit = {}) {
  return NextResponse.json(
    {
      ok: true,
      data,
      message: init.message ?? "REQUEST_SUCCEEDED",
      showMessage: init.showMessage ?? "درخواست با موفقیت انجام شد.",
    },
    { status: init.status ?? 200 }
  );
}

function getErrorCode(status: number) {
  if (status === 400) return "VALIDATION_ERROR";
  if (status === 401) return "UNAUTHENTICATED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 413) return "PAYLOAD_TOO_LARGE";
  if (status === 415) return "UNSUPPORTED_MEDIA_TYPE";
  if (status === 422) return "UNPROCESSABLE_ENTITY";
  if (status === 429) return "RATE_LIMIT_EXCEEDED";
  if (status === 503) return "SERVICE_UNAVAILABLE";
  if (status >= 500) return "INTERNAL_SERVER_ERROR";
  return "REQUEST_FAILED";
}

export function apiFail(showMessage: string, status = 400, errors: unknown[] = [], data: unknown = null, message?: string) {
  return NextResponse.json(
    {
      ok: false,
      message: message ?? getErrorCode(status),
      showMessage,
      errors,
      ...(data === null ? {} : { data }),
    },
    { status }
  );
}

export function apiServerError(message = "خطای سرور رخ داد.") {
  return apiFail(message, 500);
}
