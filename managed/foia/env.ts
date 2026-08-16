import { createEnv } from "@t3-oss/env-core";

/**
 * The FOIA agent's environment requirements — everything its custom tools'
 * spawned skill scripts need, validated once when tools.ts loads so a missing
 * key fails at startup, not mid-batch. Importing `@/lib/env.ts` first is what
 * loads the repo-root `.env` before validation.
 *
 * This module is also the declaration of what the deployed agent's
 * environment must provide (the skill scripts themselves re-check inline,
 * since they ship as standalone bundles).
 */
import { required } from "@/lib/env.ts";

export const env = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
  server: {
    /** Browser Use cloud key — submit-request portal runs. */
    BROWSER_USE_API_KEY: required,
    /** Exa key — article/portal fetches and search. */
    EXA_API_KEY: required,
    /** FOIA tracking spreadsheet id (worksheet skill). */
    FOIA_SHEET_ID: required,
    /** Path to the Google service-account key file (worksheet skill). */
    GOOGLE_SA_KEY_FILE: required,
    /** Parallel FindAll key — find-cases primary discovery path. */
    PARALLEL_API_KEY: required,
    /** Standing portal identity used to register/sign in on portals. */
    PORTAL_LOGIN_EMAIL: required,
    PORTAL_LOGIN_PASSWORD: required,
  },
});
