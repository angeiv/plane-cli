# Plane Concepts for Agents

## Core Objects

- `workspace`: top-level Plane container. `plane-cli` uses `workspaceSlug` as the active workspace context.
- `project`: scoped under a workspace. Human-readable project keys are convenient, but API routes use project UUIDs.
- `work-item`: the current preferred Plane term for an issue-like unit of work.
- `state`: workflow status such as `Backlog`, `Todo`, `In Progress`, or `Done`.
- `member`: a user with project or workspace access, used for assignee resolution.
- `comment`: discussion attached to a work-item.

## Naming Notes

- Plane CE may still expose legacy `/issues/` aliases in some endpoints.
- `plane-cli` should still speak in terms of `work-item` externally.
- Numeric work-item refs are user-friendly identifiers that the CLI resolves inside the current project.

## Context Model

- Active auth determines the Plane base URL and PAT.
- Active workspace determines which project list is visible.
- Active project determines the default target for `work-item` commands.
- Explicit `--workspace` and `--project` flags override stored context when needed.
