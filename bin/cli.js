#!/usr/bin/env node

const { smartGitPush } = require("../lib/push");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const skipPush = args.includes("--no-push");
const messageIdx = args.indexOf("-m");
const message =
  messageIdx >= 0 ? args.slice(messageIdx + 1).join(" ").trim() : "";
const filteredArgv = args.filter(
  (a, i) =>
    a !== "--dry-run" &&
    a !== "--no-push" &&
    a !== "-m" &&
    (messageIdx < 0 || i < messageIdx || i > messageIdx),
);

try {
  smartGitPush({
    argv: filteredArgv,
    message: message || filteredArgv.join(" ").trim() || undefined,
    dryRun,
    skipPush,
  });
} catch (error) {
  console.error(error.message || error);
  process.exit(error.exitCode ?? error.code === "WRONG_BRANCH" ? 1 : 1);
}
