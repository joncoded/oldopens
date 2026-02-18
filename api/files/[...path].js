const fs = require("fs").promises;
const path = require("path");

const rootDir = process.cwd();
const BLOCKED_PREFIXES = ["__vc", "api", "node_modules"];

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

module.exports = async (req, res) => {
  try {
    const parts = Array.isArray(req.query.path) ? req.query.path : [req.query.path];
    const relPath = parts.filter(Boolean).join("/");
    const safePath = path
      .normalize(relPath)
      .replace(/^\.\.(\/|\\|$)+/, "");
    const absPath = path.join(rootDir, safePath);
    const firstSegment = safePath.split("/")[0];

    if (BLOCKED_PREFIXES.includes(firstSegment)) {
      res.status(403).send("Forbidden");
      return;
    }

    if (!absPath.startsWith(rootDir)) {
      res.status(403).send("Forbidden");
      return;
    }

    const stat = await fs.stat(absPath);
    if (!stat.isFile()) {
      res.status(404).send("Not found");
      return;
    }

    const data = await fs.readFile(absPath);
    res.setHeader("Content-Type", getContentType(absPath));
    res.status(200).send(data);
  } catch (error) {
    res.status(500).send("Server error");
  }
};
