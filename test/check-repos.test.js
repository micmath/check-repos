const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');
const { test } = require('node:test');
const assert = require('node:assert');

const {
  main,
  isGitRepo,
  is_valid_git_repo,
  checkRepo,
  checkReposInDirectory,
} = require('../src/check-repos.js');

// --- Shared test helpers ---

function captureLog() {
  let output = '';
  const original = console.log;
  console.log = msg => {
    output += msg + '\n';
  };
  return {
    getOutput: () => output,
    restore() {
      console.log = original;
    },
  };
}

function initTestRepo(tmpDir) {
  execSync('git init', { cwd: tmpDir, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', {
    cwd: tmpDir,
    stdio: 'pipe',
  });
  execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'pipe' });
}

// --- isGitRepo tests ---

test('isGitRepo returns true when .git is a directory', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-'));
  fs.mkdirSync(path.join(tmpDir, '.git'));
  try {
    assert.strictEqual(isGitRepo(tmpDir), true);
  } finally {
    fs.rmSync(tmpDir, { recursive: true });
  }
});

test('isGitRepo returns true when .git is a file (bare repo)', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bare-'));
  fs.writeFileSync(
    path.join(tmpDir, '.git'),
    'gitdir: ' + path.join(tmpDir, 'objects'),
  );
  try {
    assert.strictEqual(isGitRepo(tmpDir), true);
  } finally {
    fs.rmSync(tmpDir, { recursive: true });
  }
});

test('isGitRepo returns false when .git does not exist', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nongit-'));
  try {
    assert.strictEqual(isGitRepo(tmpDir), false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true });
  }
});

// --- is_valid_git_repo tests ---

test('is_valid_git_repo returns true for a valid git repo', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'valid-'));
  execSync('git init', { cwd: tmpDir, stdio: 'pipe' });
  try {
    assert.strictEqual(is_valid_git_repo(tmpDir), true);
  } finally {
    fs.rmSync(tmpDir, { recursive: true });
  }
});

test('is_valid_git_repo returns false for an invalid git repo', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'invalid-'));
  fs.mkdirSync(path.join(tmpDir, '.git'));
  try {
    assert.strictEqual(is_valid_git_repo(tmpDir), false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true });
  }
});

test('is_valid_git_repo returns false for a non-existent path', () => {
  assert.strictEqual(is_valid_git_repo('/nonexistent/path'), false);
});

// --- checkRepo tests ---

test('checkRepo reports no commits yet', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-commits-'));
  execSync('git init', { cwd: tmpDir, stdio: 'pipe' });
  const { getOutput, restore } = captureLog();
  try {
    checkRepo(tmpDir, false);
    assert.match(getOutput(), /no commits yet/);
  } finally {
    restore();
    fs.rmSync(tmpDir, { recursive: true });
  }
});

test('checkRepo filters out .DS_Store from output', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsstore-repo-'));
  initTestRepo(tmpDir);
  fs.writeFileSync(path.join(tmpDir, '.DS_Store'), '');
  execSync('git add .', { cwd: tmpDir, stdio: 'pipe' });
  execSync('git commit -m "initial"', { cwd: tmpDir, stdio: 'pipe' });
  fs.writeFileSync(path.join(tmpDir, '.DS_Store'), 'x');
  const { getOutput, restore } = captureLog();
  try {
    checkRepo(tmpDir, false);
    assert.strictEqual(getOutput().trim(), '');
  } finally {
    restore();
    fs.rmSync(tmpDir, { recursive: true });
  }
});

test('checkRepo filters out .lfs from output', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lfs-repo-'));
  initTestRepo(tmpDir);
  fs.writeFileSync(path.join(tmpDir, 'file.lfs'), '');
  execSync('git add .', { cwd: tmpDir, stdio: 'pipe' });
  execSync('git commit -m "initial"', { cwd: tmpDir, stdio: 'pipe' });
  fs.writeFileSync(path.join(tmpDir, 'file.lfs'), 'modified');
  const { getOutput, restore } = captureLog();
  try {
    checkRepo(tmpDir, false);
    assert.strictEqual(getOutput().trim(), '');
  } finally {
    restore();
    fs.rmSync(tmpDir, { recursive: true });
  }
});

