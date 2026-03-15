# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.
Each sub-project has its own `CLAUDE.md` with project-specific details.

## Repository layout

```
recipeaid/
├── docs/
│   ├── adr/                   # Architecture Decision Records
│   │   └── 0001-switch-sqlite-to-litedb.md
│   └── architecture.md        # Living doc: current system architecture, API ref, DB schema
├── backend/                   # ASP.NET Core 9 Web API (see backend/CLAUDE.md)
├── frontend/                  # React 19 + Vite 7 + TypeScript (see frontend/CLAUDE.md)
├── ocr-service/               # Python PaddleOCR sidecar (see ocr-service/CLAUDE.md)
├── ingredient-parser/         # Python Ministral 3B sidecar (see ingredient-parser/CLAUDE.md)
├── integration/               # BDD integration tests (see integration/CLAUDE.md)
├── build-ocr.ps1              # PowerShell helper — builds ocr-service image
├── build-ingredient-parser.ps1 # PowerShell helper — builds ingredient-parser image
└── scripts/
    ├── run-unit-tests.sh      # Runs all four unit-test layers
    └── install-hooks.sh       # One-time: activates pre-push hook
```

## Implementation workflow

When starting any implementation task, always use a git worktree and open a pull request — never merge directly to main.

**Skills automate this workflow** — use them instead of running the steps manually:

| Step | Skill | What it does |
|------|-------|--------------|
| New feature idea | `/create-issue <description>` | Drafts user story + acceptance criteria, opens GitHub Issue |
| Start work | `/start-feature <issue-number>` | Creates worktree, installs deps, scaffolds failing tests |
| Before PR | `/review` | Checks SOLID, DRY, readability across changed files |
| After merge | `/finish-feature <issue> <feature>` | Updates docs, pulls main, closes issue, removes worktree |

Skills live in `.claude/skills/`. If a step fails or you need manual control, the equivalent shell commands are:

```bash
# 1. Pick a feature from GitHub Issues (https://github.com/StuehlerM/recipeAId/issues)
# 2. If the feature involves a significant architectural choice → write an ADR first

# 3. Create a worktree with a new branch (sibling to main repo, not nested inside)
git worktree add ../<feature-name> -b dev/<feature-name>

# 4. Do all work and commits inside the worktree directory
cd ../<feature-name>

# 4a. Install frontend dependencies in the worktree (node_modules are not shared)
cd frontend && npm install && cd ..

# 5. Write tests FIRST (test-driven development — see TDD rules below)
#    a. Write unit tests for all new service/business logic (expect them to fail)
#    b. Write BDD scenarios in integration/features/ covering the happy path and key edge cases
#    Commit these tests before writing any implementation code.

# 6. Implement the feature until all tests pass

# 7. Before opening a PR — run /review and address any [MUST] findings

# 8. Push the feature branch and open a PR (CI runs automatically)
git push -u origin dev/<feature-name>
gh pr create --title "<title>" --body "<summary>"

# 9. After the PR is merged on GitHub, clean up locally
cd ../recipeaid
git pull origin main
git worktree remove ../<feature-name>
git branch -d dev/<feature-name>
```

### Exceptions to the worktree workflow

For non-code tasks that don't affect runtime behavior — code reviews, documentation-only changes, updating CLAUDE.md — you may commit directly to `main` without a worktree or PR.

### TDD rules

Follow a strict test-first order for every feature:

1. **Unit tests first** — write failing unit tests covering the new service/business logic before touching implementation files. Each test must assert one specific behaviour (arrange / act / assert). Heavy dependencies (PaddleOCR, Ollama) are always mocked.
2. **BDD scenarios second** — write the Gherkin `.feature` file(s) in `integration/features/` and the matching step definitions before the feature is wired up end-to-end. Cover the happy path and the most important error cases. **This is mandatory for every user-facing feature — not optional.**
3. **Implement to green** — only then write the production code. Stop when all tests pass; do not add untested behaviour.
4. **No skipping** — do not mark tests as pending/skipped to make CI pass. Fix the implementation or the test expectation instead.

## Documentation rules

### What to update when

