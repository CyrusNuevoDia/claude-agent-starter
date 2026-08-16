// Thin Browser Use Cloud v4 client for portal submission tasks.
// Requires BROWSER_USE_API_KEY in the environment.
//
//   bun browser-task.ts run <body.json>   -> create a run; body is the raw
//       RunCreateRequest, e.g. {"task": "...", "model": "gpt-5.6-luna",
//       "maxCostUsd": 1}. Returns the run object with its id.
//   bun browser-task.ts get <run_id>      -> full run object (status, result)
//   bun browser-task.ts status <run_id>   -> lightweight status only
//   bun browser-task.ts events <run_id>   -> step-by-step agent events
//   bun browser-task.ts cancel <run_id>   -> cancel a running task

import { file } from "bun";

const BASE = "https://api.browser-use.com/api/v4";

const key = process.env.BROWSER_USE_API_KEY ?? "";
if (!key) {
  console.error("BROWSER_USE_API_KEY not set");
  process.exit(1);
}

async function call(path: string, method: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "X-Browser-Use-API-Key": key,
    },
    method,
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`${res.status} ${res.statusText}: ${text.slice(0, 2000)}`);
    process.exit(1);
  }
  console.log(text);
}

// Standing portal identity: task text uses {{PORTAL_LOGIN_EMAIL}} /
// {{PORTAL_LOGIN_PASSWORD}} placeholders so the literal credentials never
// appear in skill files, transcripts, or run bodies at rest — they're
// substituted here from the environment at send time.
function injectPortalIdentity(task: string): string {
  return task.replaceAll(
    /\{\{(?<name>PORTAL_LOGIN_EMAIL|PORTAL_LOGIN_PASSWORD)\}\}/gu,
    (_, name) => {
      const value = process.env[name];
      if (!value) {
        console.error(`task references {{${name}}} but ${name} is not set`);
        process.exit(1);
      }
      return value;
    }
  );
}

const [cmd, arg] = process.argv.slice(2);

switch (cmd) {
  case "run": {
    const body = await file(arg).json();
    if (typeof body.task === "string") {
      body.task = injectPortalIdentity(body.task);
    }
    await call("/runs", "POST", body);
    break;
  }
  case "get": {
    await call(`/runs/${arg}`, "GET");
    break;
  }
  case "status": {
    await call(`/runs/${arg}/status`, "GET");
    break;
  }
  case "events": {
    await call(`/runs/${arg}/events`, "GET");
    break;
  }
  case "cancel": {
    await call(`/runs/${arg}/cancel`, "POST");
    break;
  }
  default: {
    console.error(
      "usage: bun browser-task.ts run|get|status|events|cancel <arg>"
    );
    process.exit(1);
  }
}
