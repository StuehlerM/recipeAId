# Add .dockerignore Files

## Problem

No `.dockerignore` files exist in the project. Docker build contexts include unnecessary files (`node_modules/`, `dist/`, `.git/`, `bin/`, `obj/`, test results, IDE settings), increasing build context transfer time and image size.

## Affected Directories

- `frontend/` — `node_modules/` (~200+ MB) sent to Docker daemon on every build
- `backend/` — `bin/`, `obj/` directories sent unnecessarily
- `ocr-service/` — `__pycache__/`, `tests/` not needed in image
- `ingredient-parser/` — `__pycache__/`, `tests/` not needed in image

## Proposed Solution

Add `.dockerignore` to each service directory (or a single root `.dockerignore` if using root context):

```dockerignore
# Common
.git
*.md
.github/
.claude/

# Frontend
node_modules/
dist/

# Backend
bin/
obj/
TestResults/

# Python
__pycache__/
*.pyc
.pytest_cache/
venv/
```

## Acceptance Criteria

- Each service with a Dockerfile has a `.dockerignore`
- Build context size reduced (verify with `docker build` output)
- All Docker builds still succeed
- No runtime files accidentally excluded
