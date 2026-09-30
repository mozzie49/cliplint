import test from 'node:test';
import assert from 'node:assert/strict';
import { ClipLintError, LIMITS, cleanSubtitleText, formatTimestamp, parseTimestamp, parseTranscript } from '../src/index.js';

test('parses SRT with BOM, CRLF, identifiers and multiline cues', () => {
  const parsed = parseTranscript('\uFEFF1\r\n00:00:01,000 --> 00:00:03,250\r\nHello <i>world</i>.\r\nSecond line.\r\n\r\n2\r\n00:00:03,250 --> 00:00:04,000\r\nGoodbye.');
  assert.equal(parsed.format, 'srt');
  assert.deepEqual(parsed.cues[0], { id: 'cue-1', start: 1, end: 3.25, text: 'Hello world. Second line.' });
});
test('parses WebVTT voice metadata, settings, cue names and NOTE blocks', () => {
  const result = parseTranscript('WEBVTT\n\nNOTE example\ncomment\n\nSTYLE\n::cue { color: red; }\n\nfirst\n00:01.000 --> 00:03.000 align:start\n<v Ada><c.green>Hello &amp; welcome.</c></v>\n');
  assert.equal(result.format, 'vtt');
  assert.equal(result.cues[0].speaker, 'Ada');
  assert.equal(result.cues[0].text, 'Hello & welcome.');
});
test('accepts JSON cues and segment envelopes without executing metadata', () => {
  const result = parseTranscript({ video_id: 'synthetic', language: 'en', segments: [{ start: 0, end: 2, text: 'A cue.', words: [{ start: 0, end: 1, word: 'A' }] }] });
  assert.equal(result.cues.length, 1);
  assert.equal(result.cues[0].words, undefined);
  assert.equal(parseTranscript(JSON.stringify(result.cues)).format, 'json');
});
test('sorts unordered cues with warning and preserves original positions', () => {
  const result = parseTranscript([{ start: 4, end: 5, text: 'Later.' }, { start: 0, end: 2, text: 'Earlier.' }]);
  assert.equal(result.cues[0].id, 'cue-2');
  assert.ok(result.warnings.some(item => item.code === 'CUES_SORTED'));
});
test('warns on overlaps including nested cues', () => {
  const result = parseTranscript([{ start: 0, end: 10, text: 'Long.' }, { start: 1, end: 2, text: 'Short.' }, { start: 3, end: 4, text: 'Nested.' }]);
  assert.match(result.warnings[0].message, /2 cue/);
});
test('normalizes duplicate source IDs without losing provenance', () => {
  const result = parseTranscript([{ id: 'same', start: 0, end: 2, text: 'A.' }, { id: 'same', start: 2, end: 4, text: 'B.' }]);
  assert.equal(new Set(result.cues.map(c => c.id)).size, 2);
  assert.equal(result.cues[0].sourceId, 'same');
  assert.ok(result.warnings.some(w => w.code === 'DUPLICATE_SOURCE_ID'));
});
test('timestamps round-trip milliseconds and carry rounding', () => {
  assert.equal(parseTimestamp('01:02:03,045'), 3723.045);
  assert.equal(parseTimestamp('02:03.4'), 123.4);
  assert.equal(parseTimestamp('3.5'), 3.5);
  assert.equal(formatTimestamp(59.9996), '00:01:00.000');
});
for (const input of ['01:99:00.000', '-1', Infinity, NaN, null, 'NaN', '00:00:01.0000']) {
  test(`rejects invalid timestamp ${String(input)}`, () => assert.throws(() => parseTimestamp(input), ClipLintError));
}
for (const [name, input] of [
  ['empty', ''], ['untimed prose', 'This has no timestamps.'], ['bad JSON', '[{'],
  ['reversed cue', [{ start: 4, end: 2, text: 'Wrong.' }]],
  ['empty cue', [{ start: 0, end: 2, text: '   ' }]],
  ['invalid cue text', [{ start: 0, end: 2, text: {} }]],
  ['missing cue gap', '00:00:00,000 --> 00:00:02,000\nA\n00:00:02,000 --> 00:00:04,000\nB'],
]) test(`rejects ${name}`, () => assert.throws(() => parseTranscript(input), ClipLintError));
test('rejects over-limit text, cues and individual cue size', () => {
  assert.throws(() => parseTranscript('x'.repeat(LIMITS.transcriptCharacters + 1)), { code: 'INPUT_LIMIT' });
  assert.throws(() => parseTranscript(Array.from({ length: LIMITS.cues + 1 }, () => ({ start: 0, end: 1, text: 'a' }))), { code: 'INPUT_LIMIT' });
  assert.throws(() => parseTranscript([{ start: 0, end: 1, text: 'x'.repeat(LIMITS.cueCharacters + 1) }]), { code: 'INPUT_LIMIT' });
});
test('decodes entities without treating unknown angle-bracket text as markup', () => {
  assert.equal(cleanSubtitleText('2 < 3 &amp; &#x1F600; <invented>'), '2 < 3 & 😀 <invented>');
});
