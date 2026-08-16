// Thin Parallel FindAll client for case discovery.
// Requires PARALLEL_API_KEY in the environment.
//
//   bun findall.ts create <schema.json>     -> {"findall_id": "..."} (schema:
//       {objective, entity_type, match_conditions, generator, match_limit})
//   bun findall.ts status <findall_id>      -> run status JSON
//   bun findall.ts result <findall_id>      -> full candidate snapshot JSON
//   bun findall.ts exa-search <query.json>  -> Exa /search results (fallback
//       path; query.json is the raw Exa search body, needs EXA_API_KEY)
//   bun findall.ts exa-contents <body.json> -> Exa /contents results (full
//       article text; body.json e.g. {"urls":["..."],"text":true})

import { file } from "bun";

const PARALLEL = "https://api.parallel.ai/v1beta/findall";

async function call(
  url: string,
  key: string,
  keyHeader: string,
  body?: unknown
) {
  const res = await fetch(url, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { [keyHeader]: key, "Content-Type": "application/json" },
    method: body === undefined ? "GET" : "POST",
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`${res.status} ${res.statusText}: ${text.slice(0, 2000)}`);
    process.exit(1);
  }
  console.log(text);
}

const [cmd, arg] = process.argv.slice(2);
const parallelKey = process.env.PARALLEL_API_KEY ?? "";
const exaKey = process.env.EXA_API_KEY ?? "";

switch (cmd) {
  case "create": {
    if (!parallelKey) {
      console.error("PARALLEL_API_KEY not set");
      process.exit(1);
    }
    const schema = await file(arg).json();
    await call(`${PARALLEL}/runs`, parallelKey, "x-api-key", schema);
    break;
  }
  case "status": {
    if (!parallelKey) {
      console.error("PARALLEL_API_KEY not set");
      process.exit(1);
    }
    await call(`${PARALLEL}/runs/${arg}`, parallelKey, "x-api-key");
    break;
  }
  case "result": {
    if (!parallelKey) {
      console.error("PARALLEL_API_KEY not set");
      process.exit(1);
    }
    await call(`${PARALLEL}/runs/${arg}/result`, parallelKey, "x-api-key");
    break;
  }
  case "exa-search": {
    if (!exaKey) {
      console.error("EXA_API_KEY not set");
      process.exit(1);
    }
    const body = await file(arg).json();
    await call("https://api.exa.ai/search", exaKey, "x-api-key", body);
    break;
  }
  case "exa-contents": {
    if (!exaKey) {
      console.error("EXA_API_KEY not set");
      process.exit(1);
    }
    const body = await file(arg).json();
    await call("https://api.exa.ai/contents", exaKey, "x-api-key", body);
    break;
  }
  default: {
    console.error(
      "usage: bun findall.ts create|status|result|exa-search|exa-contents <arg>"
    );
    process.exit(1);
  }
}
