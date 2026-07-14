import { NextResponse } from "next/server";

type ApiInit = {
  status?: number;
  message?: string;
};

export function apiOk<T>(data: T, init: ApiInit = {}) {
  return NextResponse.json(
    {
      ok: true,
      data,
      ...(init.message ? { message: init.message } : {}),
    },
    { status: init.status ?? 200 }
  );
}

export function apiFail(message: string, status = 400, errors: unknown[] = [], data: unknown = null) {
  return NextResponse.json(
    {
      ok: false,
      message,
      errors,
      ...(data === null ? {} : { data }),
    },
    { status }
  );
}

export function apiServerError(message = "خطای سرور رخ داد.") {
  return apiFail(message, 500);
}
