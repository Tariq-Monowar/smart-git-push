/** Prefer staged name-status (after git add) — lists every file, not just `packages/`. */
function parseStagedNameStatus(nameStatus) {
  return nameStatus
    .split("\n")
    .map((line) => line.replace(/\r$/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/);
      const code = parts[0];
      const path = parts.slice(1).join(" ");
      const status =
        code.startsWith("A") || code === "??"
          ? "A"
          : code.startsWith("D")
            ? "D"
            : code.startsWith("R") || code.startsWith("C")
              ? code
              : "M";
      return { status, path };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

function parseChangedFiles(porcelain) {
  return porcelain
    .split("\n")
    .map((line) => line.replace(/\r$/, ""))
    .filter((line) => line.length > 0)
    .map((line) => {
      const match = line.match(/^(.{2})\s+(.*)$/);
      if (!match) {
        return { status: "?", path: line.trim() };
      }

      const status = match[1].trim() || "?";
      let filePath = match[2].trim();
      if (filePath.includes(" -> ")) {
        filePath = filePath.split(" -> ").pop().trim();
      }
      return { status, path: filePath };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

function isNewFile(status) {
  return status === "??" || status === "A" || status.includes("A");
}

function isDeletedFile(status) {
  return status === "D" || status.includes("D");
}

function isJunkFile(filePath, junkFiles) {
  const base = filePath.split(/[/\\]/).pop()?.toLowerCase() ?? "";
  return junkFiles.includes(base);
}

function humanize(text) {
  return text
    .replace(/\.(tsx?|jsx?|mjs|cjs)$/i, "")
    .replace(/\.[^.]+$/, "")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isTypeScriptPath(filePath) {
  return /\.(tsx?|mts|cts)$/i.test(filePath);
}

function detectProjectKind(files) {
  const paths = files.map((f) => f.path.replace(/\\/g, "/"));
  const blob = paths.join("\n");
  const hasTs = paths.some(isTypeScriptPath);
  const hasTsConfig = paths.some(
    (p) => /tsconfig(\..+)?\.json$/i.test(p) || p.endsWith("tsconfig.json"),
  );

  if (/@nestjs\/common|\.controller\.ts|\.module\.ts|\.service\.ts/.test(blob)) {
    return hasTs ? "nestjs-ts" : "nestjs";
  }
  if (/react-native|expo|\.native\.|\/screens\//i.test(blob)) {
    return hasTs ? "react-native-ts" : "react-native";
  }
  if (
    /\/src\/(components|pages|app)\/|\.tsx$|vite\.config\.ts|next\.config\.ts/.test(
      blob,
    )
  ) {
    return "react-ts";
  }
  if (
    /express|\.routes\.(ts|js)|\.controllers\.(ts|js)|Request,\s*Response/.test(
      blob,
    )
  ) {
    return hasTs ? "express-ts" : "express";
  }
  if (hasTs || hasTsConfig) {
    return "typescript";
  }
  return "node";
}

function stackLabel(projectKind) {
  if (projectKind.startsWith("nestjs")) return "NestJS";
  if (projectKind.startsWith("express")) return "Express";
  if (projectKind.startsWith("react-native")) return "React Native";
  if (projectKind.startsWith("react")) return "React";
  if (projectKind === "typescript") return "TypeScript";
  return "API";
}

function areaFromPath(filePath, config) {
  const p = filePath.replace(/\\/g, "/");

  for (const rule of config.areaRules ?? []) {
    if (rule.match && rule.area) {
      const re =
        rule.match instanceof RegExp ? rule.match : new RegExp(rule.match, "i");
      if (re.test(p)) return rule.area;
    }
  }

  if (p === "package.json") return "npm scripts";
  if (p.includes("/admin_to_paerner_shipping/")) return "admin-to-partner shipping";
  if (p.includes("/paerner_to_admin_shipping/")) return "partner-to-admin shipping";
  if (/fedex\.service\./i.test(p)) return "FedEx";
  if (p.startsWith("prisma/") && p.endsWith(".prisma")) return "database";
  if (p.startsWith("scripts/")) return "scripts";
  if (/tsconfig(\..+)?\.json$/i.test(p)) return "TypeScript config";
  if (p.endsWith(".d.ts")) return "type definitions";
  if (/\.(dto|entity)\.ts$/i.test(p)) return "DTOs";
  if (/\.interface\.ts$/i.test(p) || /\/interfaces?\//i.test(p)) {
    return "interfaces";
  }
  if (/\.types\.ts$/i.test(p) || /\/types?\//i.test(p)) return "types";
  if (/\.module\.ts$/i.test(p)) return "Nest modules";
  if (/\.service\.ts$/i.test(p)) return "services";
  if (/\.controller\.ts$/i.test(p)) return "controllers";
  if (/\.routes\.ts$/i.test(p) || /\.routes\.js$/i.test(p)) return "routes";
  if (/\.middleware\.ts$/i.test(p)) return "middleware";
  if (p.endsWith("/guid.txt") || p.endsWith("/guid.md")) return "API docs";
  if (p.includes("/shoe_orders/")) return "shoe orders";
  if (p.includes("/delivered_order/")) return "delivered orders";
  if (p.includes("/treack_order/")) return "order tracking";
  if (/\/controllers?\//i.test(p)) return "controllers";
  if (/\/services?\//i.test(p)) return "services";
  if (/\/components?\//i.test(p)) return "components";
  if (/\/screens?\//i.test(p)) return "screens";
  if (/\/pages?\//i.test(p)) return "pages";
  if (/\/hooks?\//i.test(p)) return "hooks";

  const parts = p.split("/").filter(Boolean);
  const folder = parts.slice(0, -1).pop();
  return folder ? humanize(folder) : humanize(parts.pop() || p);
}

function extractExpressRoutes(diff) {
  const routes = [];
  const patterns = [
    /^\+.*\brouter\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]/gim,
    /^\+.*\bapp\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]/gim,
    /^\+.*\.route\(\s*["'`]([^"'`]+)["'`]\s*\)\s*\.(get|post|put|patch|delete)/gim,
  ];

  for (const re of patterns.slice(0, 2)) {
    let match;
    while ((match = re.exec(diff))) {
      routes.push(`${match[1].toUpperCase()} ${match[2]}`);
    }
  }

  const chainRe =
    /^\+.*\.route\(\s*["'`]([^"'`]+)["'`]\s*\)\s*\.(get|post|put|patch|delete)/gim;
  let chainMatch;
  while ((chainMatch = chainRe.exec(diff))) {
    routes.push(`${chainMatch[2].toUpperCase()} ${chainMatch[1]}`);
  }

  return [...new Set(routes)];
}

function extractNestRoutes(diff) {
  const routes = [];
  const re =
    /^\+.*@(Get|Post|Put|Patch|Delete|All|Options|Head)\(\s*(?:["'`]([^"'`]*)["'`])?\s*\)/gim;
  let match;
  while ((match = re.exec(diff))) {
    const path = match[2]?.trim() ? match[2] : "/";
    routes.push(`${match[1].toUpperCase()} ${path}`);
  }
  return [...new Set(routes)];
}

function extractNewRoutes(diff, projectKind) {
  const express = extractExpressRoutes(diff);
  const nest = extractNestRoutes(diff);
  if (projectKind.startsWith("nestjs") && nest.length) return nest;
  return [...new Set([...express, ...nest])];
}

function extractNewExports(diff) {
  const names = [];
  const patterns = [
    /^\+export (?:default )?(?:async )?function (\w+)/gm,
    /^\+export (?:default )?class (\w+)/gm,
    /^\+export (?:async )?const (\w+)/gm,
    /^\+export type (\w+)/gm,
    /^\+export interface (\w+)/gm,
    /^\+export enum (\w+)/gm,
  ];

  for (const re of patterns) {
    let match;
    while ((match = re.exec(diff))) {
      names.push(match[1]);
    }
  }
  return [...new Set(names)];
}

function extractNewTypeScriptTypes(diff) {
  const names = [];
  const patterns = [
    /^\+export type (\w+)/gm,
    /^\+export interface (\w+)/gm,
    /^\+export enum (\w+)/gm,
    /^\+type (\w+)\s*=/gm,
    /^\+interface (\w+)\s*[{<]/gm,
  ];

  for (const re of patterns) {
    let match;
    while ((match = re.exec(diff))) {
      names.push(match[1]);
    }
  }
  return [...new Set(names)];
}

function extractNewNestControllers(files) {
  return files
    .filter((f) => isNewFile(f.status) && /\.controller\.ts$/i.test(f.path))
    .map((f) => humanize(f.path.split("/").pop() || f.path));
}

function extractPrismaModels(diff) {
  const models = [];
  const re = /^\+model (\w+)/gm;
  let match;
  while ((match = re.exec(diff))) {
    models.push(match[1]);
  }
  return [...new Set(models)];
}

function extractPrismaFields(diff) {
  const fields = [];
  const re = /^\+ {2}(\w+)\s+\w+/gm;
  let match;
  while ((match = re.exec(diff))) {
    if (!["model", "enum"].some((x) => match[1].startsWith(x))) {
      fields.push(match[1]);
    }
  }
  return [...new Set(fields)].slice(0, 4);
}

function isGuidDocPath(filePath) {
  return /(?:^|\/)guid\.(txt|md)$/i.test(filePath.replace(/\\/g, "/"));
}

/** Lockfile, gitignore, and package.json must not steal the commit subject. */
function isChorePath(filePath) {
  const p = filePath.replace(/\\/g, "/");
  return (
    p === ".gitignore" ||
    p === "package-lock.json" ||
    p === "package.json"
  );
}

function lineWeightFromDiff(filePath, diff) {
  const p = filePath.replace(/\\/g, "/");
  const lines = diff.split("\n");
  let inFile = false;
  let weight = 0;

  for (const line of lines) {
    if (line.startsWith("diff --git")) {
      inFile = line.includes(` a/${p} `) || line.includes(` b/${p} `);
      continue;
    }
    if (line.startsWith("+++ b/")) {
      inFile = line.slice(6) === p;
      continue;
    }
    if (!inFile) continue;

    if (line.startsWith("+") && !line.startsWith("+++")) {
      if (line.slice(1).trim()) weight += 1;
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      if (line.slice(1).trim()) weight += 1;
    }
  }

  return weight;
}

function isWhitespaceOnlyChange(filePath, diff) {
  return lineWeightFromDiff(filePath, diff) === 0;
}

/** Files that should drive the commit subject (real work, not tooling noise). */
function filesForSubject(files, diff) {
  return files.filter((file) => {
    if (isChorePath(file.path)) return false;
    if (isGuidDocPath(file.path)) return true;
    if (isWhitespaceOnlyChange(file.path, diff)) return false;
    return true;
  });
}

function dominantArea(files, config, diff) {
  const counts = new Map();
  for (const file of files) {
    const weight = diff ? Math.max(lineWeightFromDiff(file.path, diff), 1) : 1;
    const area = areaFromPath(file.path, config);
    counts.set(area, (counts.get(area) ?? 0) + weight);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([area]) => area);
}

function fileActionSummary(files) {
  const added = files.filter((f) => isNewFile(f.status)).length;
  const removed = files.filter((f) => isDeletedFile(f.status)).length;
  const changed = files.length - added - removed;
  return { added, removed, changed };
}

const SELF_PACKAGE_PATH = /packages\/smart-git-push\/|scripts\/push-main\.js/;

function filterDiffForAnalysis(diff) {
  const lines = diff.split("\n");
  const out = [];
  let skip = false;
  for (const line of lines) {
    if (line.startsWith("+++ b/") || line.startsWith("--- a/")) {
      skip = SELF_PACKAGE_PATH.test(line);
    }
    if (!skip) out.push(line);
  }
  return out.join("\n");
}

/** Story keywords must match added lines only — not deleted file content. */
function addedLinesOnly(diff) {
  return diff
    .split("\n")
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .join("\n");
}

function buildSubject(files, diff, config) {
  const analyzedDiff = filterDiffForAnalysis(diff);
  const addedDiff = addedLinesOnly(analyzedDiff);
  const subjectFiles = filesForSubject(files, analyzedDiff);
  const storyFiles = subjectFiles.length > 0 ? subjectFiles : files;
  const areas = dominantArea(storyFiles, config, analyzedDiff);
  const primaryArea = areas[0] || "project";
  const projectKind = detectProjectKind(storyFiles);
  const routes = extractNewRoutes(analyzedDiff, projectKind);
  const exports = extractNewExports(analyzedDiff);
  const tsTypes = extractNewTypeScriptTypes(analyzedDiff);
  const newControllers = extractNewNestControllers(storyFiles);
  const prismaModels = extractPrismaModels(analyzedDiff);
  const prismaFields = extractPrismaFields(analyzedDiff);
  const { added, removed, changed } = fileActionSummary(storyFiles);

  const onlyDocs = storyFiles.every((f) => isGuidDocPath(f.path));
  const onlyPrisma = files.every((f) => f.path.endsWith(".prisma"));
  const onlyPackageJson =
    files.length === 1 && files[0].path === "package.json";
  const onlyScripts = files.every((f) => f.path.startsWith("scripts/"));
  const newPackageJsons = files.filter(
    (f) =>
      isNewFile(f.status) &&
      /packages\/[^/]+\/package\.json$/i.test(f.path.replace(/\\/g, "/")),
  );
  const onlyTsConfig = files.every((f) =>
    /tsconfig(\..+)?\.json$/i.test(f.path),
  );
  const onlyTypeScript = files.every(
    (f) => isTypeScriptPath(f.path) || /\.d\.ts$/i.test(f.path),
  );
  const allInSmartGitPush = files.every((f) =>
    f.path.replace(/\\/g, "/").startsWith("packages/smart-git-push/"),
  );
  const removedLocalSmartGitPush = files.some(
    (f) =>
      isDeletedFile(f.status) &&
      f.path.replace(/\\/g, "/").startsWith("packages/smart-git-push/"),
  );

  if (
    removedLocalSmartGitPush &&
    /["']smart-git-push["']:\s*"\^/.test(addedDiff)
  ) {
    return "Use npm smart-git-push instead of local packages copy";
  }

  if (removedLocalSmartGitPush && !files.some((f) => isNewFile(f.status))) {
    return "Remove local packages/smart-git-push (use npm package)";
  }

  if (allInSmartGitPush) {
    const touched = new Set(
      files.map((f) => f.path.split("/").pop()?.toLowerCase() ?? ""),
    );
    if (touched.has("message.js")) {
      return "Improve smart-git-push commit message detection";
    }
    if (touched.has("push.js")) {
      return "Improve smart-git-push push workflow";
    }
    return `Update smart-git-push package (${files.length} files)`;
  }

  if (
    subjectFiles.length === 0 &&
    files.some((f) => f.path === "package.json") &&
    /["']smart-git-push["']:/.test(addedDiff) &&
    /-(.*["']smart-git-push["']:)/.test(analyzedDiff)
  ) {
    if (/github:/i.test(addedDiff)) {
      return "Use smart-git-push from GitHub (commit message fixes)";
    }
    const ver = addedDiff.match(/["']smart-git-push["']:\s*"\^([\d.]+)"/)?.[1];
    if (ver) {
      return `Bump smart-git-push to ${ver}`;
    }
    return "Update smart-git-push dependency";
  }

  if (
    /callFedExRateQuote|callFedExResolveAddress|isFedExEndpointUnavailable/.test(
      addedDiff,
    )
  ) {
    return "Fix FedEx validation: fall back to rate and address APIs when ship validate returns 404";
  }

  if (/validate-fedex-shipping|validateShippingWithFedex/.test(addedDiff)) {
    if (routes.length) {
      return `Add ${routes[0]} for FedEx pickup address and ship-date checks`;
    }
    return "Add FedEx pickup validation before partner-to-admin shipping";
  }

  if (/send-order-to-fedex|sendOrderToFedex/i.test(addedDiff)) {
    return "Wire FedEx label flow into partner-to-admin send-order";
  }

  if (/pickup_label|generatePickupLabel|callFedExShip/.test(addedDiff)) {
    return "Create FedEx pickup labels for partner-to-admin shipments";
  }

  if (routes.length === 1) {
    return `Add ${routes[0]} in ${primaryArea} (${stackLabel(projectKind)})`;
  }

  if (routes.length > 1) {
    return `Add ${routes.length} routes in ${primaryArea} (${routes[0]}, …)`;
  }

  if (newControllers.length === 1) {
    return `Add Nest controller ${newControllers[0]}`;
  }

  if (newControllers.length > 1) {
    return `Add ${newControllers.length} Nest controllers (${newControllers[0]}, …)`;
  }

  if (tsTypes.length === 1) {
    return `Add TypeScript type ${tsTypes[0]} in ${primaryArea}`;
  }

  if (tsTypes.length > 1 && tsTypes.length <= 4) {
    return `Add types ${tsTypes.join(", ")} in ${primaryArea}`;
  }

  if (onlyTsConfig) {
    return "Update TypeScript config";
  }

  if (exports.length === 1) {
    return `Add ${exports[0]} to ${primaryArea}`;
  }

  if (exports.length > 1 && exports.length <= 3) {
    return `Add ${exports.join(", ")} to ${primaryArea}`;
  }

  if (onlyDocs) {
    if (storyFiles.length === 1) {
      const file = humanize(storyFiles[0].path.split("/").pop());
      return `Change ${file} in API docs`;
    }
    if (routes.length) {
      return `Document ${routes[0]} in API docs guide`;
    }
    return "Change API docs";
  }

  if (prismaModels.length) {
    return `Add Prisma models ${prismaModels.join(", ")}`;
  }

  if (onlyPrisma && prismaFields.length) {
    return `Add ${prismaFields.join(", ")} fields to ${primaryArea} schema`;
  }

  if (newPackageJsons.length === 1) {
    const pkgName =
      newPackageJsons[0].path.match(/packages\/([^/]+)\/package\.json/i)?.[1] ??
      "workspace";
    return `Add ${pkgName} npm package`;
  }

  if (newPackageJsons.length > 1) {
    const names = newPackageJsons.map(
      (f) =>
        f.path.match(/packages\/([^/]+)\/package\.json/i)?.[1] ?? "package",
    );
    return `Add npm packages ${names.join(", ")}`;
  }

  if (onlyPackageJson) {
    if (/\"push\"|smart-git-push|push-main/.test(addedDiff)) {
      return "Wire smart-git-push into npm scripts";
    }
    return "Update npm scripts in package.json";
  }

  if (
    onlyScripts &&
    /buildSubject|generateCommitMessage|commit message/i.test(addedDiff)
  ) {
    return "Improve auto commit messages in push script";
  }

  if (onlyScripts) {
    return `Change ${humanize(files[0].path.split("/").pop())} script`;
  }

  if (removed > 0 && added === 0 && changed === 0) {
    return `Remove ${primaryArea} files (${removed} deleted)`;
  }

  if (added > 0 && changed === 0 && removed === 0) {
    return `Add ${primaryArea} (${added} new file${added > 1 ? "s" : ""})`;
  }

  if (
    /fix|bug|error|reject|fail|invalid/i.test(addedDiff) &&
    !/test/i.test(addedDiff)
  ) {
    if (areas.length === 1) {
      return `Fix ${primaryArea} error handling`;
    }
    return `Fix ${primaryArea} and ${areas[1]}`;
  }

  if (/refactor|rename|extract|move/i.test(addedDiff)) {
    return `Refactor ${primaryArea}`;
  }

  if (changed > 0 && primaryArea === "FedEx") {
    return "Adjust FedEx shipping integration";
  }

  if (areas.length === 1) {
    if (changed === 1 && added === 0 && storyFiles.length === 1) {
      const file = humanize(storyFiles[0].path.split("/").pop());
      return `Change ${file} in ${primaryArea}`;
    }
    const tsNote =
      onlyTypeScript && projectKind !== "node" ? ` (${stackLabel(projectKind)})` : "";
    return `Change ${primaryArea} (${storyFiles.length} file${storyFiles.length > 1 ? "s" : ""})${tsNote}`;
  }

  if (areas.length === 2) {
    return `Change ${areas[0]} and ${areas[1]}`;
  }

  return `Change ${areas[0]}, ${areas[1]}, and ${areas.length - 2} more areas`;
}

function parseNumstat(numstat) {
  const stats = new Map();

  for (const line of numstat.split("\n")) {
    if (!line.trim()) continue;

    const match = line.match(/^(\S+)\s+(\S+)\s+(.+)$/);
    if (!match) continue;

    stats.set(match[3].trim(), {
      added: match[1] === "-" ? 0 : Number(match[1]),
      removed: match[2] === "-" ? 0 : Number(match[2]),
    });
  }

  return stats;
}

function formatFileLine(file, stats) {
  const lineStats = stats.get(file.path);

  if (!lineStats) {
    return `- ${file.path}`;
  }

  const { added, removed } = lineStats;

  if (isNewFile(file.status)) {
    return `- ${file.path} (+${added})`;
  }

  if (isDeletedFile(file.status)) {
    return `- ${file.path} (-${removed})`;
  }

  return `- ${file.path} (+${added} -${removed})`;
}

function generateCommitMessage(porcelain, numstat, diff, config = {}, stagedNameStatus) {
  const junkFiles = config.junkFiles ?? [
    "nul",
    "thumbs.db",
    ".ds_store",
    "desktop.ini",
    "tsconfig.tsbuildinfo",
  ];
  const rawFiles = stagedNameStatus?.trim()
    ? parseStagedNameStatus(stagedNameStatus)
    : parseChangedFiles(porcelain);
  const files = rawFiles.filter((file) => !isJunkFile(file.path, junkFiles));
  if (files.length === 0) {
    return { subject: "Chore: clean up junk files", body: "" };
  }

  const stats = parseNumstat(numstat);
  const subject = buildSubject(files, diff, config);
  const body = files.map((file) => formatFileLine(file, stats)).join("\n");

  return { subject, body, files, projectKind: detectProjectKind(files) };
}

module.exports = {
  parseChangedFiles,
  parseStagedNameStatus,
  isJunkFile,
  isTypeScriptPath,
  generateCommitMessage,
  detectProjectKind,
  stackLabel,
  areaFromPath,
  extractNewRoutes,
  extractNewExports,
  extractNewTypeScriptTypes,
};
