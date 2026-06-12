export interface SmartGitPushConfig {
  branch?: string;
  remote?: string;
  junkFiles?: string[];
  areaRules?: Array<{ match: string | RegExp; area: string }>;
}

export interface CommitMessageResult {
  subject: string;
  body: string;
  files?: Array<{ status: string; path: string }>;
  projectKind?: string;
}

export interface SmartGitPushOptions {
  cwd?: string;
  message?: string;
  branch?: string;
  remote?: string;
  dryRun?: boolean;
  skipPush?: boolean;
  argv?: string[];
  npmLifecycleEvent?: string;
  npmConfigArgv?: string;
  config?: SmartGitPushConfig;
}

export interface SmartGitPushResult {
  subject: string;
  body: string;
  dryRun?: boolean;
  pushed?: boolean;
}

export function smartGitPush(options?: SmartGitPushOptions): SmartGitPushResult;

export function generateCommitMessage(
  porcelain: string,
  numstat: string,
  diff: string,
  config?: SmartGitPushConfig,
): CommitMessageResult;

export function detectProjectKind(
  files: Array<{ path: string; status?: string }>,
): string;

export function loadConfig(cwd?: string): SmartGitPushConfig;
