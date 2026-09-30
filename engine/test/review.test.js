import test from 'node:test';
import assert from 'node:assert/strict';
import { LIMITS, formatMarkdown, parseTranscript, reviewClip } from '../src/index.js';
import { extractQuantities, quoteMatches } from '../src/text.js';

const cue = (text, start = 0, end = 4, speaker) => ({ start, end, text, ...(speaker ? { speaker } : {}) });
const review = (transcript, title = '', extras = {}) => reviewClip({ transcript, ranges: [{ start: 0, end: Math.max(...transcript.map(c => c.end)) }], title, ...extras });
const has = (report, ruleId) => report.issues.some(i => i.ruleId === ruleId);

test('complete neutral clip has no signals and never claims to pass', () => {
  const result = review([cue('We discuss three ways to plan an interview.')], 'Planning an interview');
  assert.equal(result.status, 'no-signals');
  assert.equal(result.semanticAssessment.status, 'unassessed');
  assert.match(result.limitations.join(' '), /not evidence/);
});
for (const range of [{ start: 4, end: 2 }, { start: -1, end: 3 }, { start: 0, end: 5 }, { start: NaN, end: 2 }, { start: 1, end: 1 }, null]) {
  test(`invalid range is structured and prevents semantic review ${JSON.stringify(range)}`, () => {
    const result = review([cue('Source.')], '', { ranges: [range] });
    assert.equal(result.status, 'invalid-input');
    assert.ok(has(result, 'RANGE_INVALID'));
    assert.equal(result.coverage.find(c => c.ruleId === 'QUOTE_NOT_FOUND').status, 'skipped');
  });
}
test('out-of-range validation is based on transcript extent, never video length', () => {
  const r = review([cue('Source.')], '', { ranges: [{ start: 0, end: 8 }] });
  assert.match(r.issues[0].uncertainty, /not the original media/);
});
test('empty interval abstains without quote or numeric speculation', () => {
  const r = review([cue('Start.', 0, 2), cue('End.', 8, 10)], '“Invented quotation here”', { ranges: [{ start: 3, end: 7 }] });
  assert.ok(has(r, 'RANGE_EMPTY'));
  assert.ok(!has(r, 'QUOTE_NOT_FOUND'));
});
test('half-open intervals do not include adjacent endpoint cues', () => {
  const r = review([cue('First.', 0, 4), cue('Second.', 4, 8)], '', { ranges: [{ start: 0, end: 4 }] });
  assert.equal(r.summary.selectedCueCount, 1);
  assert.equal(r.selection.text, 'First.');
});
test('overlapping ranges are a deterministic repetition signal', () => {
  const r = review([cue('Source.', 0, 10)], '', { ranges: [{ start: 0, end: 8 }, { start: 4, end: 10 }] });
  assert.ok(has(r, 'RANGE_OVERLAP'));
});
test('partial cues never certify retained quotation or quantity', () => {
  const r = review([cue('We cut costs by 20% after the full trial.', 0, 10)], '“We cut costs by 20% after the full trial.”', { ranges: [{ start: 4, end: 8 }] });
  assert.ok(has(r, 'PARTIAL_CUE'));
  assert.equal(r.selection.timingPrecision, 'boundary-uncertain');
  assert.ok(r.warnings.some(w => w.code === 'QUOTE_BOUNDARY_UNCERTAIN'));
  assert.ok(!has(r, 'QUOTE_OUTSIDE_CLIP'));
});
test('omitted linked English qualifier cites both sides', () => {
  const r = review([cue('The pilot cut support costs.', 0, 4), cue('But support costs depend on simple questions.', 4, 8)], '', { ranges: [{ start: 0, end: 4 }] });
  const issue = r.issues.find(i => i.ruleId === 'OMITTED_QUALIFIER');
  assert.equal(issue.assessment, 'heuristic');
  assert.deepEqual(issue.evidence.map(e => e.role), ['omitted', 'selected']);
});
test('omitted Chinese conditional and dangling opening are review prompts', () => {
  const r = review([cue('如果只处理简单问题，成本可以降低。', 0, 4), cue('这样可以降低20%的客服成本。', 4, 8)], '', { ranges: [{ start: 4, end: 8 }] });
  assert.ok(has(r, 'OMITTED_QUALIFIER'));
  assert.ok(has(r, 'DANGLING_OPENING'));
});
test('lexicon-only hit unrelated to selected topic does not flag qualifier', () => {
  const r = review([cue('If rain continues, the train may stop.', 0, 4), cue('The lecture covers abstract sculpture.', 4, 8)], '', { ranges: [{ start: 4, end: 8 }] });
  assert.ok(!has(r, 'OMITTED_QUALIFIER'));
});
test('qualifier inference respects conflicting explicit speakers', () => {
  const r = review([cue('Costs fell in the pilot.', 0, 4, 'A'), cue('But our costs increased.', 4, 8, 'B')], '', { ranges: [{ start: 0, end: 4 }] });
  assert.ok(!has(r, 'OMITTED_QUALIFIER'));
});
test('zero context window disables nearby-reference heuristics', () => {
  const r = review([cue('The backup failed.', 0, 4), cue('It should not be used.', 4, 8)], '', { ranges: [{ start: 4, end: 8 }], contextWindowSeconds: 0 });
  assert.ok(!has(r, 'DANGLING_OPENING'));
});
test('plain edit discontinuity is info; omitted qualifier raises a review prompt', () => {
  const plain = review([cue('We introduce the topic.', 0, 4), cue('We take a water break.', 4, 8), cue('We describe the method.', 8, 12)], '', { ranges: [{ start: 0, end: 4 }, { start: 8, end: 12 }] });
  assert.equal(plain.issues.find(i => i.ruleId === 'STITCH_CONTEXT').severity, 'info');
  const scoped = review([cue('A method works.', 0, 4), cue('But only if we validate first.', 4, 8), cue('Then we can proceed.', 8, 12)], '', { ranges: [{ start: 0, end: 4 }, { start: 8, end: 12 }] });
  assert.equal(scoped.issues.find(i => i.ruleId === 'STITCH_CONTEXT').severity, 'medium');
});
test('reordered source is explicitly reviewed', () => {
  const r = review([cue('First.', 0, 4), cue('Second.', 4, 8)], '', { ranges: [{ start: 4, end: 8 }, { start: 0, end: 4 }] });
  assert.ok(has(r, 'STITCH_CONTEXT'));
});
for (const [source, draft] of [
  ['Costs fell by 20%.', 'Costs fell by 80%'],
  ['We enrolled 12 volunteers.', '21 volunteers enrolled'],
  ['A budget of $2 million.', 'A budget of $2 billion'],
  ['延迟只有80毫秒。', '延迟只有80秒'],
  ['我们服务三十万用户。', '我们服务三百万用户'],
  ['A change of 3 percentage points.', 'A change of 4 percentage points'],
]) test(`numeric mismatch: ${source}`, () => assert.ok(has(review([cue(source)], draft), 'NUMBER_MISMATCH')));
for (const [source, draft] of [
  ['We served 1,000 users.', 'We served 1 thousand users'],
  ['Latency was 1000 milliseconds.', 'Latency was 1 second'],
  ['它需要三十分钟。', '它需要0.5小时'],
  ['A gain of 20 percent.', 'A gain of 20%'],
]) test(`equivalent supported quantity: ${source}`, () => assert.ok(!has(review([cue(source)], draft), 'NUMBER_MISMATCH')));
test('percent and percentage point units are never silently equated', () => {
  const [a, b] = extractQuantities('3% and 3 percentage points');
  assert.notEqual(a.unit, b.unit);
});
test('different currency units do not silently match or invent FX conversions', () => {
  const r = review([cue('A cost of USD 20.')], 'A cost of EUR 20');
  assert.ok(!has(r, 'NUMBER_MISMATCH'));
  assert.ok(r.warnings.some(w => w.code === 'QUANTITY_ABSTENTION'));
});
test('bare numbered editorial lists abstain', () => {
  const r = review([cue('We discuss 2 examples.')], '5 lessons learned');
  assert.ok(!has(r, 'NUMBER_MISMATCH'));
});
test('standalone Chinese magnitude labels are units, not amounts', () => {
  assert.equal(extractQuantities('金额（万元）').length, 0);
  assert.equal(extractQuantities('五十万元')[0].value, 500000);
});
test('explicitly unclear source quantities abstain instead of picking an alternative', () => {
  const r = review([cue('成本是[听不清：十五/五十]万元。')], '成本五十万元');
  assert.ok(!has(r, 'NUMBER_MISMATCH'));
  assert.ok(r.warnings.some(w => w.code === 'SOURCE_QUANTITY_UNCERTAIN'));
  assert.equal(r.coverage.find(c => c.ruleId === 'NUMBER_MISMATCH').status, 'skipped');
});
test('quantity outside the cut links the omitted cue', () => {
  const r = review([cue('The first pilot saved 20%.', 0, 4), cue('The later pilot saved 30%.', 4, 8)], 'The pilot saved 30%', { ranges: [{ start: 0, end: 4 }] });
  assert.ok(has(r, 'NUMBER_OUTSIDE_CLIP'));
});
test('exact quotation survives harmless case and punctuation changes', () => assert.ok(!has(review([cue('We tested the idea carefully.')], '“we tested the idea carefully!”'), 'QUOTE_NOT_FOUND')));
test('missing quotation includes deterministic non-match with uncertainty', () => {
  const r = review([cue('We tested a small prototype.')], '“We proved it always works.”');
  assert.ok(has(r, 'QUOTE_NOT_FOUND'));
  assert.equal(r.issues[0].assessment, 'deterministic');
});
test('ordered ellipsis is allowed but omitted meaning is unassessed', () => {
  assert.equal(quoteMatches('We tested carefully, recorded every result, and released the patch.', 'We tested carefully … and released the patch.'), true);
  assert.equal(quoteMatches('We tested carefully, and released the patch.', 'released the patch … We tested carefully'), false);
});
test('quotation normalization cannot merge words or erase lexical hyphens', () => {
  assert.equal(quoteMatches('We are now here.', 'We are nowhere.'), false);
  assert.equal(quoteMatches('I will re-sign tomorrow.', 'I will resign tomorrow.'), false);
  assert.equal(quoteMatches('It was untested yesterday.', 'tested yesterday'), false);
});
test('quotation cannot merge explicit speakers', () => {
  const r = review([cue('We should stop now.', 0, 4, 'Maya'), cue('Then continue tomorrow.', 4, 8, 'Leo')], 'Maya: “We should stop now. Then continue tomorrow.”');
  assert.ok(has(r, 'QUOTE_NOT_FOUND'));
});
test('known name attribution compared only with explicit metadata', () => {
  const r = review([cue('We should stop now.', 0, 4, 'Maya'), cue('Continue with the next item.', 4, 8, 'Leo')], 'Leo: “We should stop now.”');
  assert.ok(has(r, 'QUOTE_ATTRIBUTION_MISMATCH'));
});
test('quotation outside selection is different from source non-match', () => {
  const r = review([cue('The first statement is complete.', 0, 4), cue('A different topic follows now.', 4, 8)], '“A different topic follows now.”', { ranges: [{ start: 0, end: 4 }] });
  assert.ok(has(r, 'QUOTE_OUTSIDE_CLIP'));
  assert.ok(!has(r, 'QUOTE_NOT_FOUND'));
});
test('no finding ever contains a certainty verdict or external action', () => {
  const r = review([cue('A 20% gain.')], 'An 80% gain');
  for (const issue of r.issues) {
    assert.ok(issue.uncertainty);
    assert.ok(['deterministic', 'heuristic'].includes(issue.assessment));
    assert.ok(Array.isArray(issue.evidence));
  }
});
test('report is deterministic and does not mutate project input', () => {
  const transcript = parseTranscript([cue('A 20% gain.')]);
  const input = { transcript, ranges: [{ start: 0, end: 4 }], title: 'An 80% gain' };
  const before = JSON.stringify(input);
  assert.deepEqual(reviewClip(input), reviewClip(input));
  assert.equal(JSON.stringify(input), before);
});
test('limits cover drafts, range counts, and invalid context windows', () => {
  assert.throws(() => review([cue('Source.')], 'x'.repeat(LIMITS.draftCharacters + 1)), { code: 'INPUT_LIMIT' });
  assert.throws(() => review([cue('Source.')], '', { ranges: Array(101).fill({ start: 0, end: 4 }) }), { code: 'INPUT_LIMIT' });
  assert.throws(() => review([cue('Source.')], '', { contextWindowSeconds: 61 }), { code: 'INVALID_OPTIONS' });
});
test('Markdown escapes injected HTML and contains coverage and limits', () => {
  const markdown = formatMarkdown(review([cue('Source text.')], '<script>alert(1)</script>'));
  assert.ok(!markdown.includes('<script>'));
  assert.match(markdown, /## Coverage/);
  assert.match(markdown, /unassessed/);
});
