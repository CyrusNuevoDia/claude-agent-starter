import { defineConfig } from "oxfmt";
import core from "ultracite/oxfmt";

export default defineConfig({
  ...core,
  ignorePatterns: [
    ...(core.ignorePatterns ?? []),
    // Vendored third-party code keeps its upstream formatting.
    "**/vendor",
    // Markdown is the product here — CLAUDE.md and every SKILL.md are
    // uploaded verbatim as agent instructions, and the formatter reflows
    // hand-wrapped prose, rewrites emphasis markers, and reformats embedded
    // code samples. Only JS/TS gets formatted.
    "**/*.md",
    "**/*.mdx",
  ],
});
