# plane-cli

A `gh`-style CLI for self-hosted Plane Community Edition.

## Current Phase 1 Commands

```bash
plane auth login
plane auth status
plane workspace use <slug>
plane project list
plane project use <id|key>
plane work-item list
plane work-item view <ref>
plane work-item create
plane work-item update <ref>
plane work-item comment <ref>
```

## Install Dependencies

```bash
npm install
```

## Run Locally

```bash
npm run dev -- auth login --base-url https://plane.example.internal --api-key <token> --workspace example-workspace
npm run dev -- project list --json
npm run dev -- work-item list --limit 20 --json
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
npm test
npm run build
```

## GitHub Release

Releases are built and published by GitHub Actions when a semantic version tag is pushed:

```bash
npm version patch
git push origin main
git push origin v0.1.1
```

The release workflow will:

- require the pushed tag to match `package.json` version
- run `npm ci`, `npm test`, `npm run typecheck`, and `npm run build`
- generate a release `.tgz` with `npm pack`
- generate a `SHA256SUMS` file
- create or update the matching GitHub Release with generated notes

For a local dry run of the packaging step:

```bash
npm run build
npm run release:pack -- --tag v0.1.0
```

Use generic example URLs, tokens, workspaces, and project IDs in docs and commits. Do not commit real PATs or environment files.
