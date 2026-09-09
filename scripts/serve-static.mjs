import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("out");
const port = Number(process.env.PORT || 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

http
  .createServer(async (request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405);
      response.end();
      return;
    }
    try {
      const pathname = decodeURIComponent(
        new URL(request.url || "/", "http://localhost").pathname,
      );
      let target = path.resolve(root, `.${pathname}`);
      if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
        response.writeHead(400);
        response.end();
        return;
      }
      try {
        if ((await stat(target)).isDirectory())
          target = path.join(target, "index.html");
      } catch {
        if (!path.extname(target)) target += ".html";
      }
      let status = 200;
      let body;
      try {
        body = await readFile(target);
      } catch {
        status = 404;
        target = path.join(root, "404.html");
        body = await readFile(target);
      }
      response.writeHead(status, {
        "Content-Type":
          types[path.extname(target)] || "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(request.method === "HEAD" ? undefined : body);
    } catch {
      response.writeHead(500);
      response.end("Static site unavailable. Run npm run build first.");
    }
  })
  .listen(port, "127.0.0.1", () =>
    process.stdout.write(`Static demo: http://127.0.0.1:${port}\n`),
  );
