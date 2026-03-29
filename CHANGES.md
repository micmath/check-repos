# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-03-29

### Fixed

- Porcelain filter now extracts filename (everything after the first space) before filtering `.DS_Store`/`.lfs` — previously checked entire `XY PATH` line, causing false positives on paths like `src/my-ds-store-utils.js`
- Git log commands now use array argv syntax instead of shell string format — fixes incorrect argument splitting where `"%h %s"` was being passed as separate argv elements instead of a single format string
- `error.stderr` reference removed from `execSync` catch blocks — `execSync` does not expose stderr as a separate property, so the conditional was dead code

### Changed

- `isGitRepo()` now uses a single `statSync` call with try/catch instead of `existsSync` + two `statSync` calls — eliminates a TOCTOU race window
- `IGNORED` set hoisted from `walk()` to module scope — avoids recreating the Set on every recursive call
- "No git repositories found" message updated to "No repositories with uncommitted or unpushed changes found" to accurately reflect when repos exist but are clean

## [1.0.0] - 2026-03-29

### Added

- `#!/usr/bin/env node` shebang to `src/check-repos.js` for CLI executability
- `bin` field to `package.json` enabling `npm link` to expose `check-repos` as a global CLI command
- Installation and CLI usage documentation to README
- JSDoc comments to all functions in `check-repos.js`
- Export map to `check-repos.js` enabling unit testing of internal functions (`showHelp`, `isGitRepo`, `is_valid_git_repo`, `checkRepo`, `checkReposInDirectory`)

### Changed

- Use `node:` protocol for Node.js core module imports (`fs`, `path`, `child_process`)
- Use block bodies for `forEach` callbacks to eliminate implicit returns (`useIterableCallbackReturn`)

### Fixed

- Resolved `useNodejsImportProtocol` lint errors (3 instances)
- Resolved `useIterableCallbackReturn` lint errors (2 instances)

### Changed (tests)

- `check-repos.test.js` now imports and tests the actual module functions instead of duplicating them
- `check-repos.test.js` shared helpers: extracted `captureLog()` and `initTestRepo()` to eliminate repeated boilerplate
- Fixed latent bug: `.DS_Store` and `.lfs` filter tests now create an initial commit before testing uncommitted change filtering (without this, `git status --porcelain` returns nothing in a brand-new repo with no commits, causing false-positive test failures)
- Removed decorative section-header comments and noise comments from test file
