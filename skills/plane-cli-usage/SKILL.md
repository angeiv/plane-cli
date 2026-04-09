---
name: plane-cli-usage
description: "Use when an agent needs to operate plane-cli against a self-hosted Plane CE instance, understand Plane concepts, or troubleshoot the validated CE API quirks."
---

# Plane CLI Usage

Use this skill when you need to:

- log into a self-hosted Plane CE instance with `plane-cli`
- select the active workspace or project
- list, view, create, update, or comment on Plane work-items
- understand the mapping between Plane concepts and the `plane-cli` command surface
- avoid common mistakes around CE authentication and identifier resolution

## What This Skill Covers

- `plane auth login` and `plane auth status`
- `plane workspace use`
- `plane project list` and `plane project use`
- `plane work-item list`
- `plane work-item view`
- `plane work-item create`
- `plane work-item update`
- `plane work-item comment`
- self-hosted Plane CE API constraints validated for this project

## Read These References First

- `references/plane-concepts.md`
- `references/cli-workflows.md`
- `references/ce-api-constraints.md`

## Operating Rules

1. Prefer `plane-cli` over raw API calls when the CLI already supports the workflow.
2. For self-hosted Plane CE, assume PAT auth uses `x-api-key`.
3. Treat project UUIDs as the canonical project identifier in API paths.
4. Treat numeric work-item refs as user-friendly input that the CLI resolves client-side.
5. When giving examples, always use generic placeholders, not real instance URLs, tokens, workspace names, or project IDs.

## Fast Start

```bash
plane auth login --base-url https://plane.example.internal --api-key <token> --workspace example-workspace
plane project list --json
plane project use PROJECT_KEY
plane work-item list --limit 20 --json
plane work-item create --name "Investigate login edge case"
plane work-item update 7 --state "In Progress" --assignee agent@example.com
plane work-item comment 7 --body "Validated on staging"
```
