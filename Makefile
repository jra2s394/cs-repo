.PHONY: test test-hooks test-lib test-cov lint install-dev

# Run the full test suite
test:
	python3 -m pytest

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

# Basic lint (no external linter required)
lint:
	python3 -m py_compile hooks/*.py lib/report_charts.py && echo "Syntax OK"
