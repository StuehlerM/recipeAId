#!/usr/bin/env bash
# install-hooks.sh
#
# One-time setup: points git's hooks directory at .githooks/ so the pre-push
# hook runs automatically on every `git push`.
#
# Run once after cloning:
#   ./scripts/install-hooks.sh
#
# To uninstall (revert to git defaults):
#   git config --unset core.hooksPath

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

git -C "$REPO_ROOT" config core.hooksPath .githooks
chmod +x "$REPO_ROOT/.githooks/pre-push"
chmod +x "$REPO_ROOT/scripts/run-unit-tests.sh"

echo "Git hooks installed. Unit tests will now run before every 'git push'."
echo ""
echo "To skip the hook for a one-off push:  git push --no-verify"
echo "To uninstall:                          git config --unset core.hooksPath"
