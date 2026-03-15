# Integration Tests — CLAUDE.md

BDD integration tests using Cucumber.js + Playwright (headless Chromium).

## Commands

```bash
# Docker (recommended) — builds backend, frontend (plain HTTP), and test container
docker compose -f docker-compose.integration.yml up --build

# View the HTML report
open integration/reports/report.html

# Clean up
docker compose -f docker-compose.integration.yml down -v

# Local — auto-starts backend + frontend
cd integration
npm install
npm run install:browsers   # one-time Chromium download
npm test
```

## Configuration

- `cucumber.config.cjs` — ESM module loading via `tsx/esm` (package.json has `"type": "module"`)
- Each scenario cleans all recipes via API `Before` hook — no manual DB reset needed
- Docker uses `nginx-integration.conf` (plain HTTP on port 80, no HTTPS redirect)

## Feature files

| File | Scenarios |
|------|-----------|
| `recipes.feature` | Recipe list, title search |
| `recipe-detail.feature` | Detail view, delete |
| `create-recipe.feature` | 4-step wizard |
| `ingredient-search.feature` | Chip input, ranked results, fuzzy typo match |
| `planner.feature` | Weekly planner, shopping list |
| `image-storage.feature` | Image slot 404, invalid slot 400, stored image visible on detail page |
| `settings.feature` | Dark theme toggle, preference restored after reload, toggle off restores light theme |

**Totals:** 21 scenarios — all passing.

**Test images:** `TestImages/` contains real JPEG fixtures committed to the repo (un-gitignored in Phase 12). Used by `image-storage.steps.ts` to seed images via `PUT /api/v1/recipes/{id}/images/{slot}`.

## Project structure

```
integration/
├── features/              # Gherkin .feature files
├── src/
│   ├── steps/             # Step definitions (TypeScript)
│   └── support/           # World class, hooks (server lifecycle, DB cleanup)
├── reports/               # HTML report (generated, gitignored)
├── cucumber.config.cjs
├── nginx-integration.conf # Plain HTTP nginx override for Docker
└── Dockerfile
```

## CI

GitHub Actions workflow `.github/workflows/integration.yml` runs the full BDD Docker stack on every PR to `main`. HTML report uploaded as build artifact (14-day retention).
