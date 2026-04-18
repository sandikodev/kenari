# E2E Tests

End-to-end tests using Playwright. Tests run against a real dev server with an isolated SQLite database.

## Setup

```bash
# 1. Install Playwright browsers (one-time)
bunx playwright install chromium

# 2. Create test env file
cp .env.test.example .env.test

# 3. Create test database schema
DATABASE_URL=file:./test.db bunx drizzle-kit push
```

## Running Tests

```bash
# Run all tests (headless)
bun run test:e2e

# Run with UI (interactive, great for debugging)
bun run test:e2e:ui

# Run specific test file
bunx playwright test e2e/auth.test.ts

# Debug a specific test
bunx playwright test e2e/auth.test.ts --debug
```

## Test Files

| File | What it tests |
|------|--------------|
| `setup.test.ts` | First-run wizard, setup page behavior |
| `auth.test.ts` | Login, logout, rate limiting |
| `dashboard.test.ts` | Dashboard, agents page, public status page |
| `console.test.ts` | Admin console, settings, role management |
| `api.test.ts` | Agent API endpoints, Zod validation |

## Notes

- Tests run sequentially (not parallel) because they share a SQLite database
- Each test file manages its own DB state via `resetDb()` / `seedAdmin()` helpers
- The test database (`test.db`) is gitignored — never committed
- Upstream services (Kuma, Grafana) are mocked via unreachable URLs — health checks will show "offline" which is expected
- GitHub OAuth is not tested in E2E (requires real OAuth app) — tested manually
