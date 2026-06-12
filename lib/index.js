const { smartGitPush } = require("./push");
const {
  generateCommitMessage,
  detectProjectKind,
  stackLabel,
} = require("./message");
const { loadConfig } = require("./config");

module.exports = {
  smartGitPush,
  generateCommitMessage,
  detectProjectKind,
  stackLabel,
  loadConfig,
};
