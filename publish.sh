#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

npm test

PUBLISHED=$(npm view @octivas/mcp version 2>/dev/null || echo "0.0.0")
IFS='.' read -r MAJOR MINOR PATCH <<< "$PUBLISHED"
NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))"

npm version "$NEW_VERSION" --no-git-tag-version
sed -i "s/version: \".*\"/version: \"$NEW_VERSION\"/" src/index.ts

echo "Published version: $PUBLISHED → Building $NEW_VERSION"

npm run build

# run these manually:
#npm login
#npm publish
