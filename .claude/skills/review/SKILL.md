---
name: review
description: Review changed or specified code for SOLID principles, DRY violations, and general best practices with a focus on readability and maintainability.
argument-hint: [file or directory — omit to review current git changes]
---

The user wants a code review. Target: $ARGUMENTS

## What to review

- If `$ARGUMENTS` is empty: review all files changed in the current branch (`git diff main...HEAD --name-only`).
- If `$ARGUMENTS` is a file or directory path: review those files.

Read every target file in full before writing any feedback. Do not comment on code you have not read.

---

## Review dimensions

Evaluate the code across these dimensions in order. For each finding, cite the exact file and line number.

### 1. SOLID principles

| Principle | What to look for |
|-----------|-----------------|
| **Single Responsibility** | Classes, functions, or components doing more than one job. A service that both fetches data and formats output. A component that owns business logic. |
| **Open/Closed** | Logic that must be modified every time a new variant is added (large switch/if-else chains instead of polymorphism or strategy pattern). |
| **Liskov Substitution** | Subtypes or implementations that violate the contract of their interface — throwing where the base does not, silently ignoring parameters, etc. |
| **Interface Segregation** | Interfaces or prop types that force consumers to depend on methods/properties they never use. |
| **Dependency Inversion** | Concrete types newed up inside high-level modules instead of injected. Hard-coded dependencies that make unit testing impossible without mocks. |

### 2. DRY (Don't Repeat Yourself)

- Duplicated logic across files, methods, or components that should be extracted into a shared helper or base.
- Copy-pasted blocks that diverge over time and become a maintenance hazard.
- Magic numbers or string literals repeated in multiple places instead of named constants.

### 3. Readability

- Variable, function, and type names that don't communicate intent (single-letter names, abbreviations, misleading names).
- Functions or methods longer than ~30 lines that could be broken into named sub-steps.
- Nested conditionals or callbacks deeper than two levels.
- Missing or misleading comments on non-obvious logic. (Do not flag lack of comments on self-evident code.)
- Inconsistency with the patterns already established in this codebase.

### 4. Maintainability

- Fragile assumptions (magic indices, undocumented ordering dependencies, reliance on implementation details of external code).
- Error handling that swallows exceptions silently or returns ambiguous results.
- Logic that will break predictably as the dataset or user base grows (but do not speculate — only flag if the path to breakage is clear).
- Tests that are coupled to implementation details instead of behaviour, making refactoring painful.

### 5. Security (lightweight)

Flag only clear issues — do not speculate:
- User-controlled input reaching a command, query, or output without sanitisation.
- Secrets or credentials in source.
- Missing auth checks on endpoints.

---

## Output format

Write the full review to **`REVIEW.md`** in the repo root (create or overwrite). Then print a short one-paragraph summary to the user so they know the file is ready.

Structure `REVIEW.md` exactly like this:

```markdown
# Code Review

_Generated: <ISO date>_
_Target: <files reviewed or "current branch changes">_

## Summary
One short paragraph: overall quality, biggest strength, biggest concern.

## Findings

**[SEVERITY] [DIMENSION] — file:line**
[What the problem is, in one sentence.]
[Why it matters for readability/maintainability.]
[Concrete suggestion — show a corrected snippet if the fix is non-obvious.]

<!-- repeat for each finding -->

## Verdict
One of:
- **Approve** — no `[MUST]` findings; `[SHOULD]` findings are minor or already addressed
- **Request changes** — one or more `[MUST]` findings that need to be resolved before merge
- **Comment** — no blocking issues, but notable `[SHOULD]` items worth a discussion
```

Severity levels:
- `[MUST]` — clear bug, security issue, or violation that will cause real problems
- `[SHOULD]` — meaningful improvement, easy to miss but worth fixing before merge
- `[CONSIDER]` — minor polish, stylistic, or speculative — fine to defer

---

## Rules

- Read the code first, comment second. Never flag issues in code you have not read.
- Be specific: every finding must reference a file and line number.
- Be proportionate: do not flag style nits as `[MUST]`. Reserve `[MUST]` for things that genuinely need fixing before merge.
- Do not suggest adding abstractions for one-off code — only flag DRY violations where duplication creates a real maintenance risk.
- Do not suggest refactoring code that was not changed, unless it is directly relevant to understanding a finding in the changed code.
- Match the patterns of this codebase: if the project uses a convention consistently, follow it rather than flagging it.
- If there are no findings for a dimension, omit that section — do not write "no issues found" for every category.
