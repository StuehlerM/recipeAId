---
name: Finish Feature
description: Clean up after a feature PR is merged — updates docs, pulls main, closes the GitHub Issue, removes the worktree and branch.
tools: ["read", "search", "edit", "execute"]
---

The user has merged a feature PR and wants to clean up. Parse the following from their message:
- **Issue number** — e.g. `42`
- **Feature name / worktree directory name** — e.g. `add-book-title-filter`

If either value is missing, ask the user for it before continuing.

---

## Step 1 — Verify the PR is actually merged

Before touching anything, confirm the branch was merged:

```bash
gh pr list --state merged --head dev/<FEATURE_NAME> --json number,title,mergedAt
```

If the result is empty, stop and warn the user — do not clean up an unmerged feature.

---

## Step 2 — Pull main

```bash
cd d:/Coding/Projects/recipeaid
git pull origin main
```

This brings the merged feature branch into main before updating docs. If the pull fails, stop and tell the user.

---

## Step 3 — Update documentation

Read the issue to understand what was built:

```bash
gh issue view <ISSUE_NUMBER>
```

Then read the relevant files that are likely to need updating:
- `docs/architecture.md` — if API routes, DB schema, or architectural patterns changed
- The affected sub-project `CLAUDE.md` (backend, frontend, ocr-service, ingredient-parser, or integration)
- `README.md` — if user-facing features, setup steps, or project structure changed

**Make the updates** — do not skip this. Apply the minimum necessary changes:
- Add new API endpoints to the API reference in `docs/architecture.md`
- Add new DB fields to the schema section
- Add new frontend pages or components to the relevant section
- Update `README.md` Features list if the feature is user-visible

Commit the documentation updates directly on `main` (doc-only changes are exempt from the worktree/PR rule per CLAUDE.md):

```bash
cd d:/Coding/Projects/recipeaid
git add docs/ backend/CLAUDE.md frontend/CLAUDE.md ocr-service/CLAUDE.md ingredient-parser/CLAUDE.md integration/CLAUDE.md README.md
git commit -m "docs(#<ISSUE_NUMBER>): update architecture and CLAUDE.md after <FEATURE_NAME> merge"
```

Only stage files that actually changed.

---

## Step 4 — Close the GitHub Issue

```bash
gh issue close <ISSUE_NUMBER> --comment "Implemented in the merged PR. Documentation updated in main."
```

---

## Step 5 — Remove the worktree

```bash
cd d:/Coding/Projects/recipeaid
git worktree remove ../<FEATURE_NAME>
```

If the worktree has uncommitted changes, `git worktree remove` will refuse. Stop and warn the user — do not force remove.

---

## Step 6 — Delete the local branch

```bash
git branch -d dev/<FEATURE_NAME>
```

`-d` (safe delete) will refuse if the branch is not fully merged. If it refuses, stop and tell the user rather than using `-D`.

---

## Step 7 — Final summary

Print a clean summary of everything that was done:

```
✔ PR verified merged
✔ main pulled:       [latest commit hash]
✔ Docs updated:      [list files that changed]
✔ Docs committed:    [commit hash]
✔ Issue #N closed
✔ Worktree removed:  ../<FEATURE_NAME>
✔ Branch deleted:    dev/<FEATURE_NAME>

You're back on main and ready for the next feature.
```

---

## Rules

- Never force-remove a worktree (`--force`) or force-delete a branch (`-D`) — always stop and ask the user if a safe operation fails.
- Never skip the documentation step — it is required by the project's documentation rules for every merged feature.
- Always verify the PR is merged before cleaning up.
- If the feature name is ambiguous, list current worktrees (`git worktree list`) and ask the user to confirm.