test('checkRepo reports uncommitted changes', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dirty-repo-'));
  initTestRepo(tmpDir);
  fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'content');
  execSync('git add .', { cwd: tmpDir, stdio: 'pipe' });
  execSync('git commit -m "initial"', { cwd: tmpDir, stdio: 'pipe' });
  fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'changed');
  const { getOutput, restore } = captureLog();
  try {
    checkRepo(tmpDir, false);
    assert.notStrictEqual(getOutput().trim(), '');
    assert.match(getOutput(), /uncommitted changes/);
  } finally {
    restore();
    fs.rmSync(tmpDir, { recursive: true });
  }
});

test('checkRepo shows verbose uncommitted file list', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verbose-repo-'));
  initTestRepo(tmpDir);
  fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'content');
  execSync('git add .', { cwd: tmpDir, stdio: 'pipe' });
  execSync('git commit -m "initial"', { cwd: tmpDir, stdio: 'pipe' });
  fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'changed');
  const { getOutput, restore } = captureLog();
  try {
    checkRepo(tmpDir, true);
    assert.match(getOutput(), /Uncommitted changes:/);
    assert.match(getOutput(), /file\.txt/);
  } finally {
    restore();
    fs.rmSync(tmpDir, { recursive: true });
  }
});

// --- checkReposInDirectory tests ---

test('checkReposInDirectory finds no repos in empty directory', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'empty-'));
  const { getOutput, restore } = captureLog();
  try {
    checkReposInDirectory(tmpDir, false);
    assert.match(getOutput(), /No git repositories found/);
  } finally {
    restore();
    fs.rmSync(tmpDir, { recursive: true });
  }
});

test('checkReposInDirectory skips node_modules', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nomodules-'));
  fs.mkdirSync(path.join(tmpDir, 'node_modules'));
  fs.mkdirSync(path.join(tmpDir, 'node_modules', '.git'));
  const { getOutput, restore } = captureLog();
  try {
    checkReposInDirectory(tmpDir, false);
    assert.match(getOutput(), /No git repositories found/);
  } finally {
    restore();
    fs.rmSync(tmpDir, { recursive: true });
  }
});

test('checkReposInDirectory finds repo at root and recurses into subdirs', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nested-'));
  execSync('git init', { cwd: tmpDir, stdio: 'pipe' });
  fs.mkdirSync(path.join(tmpDir, 'src'));
  const { getOutput, restore } = captureLog();
  try {
    checkReposInDirectory(tmpDir, false);
    assert.match(getOutput(), new RegExp(tmpDir));
    assert.match(getOutput(), /No git repositories found/);
  } finally {
    restore();
    fs.rmSync(tmpDir, { recursive: true });
  }
});

// --- main / argument parsing tests ---

test('-h calls showHelp and exits 0', () => {
  const originalArgv = process.argv;
  const originalExit = process.exit;
  process.argv = ['node', 'check-repos.js', '-h'];
  process.exit = () => {};
  try {
    main();
  } finally {
    process.argv = originalArgv;
    process.exit = originalExit;
  }
});

test('unknown option prints error and exits 1', () => {
  const originalArgv = process.argv;
  const originalExit = process.exit;
  const originalError = console.error;
  let exitCode;
  let errorOutput = '';
  process.argv = ['node', 'check-repos.js', '-x'];
  process.exit = code => {
    exitCode = code;
  };
  console.error = msg => {
    errorOutput += msg + '\n';
  };
  try {
    main();
    assert.strictEqual(exitCode, 1);
    assert.match(errorOutput, /Unknown option/);
  } finally {
    process.argv = originalArgv;
    process.exit = originalExit;
    console.error = originalError;
  }
});

test('missing directory prints error and exits 1', () => {
  const originalArgv = process.argv;
  const originalExit = process.exit;
  const originalError = console.error;
  let exitCode;
  let errorOutput = '';
  process.argv = ['node', 'check-repos.js', '/nonexistent/path'];
  process.exit = code => {
    exitCode = code;
  };
  console.error = msg => {
    errorOutput += msg + '\n';
  };
  try {
    main();
    assert.strictEqual(exitCode, 1);
    assert.match(errorOutput, /Directory not found/);
  } finally {
    process.argv = originalArgv;
    process.exit = originalExit;
    console.error = originalError;
  }
});
