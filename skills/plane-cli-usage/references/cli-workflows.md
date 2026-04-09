# plane-cli Workflows

## First-Time Login

```bash
plane auth login --base-url https://plane.example.internal --api-key <token> --workspace example-workspace
plane auth status --json
```

## Set Context

```bash
plane workspace use example-workspace
plane project list
plane project use PROJECT_KEY
```

## Read Work-Items

```bash
plane work-item list --limit 20
plane work-item list --limit 20 --json
plane work-item view 7
plane work-item view 7 --json
```

## Create and Update Work-Items

```bash
plane work-item create --name "Investigate auth regression"
plane work-item create --name "Investigate auth regression" --state "Backlog" --assignee agent@example.com
plane work-item update 7 --state "In Progress" --assignee agent@example.com --priority high
plane work-item update 7 --description "Validated on staging"
```

## Comment on Work-Items

```bash
plane work-item comment 7 --body "Validated on staging"
plane work-item comment 7 --body "<p>Validated on staging</p>" --json
```

## Troubleshooting

- If `auth status` fails, confirm the PAT is still valid and the base URL points to the self-hosted Plane CE instance.
- If `project use PROJECT_KEY` fails, run `plane project list --json` and confirm the key belongs to the current workspace.
- If `work-item view 7` fails, confirm the active project is correct; numeric refs are project-scoped.
