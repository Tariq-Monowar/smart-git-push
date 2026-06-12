# smart-git-push

Auto commit message + `git push` for **JavaScript and TypeScript** projects:

- Express / Fastify APIs (`.ts` controllers & routes)
- NestJS (`.controller.ts`, `.service.ts`, `.module.ts`, decorators)
- React (Vite, Next — `.tsx` components & pages)
- React Native / Expo
- Plain Node / TypeScript scripts

Reads your diff, builds a useful commit subject + file list body, then pushes.

## Install

### In this monorepo (local)

```json
{
  "devDependencies": {
    "smart-git-push": "file:./packages/smart-git-push"
  },
  "scripts": {
    "push": "smart-git-push"
  }
}
```

```bash
npm install
npm run push
```

### Any other project (npm link / publish)

```bash
npm install smart-git-push --save-dev
# or from git:
npm install github:YOUR_USER/YOUR_REPO#path:packages/smart-git-push
```

```json
{
  "scripts": {
    "push": "smart-git-push"
  }
}
```

## Usage

```bash
npm run push
npm run push -- "fix login bug"
npx smart-git-push
npx smart-git-push --dry-run
npx smart-git-push --no-push
npx smart-git-push -m "release v2.1"
```

Alias: `sgp`

## Config (optional)

`.smart-git-push.json` in project root:

```json
{
  "branch": "main",
  "remote": "origin",
  "junkFiles": ["nul", "thumbs.db"],
  "areaRules": [
    { "match": "/module/v3/", "area": "v3 API" },
    { "match": "\\.controller\\.ts$", "area": "Nest controllers" }
  ]
}
```

Or in `package.json`:

```json
{
  "smartGitPush": {
    "branch": "develop"
  }
}
```

## TypeScript support

Works out of the box — no build step required. The CLI only reads **git diff**, not compiled output.

| Detects | Examples |
|---------|----------|
| **Routes** | `router.get("/api")`, `app.post()`, `@Get()`, `@Post('users')` |
| **Exports** | `export async function`, `export const`, `export class` |
| **Types** | `export type`, `export interface`, `export enum` |
| **Paths** | `*.controller.ts`, `*.routes.ts`, `*.service.ts`, `*.dto.ts`, `tsconfig.json` |
| **Ignores** | `tsconfig.tsbuildinfo` (junk file) |

### TypeScript project setup

```json
{
  "scripts": { "push": "smart-git-push" },
  "smartGitPush": {
    "branch": "main",
    "areaRules": [
      { "match": "module/v3/", "area": "v3 API" },
      { "match": "\\.controller\\.ts$", "area": "controllers" }
    ]
  }
}
```

## Per stack

| Stack | What it detects |
|-------|-----------------|
| **Express + TS** | `*.routes.ts`, `*.controllers.ts`, `Request, Response` |
| **NestJS** | `@Get()`, `@Post()`, new `*.controller.ts` files |
| **React + TS** | `components/`, `pages/`, `.tsx`, `vite.config.ts` |
| **React Native** | `screens/`, `expo`, `.native.tsx` |
| **TypeScript** | `tsconfig.json`, types, interfaces, enums |

## Programmatic API

```js
const { smartGitPush, generateCommitMessage } = require("smart-git-push");

smartGitPush({ message: "optional manual subject" });

smartGitPush({ dryRun: true });
```

## Publish to npm

From the [smart-git-push](https://github.com/Tariq-Monowar/smart-git-push) repo root:

```bash
npm login
npm publish --access public
```

Then in any project:

```bash
npm i -D smart-git-push
```

### Install from npm (after publish)

```bash
npm i -D smart-git-push
```

```json
{
  "scripts": { "push": "smart-git-push" }
}
```
