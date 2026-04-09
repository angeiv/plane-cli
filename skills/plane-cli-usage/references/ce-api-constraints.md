# Self-Hosted Plane CE API Constraints

These notes capture the validated behavior that `plane-cli` is built around.

## Authentication

- Personal access tokens are sent as `x-api-key`.
- `Authorization: Bearer` should not be assumed to work for the validated CE flows.
- `GET /api/v1/users/me/` is the lightweight auth validation request used by `plane auth status`.

## Context Discovery

- `users/me` does not provide enough workspace context for CLI defaults.
- The CLI therefore stores `workspaceSlug` explicitly in local config.

## Project and Work-Item Identity

- Project API paths use `project UUID`, not project key.
- Project keys are convenient input and must be resolved client-side through the project list endpoint.
- Work-item detail paths use work-item UUID.
- Numeric refs such as `7` are a CLI convenience and must be resolved client-side against the current project.

## Pagination

- List requests use `per_page` and `cursor`.
- Do not assume `limit` and `offset` are accepted by the target CE instance.

## Resource Aliases

- Some CE instances may still expose `/issues/` aliases.
- `plane-cli` should standardize on `work-item` terminology in user-facing commands regardless of alias availability.
