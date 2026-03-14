#!/usr/bin/env bash
set -e

TAG="v$(date +%Y%m%d)"

# If a tag already exists for today, append an incrementing counter
if git rev-parse "$TAG" &>/dev/null; then
  n=2
  while git rev-parse "${TAG}.${n}" &>/dev/null; do
    ((n++))
  done
  TAG="${TAG}.${n}"
fi

echo "Tagging $TAG"
git tag "$TAG"
git push origin "$TAG"
