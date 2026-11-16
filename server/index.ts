import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Serve static files from dist/public in production or client/public in dev
  const distPath = path.resolve(__dirname, "..", "dist", "public");
  const clientPath = path.resolve(__dirname, "..", "client");
  const staticPath = fs.existsSync(distPath) ? distPath : clientPath;

  app.use(express.static(staticPath));

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "sierra-estates-legacy-spa", timestamp: new Date().toISOString() });
  });

  // Handle client-side routing - Express 5 compatible fallback
  app.use((_req, res) => {
    const indexPath = path.join(staticPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(200).send(`
        <!doctype html>
        <html lang="ar" dir="rtl">
          <head>
            <meta charset="UTF-8" />
            <title>Sierra Estates — Legacy Portal</title>
            <style>
              body { font-family: system-ui, sans-serif; background: #0b1528; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { background: #16243b; padding: 2.5rem; border-radius: 12px; border: 1px solid #233859; max-width: 480px; text-align: center; }
              h1 { color: #d4af37; font-size: 1.5rem; margin-bottom: 0.5rem; }
              p { color: #94a3b8; font-size: 0.95rem; line-height: 1.6; }
              a { display: inline-block; margin-top: 1rem; color: #38bdf8; text-decoration: none; font-weight: 500; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>سييرا للعقارات — البوابة الإدارية والتطبيق السابق</h1>
              <p>خادم التطبيق يعمل بنجاح. التطبيق الرئيسي لسييرا متاح عبر Next.js App Router على المنفذ الرئيسي.</p>
              <a href="http://127.0.0.1:4378">العودة إلى خريطة المعمارية (Floorplan)</a>
            </div>
          </body>
        </html>
      `);
    }
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Legacy server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
