---
name: start-feature
description: Start a new feature from a GitHub Issue — creates a git worktree, installs dependencies, and kicks off TDD by scaffolding test files before any implementation.
argument-hint: <issue-number>
---

The user wants to start work on GitHub Issue #$ARGUMENTS.

## Step 1 — Read the issue

Fetch the issue so you understand the full scope before touching anything:

```bash
gh issue view $ARGUMENTS
```

Extract:
- **Title** → derive the feature name (lowercase, hyphens, no special chars, max 40 chars), e.g. `add-book-title-filter`
- **Acceptance criteria** → these drive what tests to write in Step 4

Show the user the issue title and the feature name you derived. Ask them to confirm or correct the feature name before continuing.

Once confirmed, **immediately create `PLAN.md`** in the repo root as a scratchpad (it will be moved/committed to the worktree in Step 5). Populate it with everything you already know:

```markdown
# Plan: FEATURE_NAME (Issue #ISSUE_NUMBER)

## Issue summary
[One paragraph from the issue description]

## Acceptance criteria
- [ ] AC 1
- [ ] AC 2
...

## Implementation checklist
- [ ] Worktree created
- [ ] Frontend deps installed (`npm install`)
- [ ] Test scaffold committed
- [ ] Backend implementation
- [ ] OCR sidecar changes (if applicable)
- [ ] Ingredient-parser changes (if applicable)
- [ ] Frontend changes (if applicable)
- [ ] All unit tests pass (`./scripts/run-unit-tests.sh`)
- [ ] PR opened

## Notes
[Anything non-obvious about the design or approach — fill in as work progresses]
```

Tick items off as each step completes.

---

## Step 2 — Create the worktree

Run from the repo root (`d:/Coding/Projects/recipeaid`). The worktree must be a **sibling directory** — not nested inside the repo.

```bash
git worktree add ../FEATURE_NAME -b dev/FEATURE_NAME
```

Where `FEATURE_NAME` is the confirmed feature name from Step 1.

Verify it was created:
```bash
git worktree list
```

---

## Step 3 — Install frontend dependencies

`node_modules` are not shared between worktrees. Install them in the new worktree:

```bash
cd ../FEATURE_NAME/frontend && npm install
```

This is required — the pre-push hook calls `tsc` via `node_modules/.bin/tsc` and will fail without it.

---

## Step 4 — Scaffold test files (TDD — tests before implementation)

Read the acceptance criteria from the issue. For each layer that will change, create the test scaffold **with failing tests** before any production code is written.

### Which layers to scaffold

| If the feature touches… | Scaffold this |
|------------------------|--------------|
| Backend service/business logic | `backend/tests/RecipeAId.Tests/` — xUnit test class with `[Fact]` methods, one per acceptance criterion |
| OCR sidecar | `ocr-service/tests/` — pytest file with one test function per criterion |
| Ingredient-parser sidecar | `ingredient-parser/tests/` — pytest file with one test function per criterion |
| Frontend logic/hooks | `frontend/src/` — note: frontend layer is validated via `npm run build`; add type stubs if needed |
| User-facing end-to-end flow | `integration/features/FEATURE_NAME.feature` — Gherkin `.feature` file + step definitions stub in `integration/src/steps/` |

### Rules for scaffolded tests

- Each test must have a clear **Arrange / Act / Assert** structure with comments marking each section.
- Each test must **fail** for the right reason (not because of a missing import or syntax error — because the implementation does not exist yet).
- Heavy dependencies (PaddleOCR, Ollama) are **always mocked** — never exercised in unit tests.
- Name test methods after the behaviour they assert, e.g. `BuildIngredients_WithEmptyName_ThrowsArgumentException`.
- The BDD `.feature` file must cover the happy path and at least one error/edge case from the acceptance criteria.

### After scaffolding

Run the relevant test layer to confirm the tests fail (not error):

```bash
# Backend
dotnet test ../FEATURE_NAME/backend/ --no-build 2>&1 | tail -20

# Python sidecars
python -m pytest ../FEATURE_NAME/ocr-service/tests/ -v 2>&1 | tail -20
python -m pytest ../FEATURE_NAME/ingredient-parser/tests/ -v 2>&1 | tail -20
```

---

## Step 5 — Commit the test scaffold and PLAN.md

Tick off the completed checklist items in `PLAN.md` (worktree created, deps installed), then stage and commit **only the test files and PLAN.md** — no production code yet:

```bash
cd ../FEATURE_NAME
git add backend/tests/ ocr-service/tests/ ingredient-parser/tests/ integration/features/ PLAN.md
git commit -m "test(#$ARGUMENTS): scaffold failing tests for FEATURE_NAME"
```

After committing, tick off "Test scaffold committed" in `PLAN.md` and add a second commit for that update.

---

## Step 6 — Hand off to the user

Print a clear summary:

```
✔ Worktree created:  ../FEATURE_NAME  (branch: dev/FEATURE_NAME)
✔ Frontend deps:     npm install done
✔ Tests scaffolded:  [list files created]
✔ PLAN.md written:   ../FEATURE_NAME/PLAN.md
✔ Test commit:       [commit hash]

Next steps (implement to green):
  cd ../FEATURE_NAME
  cat PLAN.md   ← start here in a new session
  [implement each acceptance criterion until all tests pass]
  ./scripts/run-unit-tests.sh   ← run before pushing

When done:
  git push -u origin dev/FEATURE_NAME
  gh pr create --title "..." --body "..."
  /finish-feature $ARGUMENTS FEATURE_NAME
```

---

## Rules

- Never create production code in this skill — only test scaffolds.
- Never merge to main — the worktree workflow always ends with a PR.
- If the issue number does not exist or the `gh` command fails, stop and tell the user clearly.
- If the worktree directory already exists, stop and ask the user before overwriting.
