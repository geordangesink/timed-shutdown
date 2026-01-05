#!/bin/bash

# Script to upload installers to GitHub Releases
# Usage: ./scripts/upload-release.sh v1.0.2

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <tag>"
    echo "Example: $0 v1.0.2"
    exit 1
fi

TAG="$1"
VERSION="${TAG#v}"  # Remove 'v' prefix

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check if artifacts directory exists
if [ ! -d "artifacts" ] || [ -z "$(ls -A artifacts 2>/dev/null)" ]; then
    echo "❌ No artifacts found. Run build first: npm run build"
    echo "Then extract installers: ./scripts/extract-installers.sh"
    exit 1
fi

echo "🚀 Creating GitHub Release: $TAG"
echo "📦 Version: $VERSION"
echo ""

# Create release
gh release create "$TAG" \
    --title "Release $VERSION" \
    --notes "## Timed Shutdown $VERSION

### Downloads

Installers for all platforms are available below.

### Changes

See the commit history for changes in this release." \
    artifacts/* \
    --latest

echo ""
echo "✅ Release created successfully!"
echo "🔗 View release: https://github.com/$(gh repo view --json owner,name -q '.owner.login + "/" + .name')/releases/tag/$TAG"

