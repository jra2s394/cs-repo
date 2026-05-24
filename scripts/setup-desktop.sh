#!/usr/bin/env bash
# setup-desktop.sh — One-time Desktop setup for CS Reports
# Creates: ~/Desktop/CS Reports/Intercom/
#          ~/Desktop/CS Reports/Onboarding/
#          ~/Desktop/CS Reports/Renewals/
#          ~/Desktop/CS Reports/QBR/
#          ~/Desktop/cs-repo  (symlink to this repo)
# Run once after cloning: bash scripts/setup-desktop.sh

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESKTOP="$HOME/Desktop"
REPORTS_DIR="$DESKTOP/CS Reports"

echo "Setting up CS Reports folder on your Desktop..."

# Create report subfolders
mkdir -p "$REPORTS_DIR/Intercom"
mkdir -p "$REPORTS_DIR/Onboarding"
mkdir -p "$REPORTS_DIR/Renewals"
mkdir -p "$REPORTS_DIR/QBR"
mkdir -p "$REPORTS_DIR/Health Reports"
mkdir -p "$REPORTS_DIR/Executive Summaries"
echo "  ✓ $REPORTS_DIR/Intercom/"
echo "  ✓ $REPORTS_DIR/Onboarding/"
echo "  ✓ $REPORTS_DIR/Renewals/"
echo "  ✓ $REPORTS_DIR/QBR/"
echo "  ✓ $REPORTS_DIR/Health Reports/"
echo "  ✓ $REPORTS_DIR/Executive Summaries/"

# Create symlink to repo (skip if already exists or Desktop is unavailable)
LINK="$DESKTOP/cs-repo"
if [ -L "$LINK" ]; then
  echo "  ✓ $LINK already exists — skipping"
elif [ -e "$LINK" ]; then
  echo "  ⚠ $LINK exists but is not a symlink — skipping (remove it manually if you want the symlink)"
else
  ln -s "$REPO_DIR" "$LINK"
  echo "  ✓ $LINK → $REPO_DIR"
fi

echo ""
echo "Done. After running any report command, the latest .docx will auto-copy to:"
echo "  $REPORTS_DIR/Intercom/            (Intercom reports)"
echo "  $REPORTS_DIR/Onboarding/          (Onboarding reports)"
echo "  $REPORTS_DIR/Renewals/            (Renewal invoice reports)"
echo "  $REPORTS_DIR/QBR/                 (QBR prep briefs)"
echo "  $REPORTS_DIR/Health Reports/      (Portfolio health scorecards)"
echo "  $REPORTS_DIR/Executive Summaries/ (Executive summary reports)"
echo ""
echo "To open Claude Code in this repo quickly: open $LINK in your terminal or Finder."
