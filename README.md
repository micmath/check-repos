# Git Repo Checker

A Node.js utility for scanning directories for git repositories with uncommitted or unpushed changes. No external dependencies — uses only Node.js built-ins.

## Installation

```bash
npm link
```

This makes `check-repos` available as a global CLI command.

## Usage

```bash
check-repos [-h] [-v] [ROOT_DIR]
```

### Options

- `-h` — Show help message
- `-v` — Verbose output (show changed files and unpushed commit messages)
- `ROOT_DIR` — Directory to scan (default: current directory)

### Examples

```bash
# Check all repos in current directory
check-repos .

# Verbose mode
check-repos -v .

# Check repos in a specific directory
check-repos ~/projects
```

You can also run it directly with Node:

```bash
node ./src/check-repos.js [-h] [-v] [ROOT_DIR]
```

## Running Tests

Tests use Node.js's built-in test runner (`node:test`). No external test framework or dependencies required.

```bash
node --test ./test/check-repos.test.js
```

For watch mode during development:

```bash
node --test --watch ./test/check-repos.test.js
```

## Notes

- Skips `node_modules`, `dist`, `build`, `.venv`, `venv`, `__pycache__`, `vendor`, `.git` directories
- Ignores `.DS_Store` and `.lfs` entries in output
- Reports repos with uncommitted changes or unpushed commits
