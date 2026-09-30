#!/usr/bin/env node
import { readFile, stat, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { ClipLintError, LIMITS, VERSION, formatMarkdown, parseTranscript, reviewClip } from '../src/index.js';

const HELP = `ClipLint ${VERSION} — local source-context preflight

Usage:
  node bin/cliplint.js --transcript episode.srt --ranges 8:16,20:30 [options]
  node bin/cliplint.js --project review.json [options]

Options:
  --transcript PATH      SRT, WebVTT, or timed JSON file; '-' reads stdin
  --input-format TYPE    auto (default), srt, vtt, json
  --ranges START:END     Comma-separated ranges in seconds, in playback order
  --title TEXT          Draft title
  --copy TEXT           Draft social copy
  --copy-file PATH      Read draft copy from a local UTF-8 file
  --project PATH        JSON review input with embedded transcript, ranges, title, copy
  --context SECONDS     Nearby omitted context window (0–60; default 12)
  --format TYPE         json (default) or markdown
  --output PATH         Save report; refuses an existing file unless --force
  --force               Permit overwriting --output
  --fail-on SEVERITY    Exit 1 for info/low/medium/high or higher
  --help                Show help
  --version             Show version

Exit codes: 0 = review ran; 1 = requested signal threshold; 2 = invalid input/I/O.
No network, telemetry, model call, credentials, truth verdict, or publishing.
`;

async function readLimited(path, maxCharacters) {
  const maxBytes = maxCharacters * 4;
  let text;
  if (path === '-') {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of process.stdin) {
      bytes += chunk.length;
      if (bytes > maxBytes) throw new ClipLintError('INPUT_LIMIT', 'Standard input exceeds the input byte limit.');
      chunks.push(chunk);
    }
    text = Buffer.concat(chunks).toString('utf8');
  } else {
    const info = await stat(path);
    if (!info.isFile()) throw new ClipLintError('INVALID_FILE', 'Input path must be a regular file.');
    if (info.size > maxBytes) throw new ClipLintError('INPUT_LIMIT', 'Input file exceeds the byte limit.');
    text = await readFile(path, 'utf8');
  }
  if (text.length > maxCharacters) throw new ClipLintError('INPUT_LIMIT', 'Input exceeds the character limit.');
  return text;
}

export async function main(argv = process.argv.slice(2)) {
  const valued = new Set(['transcript', 'input-format', 'ranges', 'title', 'copy', 'copy-file', 'project', 'context', 'format', 'output', 'fail-on']);
  const switches = new Set(['help', 'version', 'force']);
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const name = argv[i].replace(/^--/, '');
    if (!argv[i].startsWith('--') || (!valued.has(name) && !switches.has(name))) throw new ClipLintError('INVALID_ARGUMENT', `Unknown argument: ${argv[i]}`);
    if (Object.hasOwn(options, name)) throw new ClipLintError('INVALID_ARGUMENT', `Duplicate option: --${name}`);
    if (switches.has(name)) options[name] = true;
    else {
      if (argv[i + 1] === undefined || argv[i + 1].startsWith('--')) throw new ClipLintError('INVALID_ARGUMENT', `--${name} requires a value.`);
      options[name] = argv[++i];
    }
  }
  if (options.help) { process.stdout.write(HELP); return 0; }
  if (options.version) { process.stdout.write(`${VERSION}\n`); return 0; }
  if (!argv.length) { process.stdout.write(HELP); return 2; }
  const outputFormat = options.format || 'json';
  if (!['json', 'markdown'].includes(outputFormat)) throw new ClipLintError('INVALID_ARGUMENT', '--format must be json or markdown.');
  const ranks = { info: 0, low: 1, medium: 2, high: 3 };
  if (options['fail-on'] && !Object.hasOwn(ranks, options['fail-on'])) throw new ClipLintError('INVALID_ARGUMENT', '--fail-on must be info, low, medium, or high.');
  if (options.force && !options.output) throw new ClipLintError('INVALID_ARGUMENT', '--force requires --output.');
  let input;
  if (options.project) {
    if (['transcript', 'ranges', 'input-format', 'title', 'copy', 'copy-file', 'context'].some(key => Object.hasOwn(options, key))) throw new ClipLintError('INVALID_ARGUMENT', '--project cannot be combined with content-input options. Edit the project JSON instead.');
    const text = await readLimited(options.project, LIMITS.transcriptCharacters * 2);
    try { input = JSON.parse(text); } catch { throw new ClipLintError('INVALID_JSON', 'Project is not valid JSON.'); }
  } else {
    if (!options.transcript || !options.ranges) throw new ClipLintError('INVALID_ARGUMENT', 'Provide --transcript and --ranges, or --project.');
    if (options.copy !== undefined && options['copy-file']) throw new ClipLintError('INVALID_ARGUMENT', 'Use either --copy or --copy-file, not both.');
    if (options.transcript === '-' && options['copy-file'] === '-') throw new ClipLintError('INVALID_ARGUMENT', 'Only one input may read stdin.');
    const transcript = parseTranscript(await readLimited(options.transcript, LIMITS.transcriptCharacters), { format: options['input-format'] || 'auto' });
    const ranges = options.ranges.split(',').map(value => {
      const pair = value.trim().match(/^(-?\d+(?:\.\d+)?):(-?\d+(?:\.\d+)?)$/);
      if (!pair) throw new ClipLintError('INVALID_ARGUMENT', '--ranges uses START:END seconds, for example 8:16,20:30.');
      return { start: Number(pair[1]), end: Number(pair[2]) };
    });
    input = { transcript, ranges, title: options.title || '', copy: options['copy-file'] ? await readLimited(options['copy-file'], LIMITS.draftCharacters) : options.copy || '', contextWindowSeconds: options.context === undefined ? 12 : Number(options.context) };
  }
  const report = reviewClip(input);
  const output = outputFormat === 'json' ? `${JSON.stringify(report, null, 2)}\n` : formatMarkdown(report);
  if (options.output) await writeFile(options.output, output, { encoding: 'utf8', flag: options.force ? 'w' : 'wx' });
  else process.stdout.write(output);
  if (report.status === 'invalid-input') return 2;
  return options['fail-on'] && report.issues.some(issue => ranks[issue.severity] >= ranks[options['fail-on']]) ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.exitCode = await main(); }
  catch (error) {
    const code = error instanceof ClipLintError ? error.code : error.code || 'IO_ERROR';
    // No stack, file contents, environment values, or credentials are printed.
    process.stderr.write(`${JSON.stringify({ error: { code, message: error.message } })}\n`);
    process.exitCode = 2;
  }
}
