const fs = require("fs").promises;
const path = require("path");

const rootDir = process.cwd();

const SKIP_NAMES = new Set(["__vc", "api", "node_modules"]);

async function buildTree(dir, baseDir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const items = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") || SKIP_NAMES.has(entry.name)) {
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

module.exports = async (req, res) => {
  try {
    const tree = {
      type: "folder",
      name: path.basename(rootDir),
      path: "",
      children: await buildTree(rootDir, rootDir),
    };

    res.setHeader("Content-Type", "application/json");
    res.status(200).send(JSON.stringify(tree));
  } catch (error) {
    res.status(500).send("Server error");
  }
};
