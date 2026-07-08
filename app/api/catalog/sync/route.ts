import { getCatalogSyncVersion, subscribeCatalogSync } from "@/lib/api/catalog-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(
          encoder.encode(`event: catalog\ndata: ${JSON.stringify(event)}\n\n`)
        );
      };

      send({
        type: "catalog.ready",
        version: getCatalogSyncVersion(),
        at: new Date().toISOString(),
      });

      const unsubscribe = subscribeCatalogSync(send);
      const interval = setInterval(() => {
        send({
          type: "catalog.ping",
          version: getCatalogSyncVersion(),
          at: new Date().toISOString(),
        });
      }, 15000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

