export const dynamic = "force-static";

const swaggerHtml = `<!doctype html>
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
            request.credentials = "same-origin";
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

export function GET() {
  return new Response(swaggerHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
