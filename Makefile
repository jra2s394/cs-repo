.PHONY: test test-hooks test-lib test-js test-cov lint lint-py lint-js typecheck install-dev check-deps

# Verify pytest is installed; if not, point the user at install-dev.
check-deps:
	@python3 -c "import pytest" 2>/dev/null || { \
	  echo "✗ pytest is not installed. Run 'make install-dev' first."; exit 1; }

# Run the full test suite (Python + JS)
test: check-deps
	python3 -m pytest
	$(MAKE) test-js

# Run only hook tests
test-hooks:
	python3 -m pytest tests/hooks/ -v

# Run only lib tests
test-lib:
	python3 -m pytest tests/lib/ -v

# Run with coverage report. --cov-fail-under matches CI; see test.yml comment.
test-cov:
	python3 -m pytest --cov=hooks --cov=lib --cov-report=term-missing --cov-fail-under=85

# Install dev dependencies
install-dev:
	pip install -r requirements-dev.txt

# Run all JS tests
test-js:
	node tests/js/test_csv_export.js
	node tests/js/test_report_theme.js
	node tests/js/test_data_loader.js
	node tests/js/test_copy_to_desktop.js
	node tests/js/test_reports_smoke.js

# Lint: ruff on Python + biome on JS
lint:
	$(MAKE) lint-py
	$(MAKE) lint-js

# Run ruff on hooks/, lib/, tests/
lint-py:
	python3 -m ruff check

# Run biome on all JS (lib/, reports/, tests/js/)
lint-js:
	npx --no-install biome check

# Type-check Python (hooks/ + lib/) with mypy. Lenient baseline — see pyproject.toml.
typecheck:
	python3 -m mypy
