.PHONY: test test-hooks test-lib test-js test-cov lint install-dev check-deps

# Verify pytest is installed; if not, point the user at install-dev.
check-deps:
	@python3 -c "import pytest" 2>/dev/null || { \
	  echo "✗ pytest is not installed. Run 'make install-dev' first."; exit 1; }

# Run the full test suite (Python + JS)
test: check-deps
	python3 -m pytest
	node tests/js/test_csv_export.js

# Run only hook tests
test-hooks:
	python3 -m pytest tests/hooks/ -v

# Run only lib tests
test-lib:
	python3 -m pytest tests/lib/ -v

# Run with coverage report
test-cov:
	python3 -m pytest --cov=hooks --cov=lib --cov-report=term-missing

# Install dev dependencies
install-dev:
	pip install -r requirements-dev.txt

# Run only JS tests
test-js:
	node tests/js/test_csv_export.js

# Basic lint (no external linter required)
lint:
	python3 -m py_compile hooks/*.py lib/report_charts.py && echo "Syntax OK"
