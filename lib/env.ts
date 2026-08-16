/**
 * The validated view of the environment for the repo's own machinery — only
 * what deploy/console/the agent runner themselves need. Each managed agent
 * declares its own requirements in `managed/<name>/env.ts`, imported by that
 * agent's `tools.ts` so its vars are validated when its tools load, not here.
 *
 * Importing this module loads the repo-root `.env` (so the CLIs work right
 * after `cp .env.example .env`) and then validates. All vars are required: a
 * missing or empty value fails loudly here rather than as an opaque 401
 * several API calls later.
 *
 * Scripts under `managed/<name>/.claude/skills/**` are uploaded to the Skills
 * API as standalone bundles and cannot import this module — they keep their
 * own inline checks.
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

import dotenvx from "@dotenvx/dotenvx";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * The source-tree location works when running from bun CLIs; when eve bundles
 * this module, import.meta.url points into the build output, so fall back to
 * walking up from cwd to the repo root (the dir holding managed/ + package.json).
 */
function findRepoRoot(): string {
  const fromSource = join(import.meta.dirname, "..");
  if (existsSync(join(fromSource, "managed"))) {
    return fromSource;
  }
  let dir = process.cwd();
  for (;;) {
    if (
      existsSync(join(dir, "managed")) &&
      existsSync(join(dir, "package.json"))
    ) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return fromSource;
    }
    dir = parent;
  }
}

export const repoRoot = findRepoRoot();

dotenvx.config({
  ignore: ["MISSING_ENV_FILE"],
  path: join(repoRoot, ".env"),
  quiet: true,
});

/** Shared "required, non-empty string" schema for per-agent env modules. */
export const required = z.string().min(1);

export const env = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
  server: {
    /** Claude API key — https://platform.claude.com/settings/keys */
    ANTHROPIC_API_KEY: required,
  },
});
