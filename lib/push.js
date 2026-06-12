const { run, gitOutput } = require("./git");
const { loadConfig } = require("./config");
const { generateCommitMessage } = require("./message");

function parseManualMessage(argv, npmLifecycleEvent, npmConfigArgv) {
  let manualMessage = argv.join(" ").trim();

  if (!manualMessage && npmLifecycleEvent === "push" && npmConfigArgv) {
    try {
      const parsed = JSON.parse(npmConfigArgv);
      const original = Array.isArray(parsed?.original) ? parsed.original : [];
      manualMessage = original
        .filter((arg) => arg !== "run" && arg !== "push")
        .join(" ")
        .trim();
    } catch {
      // auto message from changed files
    }
  }

  return manualMessage;
}

/**
 * Stage, commit (auto or manual message), and push.
 * @param {object} [options]
 * @param {string} [options.cwd] - project root
 * @param {string} [options.message] - manual commit subject (skips auto)
 * @param {string} [options.branch] - override config branch
 * @param {string} [options.remote] - override config remote
 * @param {boolean} [options.dryRun] - print only, no git writes
 * @param {boolean} [options.skipPush] - commit only
 */
function smartGitPush(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const config = { ...loadConfig(cwd), ...options.config };
  const branch = options.branch ?? config.branch;
  const remote = options.remote ?? config.remote;

  const currentBranch = gitOutput(["rev-parse", "--abbrev-ref", "HEAD"], cwd).trim();
  if (currentBranch !== branch) {
    const err = new Error(
      `Current branch is "${currentBranch}". Switch to "${branch}" before pushing.`,
    );
    err.code = "WRONG_BRANCH";
    throw err;
  }

  const porcelain = gitOutput(["status", "--porcelain"], cwd);
  if (!porcelain.trim()) {
    const err = new Error("No changes to commit.");
    err.code = "NOTHING_TO_COMMIT";
    throw err;
  }

  const manualMessage =
    options.message ??
    parseManualMessage(
      options.argv ?? [],
      options.npmLifecycleEvent ?? process.env.npm_lifecycle_event,
      options.npmConfigArgv ?? process.env.npm_config_argv,
    );

  if (options.dryRun) {
    run("git", ["add", "."], { cwd, stdio: "inherit" });
    const numstat = gitOutput(["diff", "--cached", "--numstat"], cwd);
    const diff = gitOutput(["diff", "--cached", "--no-color", "-U0"], cwd);
    const nameStatus = gitOutput(["diff", "--cached", "--name-status"], cwd);
    const { subject, body, projectKind } = generateCommitMessage(
      porcelain,
      numstat,
      diff,
      config,
      nameStatus,
    );
    console.log(`[dry-run] project: ${projectKind}`);
    console.log(`[dry-run] commit: ${subject}`);
    if (body) console.log(`\nDesc:\n${body}`);
    console.log(`[dry-run] would push: ${remote}/${branch}`);
    run("git", ["reset"], { cwd, stdio: "inherit" });
    return { subject, body, dryRun: true };
  }

  run("git", ["add", "."], { cwd });

  let subject;
  let body = "";

  if (manualMessage) {
    subject = manualMessage;
    run("git", ["commit", "-m", subject], { cwd });
  } else {
    const numstat = gitOutput(["diff", "--cached", "--numstat"], cwd);
    const diff = gitOutput(["diff", "--cached", "--no-color", "-U0"], cwd);
    const nameStatus = gitOutput(["diff", "--cached", "--name-status"], cwd);
    const generated = generateCommitMessage(
      porcelain,
      numstat,
      diff,
      config,
      nameStatus,
    );
    subject = generated.subject;
    body = generated.body;
    console.log(`Commit message: ${subject}`);
    if (body) console.log(`\nDesc:\n${body}`);
    run("git", ["commit", "-m", subject, "-m", body], { cwd });
  }

  if (!options.skipPush) {
    run("git", ["push", remote, branch], { cwd });
  }

  return { subject, body, pushed: !options.skipPush };
}

module.exports = { smartGitPush, parseManualMessage };
