---
name: finish-feature
description: Clean up after a feature PR is merged — updates docs, pulls main, closes the GitHub Issue, removes the worktree (if used) and branch.
argument-hint: <issue-number> <feature-name>
---

The user has merged a feature PR and wants to clean up. Arguments: $ARGUMENTS

Parse arguments:
- `$ARGUMENTS[0]` — GitHub Issue number (e.g. `42`)
- `$ARGUMENTS[1]` — feature name / worktree directory name (e.g. `add-book-title-filter`)

If either argument is missing, ask the user for it before continuing.

Also determine whether the feature was developed in a **worktree** or a plain **branch**:
```bash
git worktree list
```
If `../$ARGUMENTS[1]` appears in the list, `MODE = worktree`. Otherwise `MODE = branch`.

---

## Step 1 — Verify the PR is actually merged

Before touching anything, confirm the branch was merged:

```bash
gh pr list --state merged --head dev/$ARGUMENTS[1] --json number,title,mergedAt
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
gh issue view $ARGUMENTS[0]
```

Then read the relevant files that are likely to need updating:
- `docs/architecture.md` — if API routes, DB schema, or architectural patterns changed
- The affected sub-project `CLAUDE.md` (backend, frontend, or integration)
- `README.md` — if user-facing features, setup steps, or project structure changed

**Make the updates** — do not skip this. Apply the minimum necessary changes:
- Add new API endpoints to the API reference in `docs/architecture.md`
- Add new DB fields to the schema section
- Add new frontend pages or components to the relevant section
- Update `README.md` Features list if the feature is user-visible

Commit the documentation updates directly on `main` (doc-only changes are exempt from the worktree/PR rule per CLAUDE.md):

```bash
cd d:/Coding/Projects/recipeaid
git add docs/ backend/CLAUDE.md frontend/CLAUDE.md integration/CLAUDE.md README.md
git commit -m "docs(#$ARGUMENTS[0]): update architecture and CLAUDE.md after FEATURE_NAME merge"
```

Only stage files that actually changed.

---

## Step 4 — Close the GitHub Issue

```bash
gh issue close $ARGUMENTS[0] --comment "Implemented in the merged PR. Documentation updated in main."
```

---

## Step 5 — Remove the worktree *(worktree only — skip for branch)*

If `MODE = worktree`:

```bash
cd d:/Coding/Projects/recipeaid
git worktree remove ../$ARGUMENTS[1]
```

If the worktree has uncommitted changes, `git worktree remove` will refuse. Stop and warn the user — do not force remove.

---

## Step 6 — Delete the local branch

```bash
git branch -d dev/$ARGUMENTS[1]
```

`-d` (safe delete) will refuse if the branch is not fully merged. If it refuses, stop and tell the user rather than using `-D`.

---

## Step 7 — Final summary

**If MODE = worktree:**

```
✔ PR verified merged
✔ main pulled:       [latest commit hash]
✔ Docs updated:      [list files that changed]
✔ Docs committed:    [commit hash]
✔ Issue #N closed
✔ Worktree removed:  ../FEATURE_NAME
✔ Branch deleted:    dev/FEATURE_NAME

You're back on main and ready for the next feature.
Run: /create-issue <description>   to open a new issue
```

**If MODE = branch:**

```
✔ PR verified merged
✔ main pulled:       [latest commit hash]
✔ Docs updated:      [list files that changed]
✔ Docs committed:    [commit hash]
✔ Issue #N closed
✔ Branch deleted:    dev/FEATURE_NAME

You're back on main and ready for the next feature.
Run: /create-issue <description>   to open a new issue
```

---

## Rules

- Never force-remove a worktree (`--force`) or force-delete a branch (`-D`) — always stop and ask the user if a safe operation fails.
- Never skip the documentation step — it is required by the project's documentation rules for every merged feature.
- Always verify the PR is merged before cleaning up.
- If `$ARGUMENTS[1]` (feature name) is ambiguous, list current worktrees (`git worktree list`) and branches (`git branch`) and ask the user to confirm.
