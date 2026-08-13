# Cloudflare deployment

This project is intended to be built and deployed by Cloudflare from the GitHub repository.
Local development should only require source edits and review. The final `dist` output is generated during the Cloudflare build.

## Architecture

- `packages/frontend` is a Vite/Vue app.
- `packages/worker` is a Cloudflare Worker API.
- The Worker serves API routes from `/api/*` and `/sub/*`.
- All other routes are served from Worker Assets using `packages/frontend/dist`.

## Cloudflare build settings

Use the repository root as the build root.

Build command:

```bash
pnpm install --frozen-lockfile && pnpm run cf:publish
```

Node.js version:

```text
20 or newer
```

Package manager:

```text
pnpm
```

## Required Worker secrets

Configure these in the Cloudflare dashboard or with `wrangler secret put`:

```text
ADMIN_PASSWORD
TOKEN_SECRET
```

Do not commit secret values to the repository.

## D1 binding

The Worker expects this D1 binding:

```text
SINGBOX_DB
```

The current database configuration is in `packages/worker/wrangler.toml`.
Make sure the configured `database_id` exists in the Cloudflare account that runs the deployment.

Initialize the schema before first use:

```bash
pnpm --filter worker exec wrangler d1 execute singbox_templates_db --remote --file=./schema.sql
```

This schema command is non-destructive and can be re-run safely.

Optional seed data:

```bash
pnpm --filter worker exec wrangler d1 execute singbox_templates_db --remote --file=./seed.sql
```

To intentionally reset the database, use `packages/worker/reset.sql`.
This deletes all existing templates before recreating the table.

## Local workflow

For this deployment model, do not commit generated frontend output.
Make source changes locally, push to GitHub, and let Cloudflare run the build and deploy command.
