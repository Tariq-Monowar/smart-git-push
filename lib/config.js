const fs = require("node:fs");
const path = require("node:path");

const DEFAULTS = {
  branch: "main",
  remote: "origin",
  junkFiles: [
    "nul",
    "thumbs.db",
    ".ds_store",
    "desktop.ini",
    "tsconfig.tsbuildinfo",
  ],
  areaRules: [],
};

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function loadConfig(cwd = process.cwd()) {
  const fromFile = readJsonIfExists(path.join(cwd, ".smart-git-push.json"));
  const pkg = readJsonIfExists(path.join(cwd, "package.json"));
  const fromPkg = pkg?.smartGitPush ?? pkg?.["smart-git-push"] ?? null;

  return {
    ...DEFAULTS,
    ...(fromPkg && typeof fromPkg === "object" ? fromPkg : {}),
    ...(fromFile && typeof fromFile === "object" ? fromFile : {}),
  };
}

module.exports = { DEFAULTS, loadConfig };
