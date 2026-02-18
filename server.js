const http = require("http");
const fs = require("fs").promises;
const path = require("path");

const rootDir = __dirname;

const server = http.createServer(async (req, res) => {
  try {
    const baseUrl = `http://${req.headers.host || "localhost"}`;
    const url = new URL(req.url, baseUrl);

    if (url.pathname === "/api/tree") {
      const tree = {
        type: "folder",
        name: path.basename(rootDir),
        path: "",
        children: await buildTree(rootDir, rootDir),
      };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(tree));
      return;
    }

    if (url.pathname.startsWith("/files/")) {
      const relPath = decodeURIComponent(url.pathname.replace("/files/", ""));
      const safePath = path
        .normalize(relPath)
        .replace(/^\.\.(\/|\\|$)+/, "");
      const absPath = path.join(rootDir, safePath);

      if (!absPath.startsWith(rootDir)) {
        res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Forbidden");
        return;
      }

      const stat = await fs.stat(absPath);
      if (!stat.isFile()) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }

      const data = await fs.readFile(absPath);
      res.writeHead(200, {
        "Content-Type": getContentType(absPath),
      });
      res.end(data);
      return;
    }

    if (url.pathname === "/" || url.pathname === "/index.html") {
      const filePath = path.join(rootDir, "index.html");
      const html = await fs.readFile(filePath, "utf8");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  } catch (error) {
    console.error("Request error:", error);
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Server error");
  }
});

async function buildTree(dir, baseDir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const items = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath).split(path.sep).join("/");
    if (entry.isDirectory()) {
      items.push({
        type: "folder",
        name: entry.name,
        path: relPath,
        children: await buildTree(fullPath, baseDir),
      });
    } else {
      items.push({ type: "file", name: entry.name, path: relPath });
    }
  }

  items.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "folder" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return items;
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".txt": "text/plain; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
  };

  return types[ext] || "application/octet-stream";
}

const port = process.env.PORT ? Number(process.env.PORT) : 5173;
server.listen(port, () => {
  console.log(`Folder browser running at http://localhost:${port}`);
});
