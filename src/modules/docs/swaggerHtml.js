// Template HTML untuk halaman Swagger UI CDN

const swaggerHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GDGoC UNSRI REST API — Swagger Documentation</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css" />
  <link rel="icon" type="image/png" href="https://www.gstatic.com/devrel-devsite/prod/v2b694b85ba46aebe28c0c451bdf8018e69efeb8d09e59d43ec8d3d922a9446d5/developers/images/favicon.png" />
  <style>
    body {
      margin: 0;
      background: #fafafa;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }
    .topbar { display: none !important; }
    .custom-banner {
      background: linear-gradient(135deg, #1a73e8 0%, #4285f4 100%);
      color: white;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      flex-wrap: wrap;
      gap: 12px;
    }
    .custom-banner .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 1.15rem;
      font-weight: 700;
    }
    .custom-banner .nav-links {
      display: flex;
      gap: 8px;
    }
    .custom-banner a {
      color: white;
      background: rgba(255, 255, 255, 0.2);
      text-decoration: none;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 500;
      transition: background 0.2s ease;
    }
    .custom-banner a:hover {
      background: rgba(255, 255, 255, 0.35);
    }
  </style>
</head>
<body>
  <div class="custom-banner">
    <div class="brand">
      <span>🚀 GDGoC UNSRI Management System — REST API</span>
    </div>
    <div class="nav-links">
      <a href="/openapi.yaml" target="_blank" download="openapi.yaml">Download OpenAPI YAML</a>
      <a href="/health" target="_blank">Health Check</a>
    </div>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.min.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "/openapi.yaml",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout",
        docExpansion: "list",
        filter: true
      });
    };
  </script>
</body>
</html>`;

module.exports = swaggerHtml;
