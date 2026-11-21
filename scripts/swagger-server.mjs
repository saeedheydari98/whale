import { createServer } from "node:http";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const preferredPort = Number(process.env.PORT || process.env.SWAGGER_PORT || 3001);
const maxPort = preferredPort + 20;
let port = preferredPort;
const nextOrigin = process.env.NEXT_API_ORIGIN || "http://localhost:3000";
const openApiUrl = `${nextOrigin.replace(/\/$/, "")}/api/openapi`;

function swaggerHtml() {
  return `<!doctype html>
<html lang="fa" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Swagger API | فروشگاه وال</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      html,
      body,
      #swagger-ui {
        min-height: 100%;
      }

      body {
        margin: 0;
        background: #f6f8fa;
      }

      .swagger-ui {
        direction: ltr;
      }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <noscript><div>JavaScript is required to view Swagger UI.</div></noscript>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.addEventListener("load", function () {
        window.ui = SwaggerUIBundle({
          url: "/api/openapi",
          dom_id: "#swagger-ui",
          deepLinking: true,
          displayRequestDuration: true,
          filter: true,
          docExpansion: "none",
          persistAuthorization: true,
          requestInterceptor: function (request) {
            request.credentials = "include";
            return request;
          },
          presets: [
            SwaggerUIBundle.presets.apis
          ],
          layout: "BaseLayout"
        });
      });
    </script>
  </body>
</html>`;
}

async function proxyApi(request, response, url) {
  try {
    // Keep browser requests and auth cookies on the Swagger origin. The upstream
    // host is fixed by configuration; paths cannot select another destination.
    const target = new URL(nextOrigin);
    target.pathname = url.pathname;
    target.search = url.search;
    const headers = new Headers();
    for (const name of ["accept", "authorization", "content-type", "cookie"]) {
      const value = request.headers[name];
      if (typeof value === "string") headers.set(name, value);
    }
    const hasBody = request.method !== "GET" && request.method !== "HEAD";
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      ...(hasBody ? { body: request, duplex: "half" } : {}),
      redirect: "manual",
    });
    response.statusCode = upstream.status;
    for (const name of ["content-type", "cache-control", "location", "retry-after"]) {
      const value = upstream.headers.get(name);
      if (value) response.setHeader(name, value);
    }
    const cookies = upstream.headers.getSetCookie();
    if (cookies.length) response.setHeader("set-cookie", cookies);
    if (upstream.body && request.method !== "HEAD") {
      await pipeline(Readable.fromWeb(upstream.body), response);
    } else {
      response.end();
    }
  } catch {
    if (response.headersSent || response.destroyed) {
      response.destroy();
      return;
    }
    response.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({
      ok: false,
      message: `Could not reach the Next.js API at ${nextOrigin}. Start it with npm run dev.`,
    }));
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);

  if (url.pathname.startsWith("/api/")) {
    await proxyApi(request, response, url);
    return;
  }

  if (url.pathname === "/" || url.pathname === "/swagger") {
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
    });
    response.end(swaggerHtml());
    return;
  }

  response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("Not found");
});

server.on("error", (error) => {
  if (error && error.code === "EADDRINUSE" && port < maxPort) {
    const nextPort = port + 1;
    console.warn(`Port ${port} is already in use. Trying ${nextPort}...`);
    port = nextPort;
    server.listen(port, "0.0.0.0");
    return;
  }

  console.error(error);
  process.exit(1);
});

server.on("listening", () => {
  console.log(`Swagger UI is serving on http://localhost:${port}`);
  console.log(`OpenAPI source: ${openApiUrl}`);
});

server.listen(port, "0.0.0.0");
