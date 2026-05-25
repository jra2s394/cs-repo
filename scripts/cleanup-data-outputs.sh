#!/usr/bin/env bash
# cleanup-data-outputs.sh — enforce the retention policy from SECURITY.md.
#
# Removes files older than $RETENTION_DAYS (default 30) in:
#   - data/outputs/         standup metrics JSON + standup .md drafts
#   - out/                  generated .docx + .csv reports
#   - ~/Desktop/CS Reports/ Desktop-copy versions of the same reports
#
# By default this is DRY RUN — prints what would be removed without removing.
# Pass `--apply` to actually delete. Combine with `--days N` to override
# the retention window.
#
# Examples:
#   bash scripts/cleanup-data-outputs.sh                  # dry run, 30 days
#   bash scripts/cleanup-data-outputs.sh --days 14        # dry run, 14 days
#   bash scripts/cleanup-data-outputs.sh --apply          # delete, 30 days
#   bash scripts/cleanup-data-outputs.sh --apply --days 7 # delete, 7 days
#
# Both Mac and Linux `find` support `-mtime +N`; this script avoids the
# POSIX `-mmin` extension so it works on the default `find` everywhere.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RETENTION_DAYS=30
APPLY=0

while [ $# -gt 0 ]; do
  case "$1" in
    --apply)
      APPLY=1
      shift
      ;;
    --days)
      RETENTION_DAYS="$2"
      shift 2
      ;;
    -h|--help)
      sed -n '2,/^set -euo pipefail/p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if ! [[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]]; then
  echo "Error: --days must be a non-negative integer (got: $RETENTION_DAYS)" >&2
  exit 1
fi

DIRS=(
  "$REPO_DIR/data/outputs"
  "$REPO_DIR/out"
  "$HOME/Desktop/CS Reports"
)

# File patterns to clean — keep `.gitkeep`, `.gitignore`, and anything else
# the repo intentionally tracks.
PATTERNS=("*.md" "*.json" "*.docx" "*.csv" "*.pdf" "*.xlsx")

mode="DRY RUN"
[ "$APPLY" = "1" ] && mode="DELETE"

echo "cleanup-data-outputs.sh — mode: $mode, retention: ${RETENTION_DAYS} days"
echo

total_count=0
total_bytes=0

for dir in "${DIRS[@]}"; do
  if [ ! -d "$dir" ]; then
    echo "  skipping (does not exist): $dir"
    continue
  fi

  found_count=0
  for pat in "${PATTERNS[@]}"; do
    while IFS= read -r -d '' f; do
      size=$(stat -f%z "$f" 2>/dev/null || stat -c%s "$f" 2>/dev/null || echo 0)
      total_bytes=$((total_bytes + size))
      found_count=$((found_count + 1))
      total_count=$((total_count + 1))
      if [ "$APPLY" = "1" ]; then
        rm -f "$f"
        printf '  removed:  %s\n' "${f#$HOME/}"
      else
        printf '  would-remove: %s\n' "${f#$HOME/}"
      fi
    done < <(find "$dir" -maxdepth 2 -type f -name "$pat" -mtime +"$RETENTION_DAYS" -print0 2>/dev/null)
  done

  if [ "$found_count" = "0" ]; then
    echo "  clean: $dir"
  fi
done

echo
human_bytes=$(awk -v b="$total_bytes" 'BEGIN { if (b<1024) print b" B"; else if (b<1048576) printf "%.1f KB", b/1024; else printf "%.1f MB", b/1048576 }')
if [ "$APPLY" = "1" ]; then
  echo "Done. Removed $total_count file(s), freed $human_bytes."
else
  echo "Dry run complete. Would remove $total_count file(s), freeing $human_bytes."
  echo "Run with --apply to actually delete."
fi
