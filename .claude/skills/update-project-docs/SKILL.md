---
name: update-project-docs
description: "Read the project codebase and update CLAUDE.md and README.md together. Use when asked to refresh, audit, or synchronize project documentation, architecture notes, setup instructions, or feature descriptions."
---

# Update project documentation

Refresh the project guidance and user-facing overview from repository evidence. Always update both the root `CLAUDE.md` and `README.md` in the same task.

## Workflow

1. Inspect the current `CLAUDE.md`, `README.md`, repository status, package scripts and dependencies, and the source files relevant to the requested or changed behavior. Follow imports and state flow as needed; do not infer functionality from filenames or UI labels alone.
2. Use the implementation, tests, configuration, and package scripts as the source of truth. Distinguish implemented behavior from placeholders, disabled controls, and TODOs. Preserve valid project-specific guidance and useful existing documentation; remove stale boilerplate and unsupported claims.
3. Identify uncertainties that cannot be resolved from repository evidence and that materially affect the documentation (for example, intended product behavior or undocumented operational requirements). Ask the user focused questions before documenting those assumptions. If the evidence is sufficient, proceed without unnecessary questions.
4. Update both documents:
   - `CLAUDE.md`: concise, durable instructions for coding agents, including project conventions and links or references to the README where useful.
   - `README.md`: an accurate project overview, prerequisites, setup and available commands, current user-facing functionality, and useful architecture notes.
   Keep both documents consistent, concise, and specific to this repository. Do not copy generic framework boilerplate.
5. Review the diff and verify every documented command against `package.json` and every feature or architecture claim against the relevant source. Do not change unrelated files.

## Interaction

- Ask only about important unknowns that cannot be established by reading the repository.
- If an answer is needed, use the available question tool and wait for the user's response before making claims that depend on it.
- If no question tool is available, clearly state the specific uncertainty and ask the user before proceeding with that part.
