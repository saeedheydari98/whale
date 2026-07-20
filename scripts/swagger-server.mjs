import { createServer } from "node:http";

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
    <title>Swagger UI</title>
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

async function proxyOpenApi(response) {
  try {
    const upstream = await fetch(openApiUrl);
    const body = await upstream.text();

    response.writeHead(upstream.status, {
      "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
      "Cache-Control": "no-cache",
    });
    response.end(body);
  } catch (error) {
    response.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({
      ok: false,
      message: `Could not load OpenAPI document from ${openApiUrl}`,
    }));
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);

  if (url.pathname === "/api/openapi") {
    await proxyOpenApi(response);
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
