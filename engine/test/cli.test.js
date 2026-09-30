import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const run = (args, input) => spawnSync(process.execPath, ['bin/cliplint.js', ...args], { cwd: root, encoding: 'utf8', input });
const base = ['--transcript', 'examples/synthetic-interview.srt', '--ranges', '8:16', '--title', 'Costs fell 80%'];
test('CLI emits structured JSON and Markdown', () => {
  const json = run(base);
  assert.equal(json.status, 0, json.stderr);
  assert.equal(JSON.parse(json.stdout).engine.name, 'ClipLint');
  assert.match(run([...base, '--format', 'markdown']).stdout, /# ClipLint/);
});
test('CLI can review embedded JSON project and stdin transcript', () => {
  assert.equal(run(['--project', 'examples/synthetic-review.json']).status, 0);
  const result = run(['--transcript', '-', '--ranges', '0:2'], '[{"start":0,"end":2,"text":"A neutral statement."}]');
  assert.equal(result.status, 0, result.stderr);
});
test('CLI threshold exit code is opt-in, invalid range exits two', () => {
  assert.equal(run([...base, '--fail-on', 'medium']).status, 1);
  assert.equal(run(['--transcript', 'examples/synthetic-interview.srt', '--ranges', '9:2']).status, 2);
});
test('CLI rejects unknown flags, duplicate arguments, conflicting inputs and bad files', () => {
  for (const args of [['--unknown'], ['--format', 'xml'], ['--title', 'a', '--title', 'b'], ['--project', 'examples/synthetic-review.json', '--title', 'x'], ['--transcript', 'missing-file', '--ranges', '0:4'], ['--force']]) {
    const result = run(args);
    assert.equal(result.status, 2);
    assert.ok(JSON.parse(result.stderr).error.code);
  }
});
test('CLI refuses output overwrite by default; explicit force is honored', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cliplint-test-'));
  try {
    const output = join(dir, 'report.json');
    writeFileSync(output, 'keep');
    assert.equal(run([...base, '--output', output]).status, 2);
    assert.equal(readFileSync(output, 'utf8'), 'keep');
    assert.equal(run([...base, '--output', output, '--force']).status, 0);
    assert.equal(JSON.parse(readFileSync(output, 'utf8')).engine.name, 'ClipLint');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('CLI help/version work without loading files', () => {
  assert.equal(run(['--help']).status, 0);
  assert.match(run(['--version']).stdout, /0\.1\.0/);
});
