# GitHub Copilot Instructions for MT-PRISM

These notes help GitHub Copilot (and other GPT-based assistants) work effectively inside this repository. Keep them visible while generating code.

## Project Snapshot
- **Goal**: Local-first AI plugin that turns PRDs and Figma designs into TDD artifacts via orchestrated skills.
- **Runtime**: Node.js ≥20, TypeScript strict mode, ES2022 modules (`type: module`).
- **Build/Test**: `npm run build` (tsc), `npm run dev` (tsx), `npm run test`/`test:coverage`, `npm run lint`, `npm run format`.
- **Outputs**: Persist everything under `.prism/sessions/<id>/…`; never rely on external services besides MCP + LLM APIs.

## Core Architecture Rules
- Maintain the **local-first** contract: no new servers, DBs, or remote storage. Use the helpers in `src/utils/files.ts` for disk IO.
- All AI calls go through the abstraction in `src/providers/index.ts` / `createLLMProvider`. Do **not** import provider SDKs directly in skills or workflows.
- Prompts live in `prompts/*.md` and are loaded via `preparePrompt` in `src/utils/prompts.ts`. Reuse this loader when you need LLM instructions.
- Persist structured outputs with `writeYAMLWithSchema` or matching helpers and validate with Zod schemas from `src/schemas/*` before writing.
- Consistently surface progress logs (emoji + short text) like existing skills so CLI/agents can stream meaningful feedback.

## Code Organization Reference
- `src/cli.ts`: entry point for the CLI wrapper (`prism` binary). Extends commands via commander-like helpers; keep UX consistent.
- `src/index.ts`: public API barrel for skills, workflows, and shared types.
- `src/skills/`: individual capability modules (`prd-analyzer`, `figma-analyzer`, `requirements-validator`, `clarification-manager`, `tdd-generator`). Use small, composable helpers placed in subfolders when logic grows.
- `src/workflows/`: orchestrated experiences (e.g., full discovery). They coordinate skills, enforce ordering, and handle retries.
- `src/providers/`: LLM provider implementations + factory. Add new providers here and expose via `createLLMProvider`.
- `src/utils/`: cross-cutting utilities (errors, prompts, file IO, MCP clients, session management).
- `src/types/` & `src/schemas/`: canonical data contracts; keep types and schemas in sync.

## Coding Standards
- Strict TypeScript: honor compiler flags (`noImplicitReturns`, `noUncheckedIndexedAccess`, etc.). Prefer explicit return types and defensive guards.
- Use async/await, avoid unhandled promise chains. Wrap failures in `WorkflowError` or domain-specific errors so UX stays consistent.
- Keep dependencies stable; obtain maintainer approval before adding new packages. Prefer utilities inside `src/utils` first.
- When touching prompts or schemas, update related docs (`prompts/`, `templates/`, `docs/specs/`) so downstream workflows stay accurate.
- Stick to ASCII unless editing files that already contain curated Unicode (emoji logs are acceptable).

## Testing & Validation
- Write/adjust unit tests in `tests/unit` for pure logic and `tests/integration` for multi-module flows. Use Vitest.
- Mock LLM/MCP interactions via existing fixtures; do not hit real APIs in unit tests.
- Run `npm run lint` and `npm run test` before proposing changes. For schema-affecting updates, capture representative fixtures in `tests/fixtures`.

## Common Pitfalls to Avoid
- Skipping schema validation or writing raw JSON/YAML files manually.
- Duplicating provider logic inside skills instead of extending the provider layer.
- Introducing side effects outside `.prism/` or mixing session data between runs.
- Forgetting to update CLI help/options when adding new workflow parameters.
- Emitting vague error messages; always include actionable remediation guidance.

## When Adding a New Skill or Workflow
1. Define the data contract in `src/types` + `src/schemas`; create/update prompt templates.
2. Implement the skill in `src/skills`, using existing utilities for LLM calls, validation, I/O, and logging.
3. Add CLI entry points and/or expose functions via `src/index.ts` if needed.
4. Cover logic with tests, especially around fallback handling and schema validation.
5. Document the feature in `docs/specs` or `docs/` and, if relevant, update `README.md`/`AI_AGENT.md`.

Following these guardrails keeps MT-PRISM consistent, testable, and ready for multi-agent automation.
