import { ZodError, type ZodType } from "zod";
import { apiFail } from "@/lib/api/response";

export async function parseJsonBody<T>(request: Request, schema: ZodType<T>) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return {
      ok: false as const,
      response: validationError(parsed.error),
    };
  }

  return {
    ok: true as const,
    data: parsed.data,
  };
}

export function validationError(error: ZodError) {
  return apiFail(
    "validation failed",
    422,
    error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }))
  );
}
