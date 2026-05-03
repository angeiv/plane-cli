# plane-cli

A `gh`-style CLI for self-hosted Plane Community Edition.

## Commands

```bash
# Authentication
plane auth login --base-url <url> --api-key <token> --workspace <slug>
plane auth status
plane auth logout

# Workspace & Project
plane workspace list
plane workspace use <slug>
plane project list
plane project use <id|key>

# Work Items
plane work-item list [--limit 20] [--json] [--tsv] [--format jq --jq '.results[].name']
plane work-item view <ref> [--json]
plane work-item create --name <name> [--description <text>] [--priority <p>] [--assignee <email>] [--start-date <d>] [--target-date <d>] [--parent <ref>] [--cycle <ref>] [--module <ref>] [--label <name>]
plane work-item update <ref> [--name <name>] [--state <state>] [--assignee <email>] [--start-date <d>] [--target-date <d>] [--parent <ref|none>] [--cycle <ref>] [--module <ref>] [--label <name>]
plane work-item delete <ref>
plane work-item comment <ref> --body <text>
plane work-item list-comments <ref>
plane work-item update-comment <ref> --comment-id <id> --body <text>
plane work-item delete-comment <ref> --comment-id <id>
# Activity/Link/Relation/Attachment
plane work-item activity <ref> [-L 30] [--json] [--tsv] [--jq '.[] | .verb']
plane work-item link list <ref>
plane work-item link add <ref> --url <url> [--title <title>]
plane work-item link remove <ref> <link-id>
plane work-item relation list <ref>
plane work-item relation add <ref> --type <type> --related <ref>
plane work-item relation remove <ref> <relation-id>
plane work-item attach list <ref>
plane work-item attach delete <ref> <attachment-id>

# Cycles
plane cycle list
plane cycle view <ref>
plane cycle create --name <name> [--start-date <d>] [--end-date <d>]
plane cycle update <ref> [--name <name>] [--start-date <d>] [--end-date <d>]
plane cycle delete <ref>
plane cycle add-issue <ref> --issue <seq>
plane cycle remove-issue <ref> --issue <seq>

# Modules
plane module list
plane module view <ref>
plane module create --name <name> [--status <status>] [--start-date <d>] [--target-date <d>] [--lead <email>] [--members <email>]
plane module update <ref> [--name <name>] [--status <status>] [--start-date <d>] [--target-date <d>] [--lead <email>] [--members <email>]
plane module delete <ref>
plane module add-issue <ref> --issue <seq>
plane module remove-issue <ref> --issue <seq>

# Labels
plane label list
plane label create --name <name> [--color <hex>] [--description <text>]
plane label delete <ref>
```

## Bug Management Workflow

Bug tracking uses **labels**, not a separate issue type. Create Bug-related labels per your project's taxonomy:

```bash
# Create Bug labels (choose your own taxonomy)
plane label create --name Bug --color "#E54545" --description "Defect or error"
plane label create --name Regression --color "#FF6F00" --description "Regression defect"
plane label create --name Security --color "#D50000" --description "Security vulnerability"
```

### Bug lifecycle

Use `--label` multiple times to attach multiple labels:

```bash
# 1. Report a bug — attach Bug label on creation
plane work-item create --name "Login fails on mobile" --label Bug --priority high --start-date 2026-05-01 --target-date 2026-05-03 --assignee dev@example.com --cycle "Sprint 1" --module "认证"

# 2. Filter all bugs
plane work-item list --json --jq '.results[] | select(.labels | length > 0)'

# 3. Fix the bug
plane work-item update 51 --state "In Progress"
plane work-item comment 51 --body "Root cause: session cookie not set on mobile browsers."

# 4. Mark as Done
plane work-item update 51 --state Done
plane work-item comment 51 --body "Fixed by adding SameSite=None to session cookie. Verified on iOS/Android."
```

> **Note:** `--label` is repeatable. Each `--label <name>` adds one label. Names are resolved to IDs automatically.
> Example: `--label Bug --label Regression` attaches both Bug and Regression labels.

### Module status

Modules support status values with Chinese/English mapping:

| English | Chinese | API value |
|---------|---------|-----------|
| backlog | 待办 | `backlog` |
| planned | 已计划 | `planned` |
| in-progress | 进行中 | `in-progress` |
| paused | 已暂停 | `paused` |
| completed | 已完成 | `completed` |
| cancelled | 已取消 | `cancelled` |

```bash
plane module update "认证" --status 已完成
plane module update "工作项" --status in-progress
```

## Output Formats

All `list` and `view` commands support multiple output formats:

```bash
# Table (default)
plane work-item list

# JSON
plane work-item list --json
plane work-item list --format json

# TSV (for spreadsheet import)
plane work-item list --tsv

# Go template
plane work-item list --template '{{range .results}}{{.name}}
{{end}}'

# JQ expression
plane work-item list --jq '.results[].name'
plane module list --jq '.results[] | {name: .name, status: .status}'
```

## Install Dependencies

```bash
corepack enable
pnpm install
```

## Runtime

`plane-cli` targets Node.js 22 or newer and uses pnpm 10 via Corepack.

## Run Locally

```bash
pnpm dev -- auth login --base-url https://plane.example.internal --api-key <token> --workspace example-workspace
pnpm dev -- project list --json
pnpm dev -- work-item list --limit 20 --json
```

## Local Config

`plane-cli` stores configuration in a local config file that defaults to:

```text
~/.config/plane-cli/config.json
```

For tests or isolated runs, set:

```bash
PLANE_CLI_CONFIG_DIR=/tmp/plane-cli-dev
```

## Reusable Skill

This repository also ships a reusable skill for other agents:

[`skills/plane-cli-usage/SKILL.md`](skills/plane-cli-usage/SKILL.md)

The skill explains:

- Plane concepts and terminology
- `plane-cli` command workflows
- validated self-hosted Plane CE API constraints

## Development

```bash
pnpm test
pnpm run typecheck
pnpm run build
```

## GitHub Release

Releases are built and published by GitHub Actions when a semantic version tag is pushed:

```bash
pnpm version patch
git push origin main
git push origin v0.1.1
```

The release workflow will:

- require the pushed tag to match `package.json` version
- run `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm run typecheck`, and `pnpm run build`
- generate a release `.tgz` with `pnpm pack`
- generate a `SHA256SUMS` file
- create or update the matching GitHub Release with generated notes

For a local dry run of the packaging step:

```bash
pnpm run build
pnpm run release:pack -- --tag v0.1.0
```

Use generic example URLs, tokens, workspaces, and project IDs in docs and commits. Do not commit real PATs or environment files.
