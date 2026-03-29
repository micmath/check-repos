#!/usr/bin/env node
/**
 * Recursively scan directories for git repositories and report those with
 * uncommitted or unpushed changes.
 * @module check-repos
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

/** @type {import('child_process').ExecSyncOptions} */
const EXEC_OPTS = { stdio: ['pipe', 'pipe', 'pipe'] };

/**
 * Print usage information to stdout.
 */
function showHelp() {
  const name = path.basename(process.argv[1]);
  console.log(
    `
Usage: node ${name} [OPTIONS] [ROOT_DIR]

Recursively scan for git repositories and check for uncommitted or unpushed changes.

OPTIONS:
    -h              Show this help message
    -v              Verbose output (show changed files and unpushed commits)
    ROOT_DIR        Directory to scan (default: current directory)

EXAMPLES:
    node ${name} ~/projects
    node ${name} -v .
    node ${name} -v ~/work/all-repos
  `.trim(),
  );
}

/**
 * Check whether a directory contains a `.git` file or directory, indicating
 * the presence of a git repository (standard or bare).
 *
 * @param {string} dir - Absolute or relative path to the directory to check.
 * @returns {boolean} True if a `.git` entry exists (as directory or file).
 */
function isGitRepo(dir) {
  const gitPath = path.join(dir, '.git');
  if (fs.existsSync(gitPath)) {
    if (fs.statSync(gitPath).isDirectory()) {
      return true;
    }
    if (fs.statSync(gitPath).isFile()) {
      return true;
    }
  }
  return false;
}

/**
 * Verify that a path is a valid git repository by running `git rev-parse --git-dir`.
 * This distinguishes real repos from directories that merely contain a `.git` entry
 * (e.g. an incomplete or corrupted `.git`).
 *
 * @param {string} repoPath - Absolute or relative path to a potential git repo.
 * @returns {boolean} True if `git rev-parse --git-dir` succeeds.
 */
function is_valid_git_repo(repoPath) {
  try {
    execSync('git rev-parse --git-dir', { cwd: repoPath, ...EXEC_OPTS });
    return true;
  } catch {
    return false;
  }
}

/**
 * Inspect a single git repository for uncommitted or unpushed changes and
 * print a summary to stdout.
 *
 * - Uncommitted changes are detected via `git status --porcelain`.
 * - Unpushed commits are detected via `git log @{u}..HEAD`, falling back to
 *   `git log origin/<branch>..HEAD` if no upstream is configured.
 * - `.DS_Store` and `.lfs` entries are filtered from all output.
 *
 * @param {string} repoPath - Absolute or relative path to the repository.
 * @param {boolean} verbose - Include per-file/per-commit detail in output.
 */
function checkRepo(repoPath, verbose) {
  try {
    let branch;
    try {
      branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: repoPath,
        ...EXEC_OPTS,
      })
        .toString()
        .trim();
    } catch {
      // Repo exists but has no commits yet — nothing to check.
      console.log(`${repoPath} (no commits yet)`);
      return;
    }

    const statusOutput = execSync('git status --porcelain', {
      cwd: repoPath,
      ...EXEC_OPTS,
    });

    const uncommitted = statusOutput
      .toString()
      .split('\n')
      .filter(line => line && !line.trim().includes('.DS_Store'))
      .filter(line => !line.includes('.lfs'))
      .join('\n');

    let unpushed = '';
    try {
      unpushed = execSync('git log @{u}..HEAD --pretty=format:"%h %s"', {
        cwd: repoPath,
        ...EXEC_OPTS,
      })
        .toString()
        .trim();
    } catch {
      try {
        unpushed = execSync(
          `git log origin/${branch}..HEAD --pretty=format:"%h %s"`,
          { cwd: repoPath, ...EXEC_OPTS },
        )
          .toString()
          .trim();
      } catch {
        // No upstream configured — skip unpushed check.
      }
    }

    if (uncommitted || unpushed) {
      const flags = [
        uncommitted ? 'uncommitted changes' : null,
        unpushed ? 'unpushed commits' : null,
      ]
        .filter(Boolean)
        .join(', ');

      console.log(`${repoPath} (${branch}) — ${flags}`);

      if (verbose) {
        if (uncommitted) {
          console.log('  Uncommitted changes:');
          uncommitted
            .split('\n')
            .filter(line => line && !line.includes('.DS_Store'))
            .forEach(line => {
              console.log(`    ${line}`);
            });
        }
        if (unpushed) {
          console.log('  Unpushed commits:');
          unpushed
            .split('\n')
            .filter(line => line && !line.includes('.DS_Store'))
            .forEach(line => {
              console.log(`    ${line}`);
            });
        }
      }

      console.log('');
    }
  } catch (error) {
    console.error(
      `Error checking ${repoPath}: ${error.message} ${error.stderr ? `(${error.stderr})` : ''}`,
    );
  }
}

/**
 * Recursively walk a directory tree and check each git repository found for
 * uncommitted or unpushed changes.
 *
 * Directories `node_modules`, `dist`, `build`, `.venv`, `venv`, `__pycache__`,
 * `vendor`, `.DS_Store`, and `.git` are skipped. Bare repositories (`.git` as a
 * file) are also detected and checked.
 *
 * @param {string} dir - Root directory to begin scanning.
 * @param {boolean} verbose - Pass through to {@link checkRepo} for per-file detail.
 */
function checkReposInDirectory(dir, verbose) {
  let gitFound = false;

  function walk(currentDir) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir);
    } catch (error) {
      console.error(
        `Error reading directory ${currentDir}: ${error.message} ${error.stderr ? `(${error.stderr})` : ''}`,
      );
      return;
    }

    const IGNORED = new Set([
      'node_modules',
      'dist',
      'build',
      '.venv',
      'venv',
      '__pycache__',
      'vendor',
      '.DS_Store',
      '.git',
    ]);

    for (const entry of entries) {
      if (IGNORED.has(entry)) continue;

      const fullPath = path.join(currentDir, entry);
      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        continue;
      }

      if (!stat.isDirectory()) continue;

      if (isGitRepo(fullPath)) {
        if (is_valid_git_repo(fullPath)) {
          gitFound = true;
          checkRepo(fullPath, verbose);
        } else {
          walk(fullPath);
        }
      } else {
        walk(fullPath);
      }
    }
  }

  walk(dir);

  if (!gitFound) {
    console.log(`No git repositories found in ${dir}`);
  }
}

/**
 * Entry point: parse CLI arguments and delegate to {@link checkReposInDirectory}.
 */
function main() {
  const args = process.argv.slice(2);
  let verbose = false;
  let rootDir = '.';

  for (const arg of args) {
    if (arg === '-h') {
      showHelp();
      process.exit(0);
    } else if (arg === '-v') {
      verbose = true;
    } else if (arg.startsWith('-')) {
      console.error(`Unknown option: ${arg}`);
      showHelp();
      process.exit(1);
    } else {
      rootDir = arg;
    }
  }

  if (!fs.existsSync(rootDir)) {
    console.error(`Error: Directory not found: ${rootDir}`);
    process.exit(1);
  }

  checkReposInDirectory(rootDir, verbose);
}

module.exports = {
  main,
  showHelp,
  isGitRepo,
  is_valid_git_repo,
  checkRepo,
  checkReposInDirectory,
};
if (require.main === module) {
  main();
}
