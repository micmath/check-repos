# Changelog

All notable changes to this project will be documented in this file.

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
