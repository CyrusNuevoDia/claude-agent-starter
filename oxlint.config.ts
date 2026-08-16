import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";

export default defineConfig({
  extends: [core, antiSlop],
  ignorePatterns: [
    ...core.ignorePatterns,
    // Vendored third-party code (e.g. skill-bundled @std/csv) keeps its
    // upstream style.
    "**/vendor",
  ],
  rules: {
    // Everything this repo touches is an untrusted external JSON payload — a
    // news article, a portal page, an Anthropic/Exa/Parallel/Browser Use
    // response, or a tool input the model composed. `Record<string, unknown>`
    // plus a `typeof` check at that boundary IS the parse, and the payload
    // shapes belong to the vendors, so these five rules can only be satisfied
    // by re-declaring somebody else's API surface. The anti-slop rules that
    // stay on — type assertions needing a SAFETY invariant, chained
    // assertions, module mocking — all have fixes that don't.
    "anti-slop/no-conditional-empty-object-spread": "off",
    "anti-slop/no-known-value-widening": "off",
    "anti-slop/no-runtime-typeof": "off",
    "anti-slop/no-unknown-parameters": "off",
    "anti-slop/no-unsafe-dictionary-type": "off",

    // The repo declares functions with `function` and relies on hoisting to
    // order modules top-down (entry point first, helpers below). func-style
    // exists to enforce the opposite arrangement; no-use-before-define stays
    // on for everything except that hoisting.
    "eslint/func-style": "off",

    // Trailing comments annotate individual manifest/schema fields, which is
    // where the explanation has to live to stay attached to its field.
    "eslint/no-inline-comments": "off",

    "eslint/no-use-before-define": ["error", { functions: false }],

    // Prefer `type` over `interface` (ultracite defaults to interface).
    "typescript/consistent-type-definitions": ["error", "type"],

    // Named imports from node: builtins are the repo-wide convention.
    "unicorn/import-style": "off",
  },
});
