#!/usr/bin/env bash
# Mangusu IS CSC Form 48 DTR Portal - Automatic Publish Script
# Automatically stages all files, creates a commit, and pushes to origin main.

set -e

# Default commit message if none provided
COMMIT_MSG="${1:-Update Mangusu IS CSC Form 48 DTR Portal $(date +'%Y-%m-%d %H:%M')}"

echo "=========================================="
echo "📦 1/3 Staging changes..."
echo "=========================================="
git add -A

echo "💾 2/3 Committing changes..."
git commit -m "$COMMIT_MSG" --allow-empty

echo "🚀 3/3 Pushing to origin main..."
git push -u origin main

echo ""
echo "✅ Done! Successfully pushed to origin main."
echo "🌐 GitHub Actions will automatically deploy to GitHub Pages."
