import { defineState } from "eve/context";
import { defineDynamic, defineTool } from "eve/tools";
import { allowed } from "@/lib/access.ts";
import { loadManagedAgent, runTask } from "@/lib/claude-managed-agent.ts";
import { acl } from "@/managed/foia/acl.ts";
import { tools } from "@/managed/foia/tools.ts";

const sessionIdState = defineState<string | undefined>(
  "foia-session",
  () => undefined
);

export default defineDynamic({
  events: {
    "session.started": (_event, ctx) =>
      allowed(ctx, acl)
        ? defineTool({
            description:
              "FOIA case sourcer for Origin Media: given states and an incident " +
              "date window, discovers bodycam-worthy arrest cases in news " +
              "coverage, grades each against the case rubric with verbatim " +
              "evidence, resolves the department's records-request portal, and " +
              "returns scored rows for human approval. It never submits " +
              "requests or pays invoices. Provide a complete, self-contained " +
              "task; the specialist runs remotely and returns its final answer.",
            async execute(input) {
              // skipToolImport: tools come from the static import above;
              // dynamic import() inside eve's bundled runtime is not reliable.
              const { manifest, rubric } = await loadManagedAgent("foia", {
                skipToolImport: true,
              });
              const previous =
                manifest.session_policy === "reuse"
                  ? sessionIdState.get()
                  : undefined;
              const result = await runTask({
                manifest,
                rubric,
                sessionId: previous,
                task: String(input.task),
                tools,
              });
              if (manifest.session_policy === "reuse") {
                sessionIdState.update(() => result.sessionId);
              }
              return result.text;
            },
            inputSchema: {
              properties: {
                task: {
                  description:
                    "The full task for the specialist, e.g. a batch spec: " +
                    "states + incident date window, plus any candidate URLs.",
                  type: "string",
                },
              },
              required: ["task"],
              type: "object",
            },
          })
        : null,
  },
});
