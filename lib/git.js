const { spawnSync } = require("node:child_process");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: options.stdio ?? "inherit",
    cwd: options.cwd,
    encoding: options.encoding,
  });
  if (result.status !== 0 && !options.allowFail) {
    const err = new Error(`Failed: ${command} ${args.join(" ")}`);
    err.exitCode = result.status ?? 1;
    throw err;
  }
  return result;
}

function gitOutput(args, cwd) {
  const result = run("git", args, { stdio: "pipe", encoding: "utf8", cwd });
  return result.stdout;
}

module.exports = { run, gitOutput };
