---
name: create-issue
description: Draft and create a GitHub issue in user-story format with acceptance criteria precise enough for GitHub Copilot PR review.
argument-hint: <brief feature description>
---

The user wants to create a GitHub Issue for the recipeAId project. Their input is: $ARGUMENTS

## Your job

1. **Understand the feature** — if the description is vague or short, read relevant files in the codebase to gather enough context (architecture, affected files, existing patterns). Do not ask the user for clarification; infer what you can from the codebase.

2. **Draft the issue** using the template below. Show it to the user and ask for approval or changes before creating it.

3. **Create the issue** once approved — run:
   ```
   gh issue create --title "<title>" --body "<body>"
   ```

---

## Issue template

Use this exact structure:

```markdown
## User Story

As a **[role]**, I want **[capability]** so that **[benefit/why it matters]**.

## Background

[2–4 sentences explaining the motivation. Why does this feature need to exist? What problem does it solve for the user? Reference any related behaviour that already exists in the app if relevant.]

## What to Build

[Clear, implementation-neutral description of the feature. Describe the outcome, not the code. Use bullet points if the scope is multi-faceted.]

## Acceptance Criteria

Each criterion must be independently verifiable from a pull-request diff or test output. Write them so that a GitHub Copilot PR reviewer can check each one against the changed files.

- [ ] [Backend] <specific, observable behaviour — e.g. "The `POST /api/v1/X` endpoint accepts a new `field` property and persists it">
- [ ] [Frontend] <specific UI behaviour — e.g. "The `RecipeCard` component renders the new field below the title when non-empty">
- [ ] [Unit test] <what the unit test covers — e.g. "A unit test in `RecipeServiceTests` asserts that `BuildX` handles the empty-string case">
- [ ] [BDD] <Gherkin scenario file and scenario name — e.g. "A Gherkin scenario in `integration/features/X.feature` covers the happy path end-to-end">
- [ ] [Error case] <how errors surface — e.g. "A `400 Bad Request` with a `ProblemDetails` body is returned when Y is missing">

Add or remove criteria as needed — every user-facing change needs at least one frontend criterion, one backend criterion, and one BDD criterion.

## Out of Scope

- [List anything the issue explicitly does NOT cover to keep scope clear]

## Technical Notes

[Optional. Only include if there is a non-obvious implementation constraint — e.g. "Must follow the existing `IImageStorage` pattern". Leave this section out if there is nothing worth noting.]
```

---

## Rules for writing acceptance criteria

- **Be specific**: name the endpoint, component, service, or test file where the behaviour will appear. Avoid vague phrases like "it should work" or "handle errors properly".
- **Be implementation-neutral where possible**: describe what the system does (inputs/outputs, UI state), not how it is coded internally — unless a specific pattern is required by the architecture.
- **Layer labels**: prefix each criterion with `[Backend]`, `[Frontend]`, `[Unit test]`, `[BDD]`, or `[Error case]` so Copilot can quickly match the criterion to the relevant diff hunks.
- **Testable from a diff**: every criterion must be something a reviewer can verify by looking at changed files, running tests, or observing the running UI — not something that requires domain knowledge to judge.
- **Required layers**: every user-facing feature needs at minimum one criterion for: backend behaviour, frontend behaviour, a unit test, and a BDD scenario.

## Rules for the title

- Short, imperative sentence (≤ 70 chars): "Add book title to recipe cards", "Allow bulk-deleting recipes from the list view"
- No "Feature:", "Issue:", or other prefix labels — just the title.