| Event | Update |
|-------|--------|
| New feature | Write unit tests + BDD scenarios **before** implementation (see TDD rules) |
| Feature implemented | Relevant `CLAUDE.md`(s), `docs/architecture.md`, `README.md`; **close** the GitHub Issue |
| Architectural decision | New `docs/adr/NNNN-<title>.md` — only for significant choices between alternatives |
| New feature idea | Open a GitHub Issue at https://github.com/StuehlerM/recipeAId/issues |
| Bug fix | Write a failing unit test that reproduces the bug, then fix it. Add a BDD scenario if the bug represents a user-visible behaviour gap. |
| Refactor | Update existing tests to match new signatures; do not delete tests to make them pass |

### ADRs vs GitHub Issues

- **ADRs** (`docs/adr/`) — record *why* a significant decision was made (database engine, storage strategy, new sidecar, auth approach). Written *before* implementation when choosing between meaningful alternatives. Kept forever.
- **GitHub Issues** — track *what* to build. Close the issue after the feature is merged — `docs/architecture.md` becomes the living record.

### Before every commit/push

Update these docs — no exceptions:

- **Relevant `CLAUDE.md`** — root and/or sub-project, whichever was affected
- **`docs/architecture.md`** — if API routes, DB schema, or architectural patterns changed
- **`README.md`** — if user-facing features, setup steps, or project structure changed

**Run the full unit test suite before every push:**

```bash
./scripts/run-unit-tests.sh
```

| Layer | Command | What it covers |
|-------|---------|---------------|
| 1 | `dotnet test backend/` | OcrParserService, RecipeService, matching |
| 2 | `pytest ocr-service/tests/` | OCR preprocessing pipeline + endpoints (PaddleOCR mocked) |
| 3a | `cd frontend && npm test` | Frontend unit tests via vitest (ThemeContext, etc.) |
| 3b | `cd frontend && npm run build` | TypeScript compilation — catches type errors before CI |

The pre-push git hook runs this script automatically after `./scripts/install-hooks.sh` is run once.

Bypass for trivial/safe changes only:
```bash
git push --no-verify          # skip pre-push hook
# add [skip ci] to commit msg  # skip GitHub Actions integration tests
```

## Docker commands

Run the full stack from the repo root:

```bash
docker compose up --build     # Build and start all services
docker compose up             # Start without rebuilding
docker compose down           # Stop containers, keep database
docker compose down -v        # Stop and wipe database
```

Services after `docker compose up`:
- Frontend: https://localhost (self-signed cert — accept browser warning once)
- Backend API: http://localhost:8080
- OCR sidecar: http://localhost:8001 (Swagger UI at `/docs`)
- Ingredient-parser sidecar: internal only (no host port)

**Rebuilding individual images (faster):**

```powershell
.\build-ocr.ps1                          # OCR image with BuildKit pip cache
.\build-ingredient-parser.ps1            # Parser image with BuildKit pip cache
# Both support -NoCache and -Pull flags
```

**Docker TLS:** nginx serves HTTPS on :443 with a self-signed cert generated at build time. The `VM_HOST` build arg adds the VM's IP as a SAN. The `/api/` proxy block sets `client_max_body_size 10m` and `proxy_read_timeout 210s`. A separate `/api/v1/ocr-sessions/` location block has `proxy_buffering off` and `proxy_read_timeout 220s` for the SSE stream.

## Integration tests (BDD)

```bash
# Docker (recommended)
docker compose -f docker-compose.integration.yml up --build
docker compose -f docker-compose.integration.yml down -v

# Local (from integration/)
cd integration && npm install && npm run install:browsers && npm test
```

GitHub Actions runs the full BDD Docker stack on every PR to `main` automatically.

## Dev guidelines

- Use descriptive variable names (no single-letter vars), avoid magic numbers
- Feature-based folder structure in frontend (`src/features/`)
- New frontend UI → Tailwind; existing pages → leave CSS Modules alone
- Unit tests required for all service/business logic — written **before** the implementation (TDD)
- BDD scenarios required for every user-facing feature — written **before** wiring up the feature end-to-end
- Heavy model dependencies (PaddleOCR, Ollama) are **never** exercised in unit tests — always mocked
