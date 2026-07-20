import { openApiDocument } from "@/lib/openapi";

export const dynamic = "force-static";

export function GET() {
  return Response.json(openApiDocument, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
