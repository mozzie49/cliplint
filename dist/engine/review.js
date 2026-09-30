import { ClipLintError, LIMITS, RULES, SCHEMA_VERSION, VERSION } from './constants.js';
import { parseTranscript, parseTimestamp } from './transcript.js';
import { extractQuantities, extractQuotes, hasDanglingOpening, normalizeText, qualifierMarkers, quantityBase, quoteMatches, sharedAnchors, startsWithContinuation, startsWithContrast } from './text.js';

const EPSILON = 0.001;
const MAX_ISSUES = LIMITS.issues;
const evidence = (cue, role = 'source') => ({
  cueId: cue.id, start: cue.start, end: cue.end, text: cue.text.slice(0, 600), role,
  ...(cue.speaker ? { speaker: cue.speaker } : {}),
  ...(cue.sourceId ? { sourceId: cue.sourceId } : {}),
  ...(cue.text.length > 600 ? { truncated: true, originalTextLength: cue.text.length } : {}),
});
const intersects = (cue, range) => cue.start < range.end && cue.end > range.start;
const sameSpeaker = (a, b) => !a.speaker || !b.speaker || a.speaker === b.speaker;
const equalQuantity = (a, b) => {
  const left = quantityBase(a), right = quantityBase(b);
  return left.unit === right.unit && Math.abs(left.value - right.value) <= Math.max(1e-8, Math.abs(left.value) * 1e-10);
};

/** Review source context and copy using local rules. No semantic model is invoked. */
export function reviewClip(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ClipLintError('INVALID_INPUT', 'Review input must be an object.');
  const { transcript, ranges, title = '', copy = '', contextWindowSeconds = 12 } = input;
  if (typeof title !== 'string' || typeof copy !== 'string') throw new ClipLintError('INVALID_DRAFT', 'Title and copy must be strings.');
  if (title.length + copy.length > LIMITS.draftCharacters) throw new ClipLintError('INPUT_LIMIT', `Draft exceeds ${LIMITS.draftCharacters} characters.`);
  if (!Array.isArray(ranges) || ranges.length === 0) throw new ClipLintError('INVALID_RANGES', 'Provide at least one { start, end } range.');
  if (ranges.length > LIMITS.ranges) throw new ClipLintError('INPUT_LIMIT', `At most ${LIMITS.ranges} ranges are supported.`);
  if (!Number.isFinite(contextWindowSeconds) || contextWindowSeconds < 0 || contextWindowSeconds > LIMITS.contextWindowSeconds) throw new ClipLintError('INVALID_OPTIONS', `Context window must be 0–${LIMITS.contextWindowSeconds} seconds.`);
  const parsed = parseTranscript(transcript);
  const cues = parsed.cues;
  const warnings = [...parsed.warnings];
  const duration = Math.max(...cues.map(cue => cue.end));
  const issues = [];
  const coverage = RULES.map(rule => ({ ruleId: rule.id, status: 'checked' }));
  const skip = (ids, reason) => coverage.forEach(item => { if (ids.includes(item.ruleId)) Object.assign(item, { status: 'skipped', reason }); });
  const addIssue = issue => {
    if (issues.length >= MAX_ISSUES) return;
    issues.push({ id: `issue-${issues.length + 1}`, ...issue });
  };
  const validated = [];
  ranges.forEach((range, index) => {
    let start, end, reason;
    if (!range || typeof range !== 'object' || Array.isArray(range)) reason = 'Range must be an object with start and end times.';
    else {
      try { start = parseTimestamp(range.start); end = parseTimestamp(range.end); }
      catch { reason = 'Range times must be finite, non-negative seconds or valid subtitle timestamps.'; }
      if (!reason && end <= start) reason = 'Range end must be after its start.';
      if (!reason && end > duration + EPSILON) reason = `Range ends after the transcript's last cue (${duration} seconds). Media duration cannot be inferred beyond the transcript.`;
    }
    if (reason) {
      addIssue({ ruleId: 'RANGE_INVALID', assessment: 'deterministic', severity: 'high', confidence: 'high', title: 'Invalid source range', message: reason, rangeIndex: index, evidence: [], suggestion: 'Correct the source range and run the review again.', uncertainty: 'Bounds are checked against transcript coverage, not the original media file.' });
    } else validated.push({ start, end, index });
  });
  if (validated.length !== ranges.length) {
    skip(RULES.filter(rule => rule.id !== 'RANGE_INVALID').map(rule => rule.id), 'Fix all invalid ranges before content review; partial reviews can hide missing context.');
    return makeReport();
  }

  const segments = validated.map(range => ({ ...range, cues: cues.filter(cue => intersects(cue, range)) }));
  const selectedIds = new Set(segments.flatMap(segment => segment.cues.map(cue => cue.id)));
  const selectedCues = cues.filter(cue => selectedIds.has(cue.id));
  const fullySelectedIds = new Set(cues.filter(cue => segments.some(segment => cue.start >= segment.start - EPSILON && cue.end <= segment.end + EPSILON)).map(cue => cue.id));
  const boundaryUncertainIds = new Set([...selectedIds].filter(id => !fullySelectedIds.has(id)));
  const selectedText = selectedCues.map(cue => cue.text).join(' ');
  const selectedNormalized = normalizeText(selectedText);

  for (const segment of segments) {
    if (!segment.cues.length) {
      addIssue({ ruleId: 'RANGE_EMPTY', assessment: 'deterministic', severity: 'medium', confidence: 'high', title: 'No transcript in this range', message: 'No timed cue overlaps this selection. Speech and context cannot be reviewed.', rangeIndex: segment.index, evidence: [], suggestion: 'Check alignment or add a transcript for this section.', uncertainty: 'An empty transcript interval can be silence, music, missing subtitles, or misalignment.' });
      continue;
    }
    const cut = segment.cues.filter(cue => (cue.start < segment.start - EPSILON && cue.end > segment.start + EPSILON) || (cue.start < segment.end - EPSILON && cue.end > segment.end + EPSILON));
    if (cut.length) {
      addIssue({ ruleId: 'PARTIAL_CUE', assessment: 'deterministic', severity: 'info', confidence: 'high', title: 'Boundary cuts through a subtitle cue', message: 'This review includes the whole overlapping cue. The transcript has no word-level timing to show exactly which words remain in the clip.', rangeIndex: segment.index, evidence: cut.slice(0, 2).map(cue => evidence(cue, 'selected')), suggestion: 'Listen at each cut, or use word-level timestamps before publishing.', uncertainty: 'Copy checks may treat words outside the actual cut as selected.' });
    }
  }
  for (let i = 0; i < segments.length; i++) for (let j = i + 1; j < segments.length; j++) {
    const a = segments[i], b = segments[j];
    if (Math.min(a.end, b.end) - Math.max(a.start, b.start) > EPSILON) {
      addIssue({ ruleId: 'RANGE_OVERLAP', assessment: 'deterministic', severity: 'medium', confidence: 'high', title: 'Selected ranges overlap', message: `Ranges ${i + 1} and ${j + 1} repeat source time.`, rangeIndex: j, evidence: b.cues.slice(0, 1).map(cue => evidence(cue, 'selected')), suggestion: 'Confirm the repetition is intentional, or remove the overlap.', uncertainty: 'Repeated material can be an intentional editing choice.' });
    }
  }
  if (!selectedCues.length) {
    skip(['OMITTED_QUALIFIER', 'DANGLING_OPENING', 'STITCH_CONTEXT', 'NUMBER_MISMATCH', 'NUMBER_OUTSIDE_CLIP', 'QUOTE_NOT_FOUND', 'QUOTE_OUTSIDE_CLIP', 'QUOTE_ATTRIBUTION_MISMATCH'], 'No selected transcript text; content review abstained.');
    return makeReport(segments, selectedCues);
  }
  if (boundaryUncertainIds.size) {
    warnings.push({ code: 'BOUNDARY_UNCERTAIN', message: `${boundaryUncertainIds.size} overlapping cue(s) are only partially selected. Their wording is not confirmed to survive the cut; numeric and quote checks abstain where inclusion depends on it.` });
  }

  let contextCandidates = 0;
  for (const segment of segments) {
    if (!segment.cues.length) continue;
    const first = segment.cues[0], last = segment.cues.at(-1);
    const previous = cues.filter(cue => cue.end <= segment.start + EPSILON && !selectedIds.has(cue.id)).at(-1);
    const next = cues.find(cue => cue.start >= segment.end - EPSILON && !selectedIds.has(cue.id));
    if (contextWindowSeconds > 0 && previous && segment.start - previous.end <= contextWindowSeconds && hasDanglingOpening(first.text) && first.start >= segment.start - EPSILON) {
      addIssue({ ruleId: 'DANGLING_OPENING', assessment: 'heuristic', severity: 'low', confidence: 'low', title: 'Opening may depend on earlier context', message: 'The first selected cue begins with a reference or consequence cue that may rely on omitted speech.', rangeIndex: segment.index, evidence: [evidence(previous, 'omitted'), evidence(first, 'selected')], suggestion: 'Check whether the audience can identify the referent; extend the opening or add a faithful context label.', uncertainty: 'Pronouns and transitions can be fully understandable on their own. This rule does not resolve references.' });
    }
    for (const [neighbor, boundary, direction] of [[previous, first, 'before'], [next, last, 'after']]) {
      if (!neighbor || contextWindowSeconds === 0 || !sameSpeaker(neighbor, boundary)) continue;
      const gap = direction === 'before' ? segment.start - neighbor.end : neighbor.start - segment.end;
      if (gap < -EPSILON || gap > contextWindowSeconds) continue;
      contextCandidates++;
      const markers = qualifierMarkers(neighbor.text);
      if (!markers.length || selectedNormalized.includes(normalizeText(neighbor.text))) continue;
      const shared = sharedAnchors(neighbor.text, boundary.text);
      const clearContinuation = direction === 'after' ? startsWithContrast(neighbor.text) : startsWithContinuation(boundary.text) && markers.some(marker => marker.kind === 'condition');
      // A lexicon hit alone is not a signal: require lexical linkage or an adjacent contrast/conditional continuation.
      if (!shared.length && !(clearContinuation && gap <= 3)) continue;
      addIssue({ ruleId: 'OMITTED_QUALIFIER', assessment: 'heuristic', severity: 'medium', confidence: 'low', title: 'A nearby qualifier is outside the selection', message: `An omitted cue ${direction} this range contains ${[...new Set(markers.map(marker => marker.kind))].join('/')} language and may qualify the selected statement.`, rangeIndex: segment.index, markers: markers.map(marker => ({ kind: marker.kind, text: marker.text })), evidence: [evidence(neighbor, 'omitted'), evidence(boundary, 'selected')], suggestion: 'Listen to both cues together. Include the qualifier or adjust the copy if it changes the intended claim.', uncertainty: 'Adjacency, cue words, and shared terms do not establish logical scope. Speaker attribution is checked only when both cues explicitly provide it.' });
    }
  }
  if (contextWindowSeconds === 0) skip(['OMITTED_QUALIFIER', 'DANGLING_OPENING'], 'Nearby context review was disabled with a zero-second context window.');
  else if (!contextCandidates) skip(['OMITTED_QUALIFIER'], 'No eligible nearby omitted cues with compatible explicit speaker metadata.');

  for (let i = 1; i < segments.length; i++) {
    const previous = segments[i - 1], current = segments[i];
    if (Math.abs(current.start - previous.end) <= EPSILON || !previous.cues.length || !current.cues.length) continue;
    if (current.start < previous.end && current.start >= previous.start) continue; // Already covered by overlap.
    const reordered = current.start < previous.start;
    const omitted = reordered ? [] : cues.filter(cue => cue.start >= previous.end - EPSILON && cue.end <= current.start + EPSILON && !selectedIds.has(cue.id));
    if (!reordered && !omitted.length && current.start - previous.end < 2) continue;
    const cue = current.cues[0];
    const markers = omitted.flatMap(item => qualifierMarkers(item.text));
    const depends = hasDanglingOpening(cue.text) || startsWithContrast(cue.text);
    addIssue({ ruleId: 'STITCH_CONTEXT', assessment: markers.length || depends || reordered ? 'heuristic' : 'deterministic', severity: markers.length || depends || reordered ? 'medium' : 'info', confidence: markers.length || depends || reordered ? 'low' : 'high', title: reordered ? 'Ranges reorder the source conversation' : 'Selected ranges are discontinuous', message: reordered ? 'Playback order differs from source order. A transition may imply a relationship absent from the original conversation.' : `${(current.start - previous.end).toFixed(1)} seconds of source time separate these selected ranges${omitted.length ? `, including ${omitted.length} omitted cue(s)` : ''}.`, rangeIndex: current.index, evidence: [evidence(previous.cues.at(-1), 'selected'), ...omitted.slice(0, 2).map(item => evidence(item, 'omitted')), evidence(cue, 'selected')], suggestion: 'Listen across the edit and compare with the omitted source. Make the transition explicit when needed.', uncertainty: 'A discontinuity is an editing fact, not proof of altered meaning. This rule does not understand topic, tone, or causality.' });
  }
  if (segments.length < 2) skip(['STITCH_CONTEXT', 'RANGE_OVERLAP'], 'Only one range was selected.');

  const uncertainNumericCues = cues.filter(cue => /\[[^\]]*(?:inaudible|unclear|听不清|无法辨认)[^\]]*\]|\((?:inaudible|unclear)\)|（(?:听不清|无法辨认)）/i.test(cue.text));
  const uncertainNumericIds = new Set(uncertainNumericCues.map(cue => cue.id));
  if (uncertainNumericCues.length) warnings.push({ code: 'SOURCE_QUANTITY_UNCERTAIN', message: `${uncertainNumericCues.length} source cue(s) contain explicit transcription-uncertainty markers. Their quantities were excluded from numeric comparison.` });
  let sourceQuantities = cues.filter(cue => !uncertainNumericIds.has(cue.id)).flatMap(cue => extractQuantities(cue.text).filter(quantity => !['bare', 'ambiguous'].includes(quantity.unit)).map(quantity => ({ ...quantity, cue })));
  if (sourceQuantities.length > LIMITS.sourceQuantities) {
    sourceQuantities = [];
    warnings.push({ code: 'SOURCE_QUANTITY_LIMIT', message: `Source exceeds ${LIMITS.sourceQuantities} supported quantities. Numeric comparison abstained; split the transcript for review.` });
  }
  const selectedQuantities = sourceQuantities.filter(quantity => fullySelectedIds.has(quantity.cue.id));
  const boundaryQuantities = sourceQuantities.filter(quantity => boundaryUncertainIds.has(quantity.cue.id));
  let eligibleDraftQuantities = 0;
  let ignoredQuantities = 0;
  let comparedQuantities = 0;
  let draftQuantityCandidates = 0;
  for (const [draftField, text] of [['title', title], ['copy', copy]]) {
    const seen = new Set();
    for (const quantity of extractQuantities(text)) {
      draftQuantityCandidates++;
      if (draftQuantityCandidates > LIMITS.draftQuantityCandidates) { ignoredQuantities++; continue; }
      if (quantity.unit === 'bare' || quantity.unit === 'ambiguous') { ignoredQuantities++; continue; }
      const key = `${quantity.value}|${quantity.unit}`;
      if (seen.has(key)) continue;
      seen.add(key);
      eligibleDraftQuantities++;
      if (selectedQuantities.some(candidate => equalQuantity(quantity, candidate))) { comparedQuantities++; continue; }
      if (boundaryQuantities.some(candidate => equalQuantity(quantity, candidate))) { ignoredQuantities++; continue; }
      const outsideMatch = sourceQuantities.filter(candidate => !selectedIds.has(candidate.cue.id) && equalQuantity(quantity, candidate));
      if (outsideMatch.length) {
        comparedQuantities++;
        addIssue({ ruleId: 'NUMBER_OUTSIDE_CLIP', assessment: 'heuristic', severity: 'medium', confidence: 'medium', title: 'Draft quantity appears outside the clip', message: `“${quantity.raw}” appears in the transcript, but not in any selected cue.`, draftField, draftSpan: { start: quantity.index, text: quantity.raw }, evidence: outsideMatch.slice(0, 3).map(candidate => evidence(candidate.cue, 'omitted')), suggestion: 'Check whether the copy refers to omitted context. Include the relevant passage or revise the quantity.', uncertainty: 'Equal numeric values and units do not prove the same referent. Partial cues, ASR errors, and written-out numbers can affect matching.' });
        continue;
      }
      const comparable = selectedQuantities.filter(candidate => quantityBase(candidate).unit === quantityBase(quantity).unit);
      if (!comparable.length) { ignoredQuantities++; continue; }
      comparedQuantities++;
      const relevant = comparable.sort((a, b) => sharedAnchors(b.cue.text, text).length - sharedAnchors(a.cue.text, text).length);
      addIssue({ ruleId: 'NUMBER_MISMATCH', assessment: 'heuristic', severity: 'medium', confidence: 'medium', title: 'Draft quantity is not matched in selected cues', message: `“${quantity.raw}” has no equivalent quantity in the selected transcript; it contains different ${quantityBase(quantity).unit.replace(':', ' ')} quantities.`, draftField, draftSpan: { start: quantity.index, text: quantity.raw }, sourceQuantities: [...new Set(comparable.map(candidate => candidate.raw))].slice(0, 8), evidence: [...new Map(relevant.map(candidate => [candidate.cue.id, candidate.cue])).values()].slice(0, 3).map(cue => evidence(cue, 'selected')), suggestion: 'Verify the number and its referent against the recording. Correct the draft if it is intended to restate this passage.', uncertainty: 'This compares literal quantities and exact ms/second/minute/hour scaling, not other conversions, arithmetic, valid rounding, attribution, or semantic equivalence. Percent and percentage points are separate.' });
    }
  }
  if (!eligibleDraftQuantities) skip(['NUMBER_MISMATCH', 'NUMBER_OUTSIDE_CLIP'], 'No supported unit-bearing Arabic or common Chinese cardinal numeral appears in the draft; unsupported and bare numbers are not assessed.');
  else if (!comparedQuantities) skip(['NUMBER_MISMATCH', 'NUMBER_OUTSIDE_CLIP'], 'No draft quantities could be compared safely with retained source text and compatible units.');
  else if (ignoredQuantities) coverage.filter(item => ['NUMBER_MISMATCH', 'NUMBER_OUTSIDE_CLIP'].includes(item.ruleId)).forEach(item => Object.assign(item, { status: 'partial', reason: `${comparedQuantities} draft quantity candidate(s) compared; ${ignoredQuantities} unassessed.` }));
  if (ignoredQuantities) warnings.push({ code: 'QUANTITY_ABSTENTION', message: `${ignoredQuantities} draft quantity candidate(s) could not be compared safely (bare/ambiguous units or no selected quantity in that unit family).` });
  if (draftQuantityCandidates > LIMITS.draftQuantityCandidates) warnings.push({ code: 'DRAFT_QUANTITY_LIMIT', message: `Only the first ${LIMITS.draftQuantityCandidates} draft quantity candidates were reviewed. Shorten the draft.` });

  const speakerBlocks = cueList => {
    const blocks = [];
    for (const cue of cueList) {
      const previous = blocks.at(-1);
      if (previous && previous.speaker === cue.speaker) { previous.text += ` ${cue.text}`; previous.cues.push(cue); }
      else blocks.push({ speaker: cue.speaker, text: cue.text, cues: [cue] });
    }
    return blocks;
  };
  const sourceBlocks = speakerBlocks(cues);
  // Matching selected text separately per contiguous source block avoids inventing a quote across a cut.
  const quoteBlocks = [];
  for (const segment of [...segments].sort((a, b) => a.start - b.start)) {
    const block = quoteBlocks.at(-1);
    if (block && segment.start <= block.end + EPSILON) { block.end = Math.max(block.end, segment.end); block.cues.push(...segment.cues.filter(cue => fullySelectedIds.has(cue.id))); }
    else quoteBlocks.push({ start: segment.start, end: segment.end, cues: segment.cues.filter(cue => fullySelectedIds.has(cue.id)) });
  }
  const selectedBlocks = quoteBlocks.flatMap(block => speakerBlocks([...new Map(block.cues.map(cue => [cue.id, cue])).values()].sort((a, b) => a.start - b.start)));
  let quoteCount = 0;
  let attributionChecks = 0;
  let quoteAbstentions = 0;
  for (const [draftField, text] of [['title', title], ['copy', copy]]) for (const quote of extractQuotes(text)) {
    quoteCount++;
    if (quoteCount > LIMITS.quoteCandidates) { quoteAbstentions++; continue; }
    const sourceMatches = sourceBlocks.filter(block => quoteMatches(block.text, quote.text));
    const prefix = text.slice(Math.max(0, quote.index - 100), quote.index).trim();
    const attributed = [...new Set(cues.map(cue => cue.speaker).filter(Boolean))].find(speaker => {
      const escaped = speaker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(?:^|[\\s。.!?])${escaped}\\s*(?:(?:said|says|stated|claims?|说|表示)\\s*[,，]?)?[:：]?\\s*$`, 'i').test(prefix);
    });
    if (attributed && sourceMatches.length && sourceMatches.every(block => block.speaker && block.speaker !== attributed)) {
      attributionChecks++;
      addIssue({ ruleId: 'QUOTE_ATTRIBUTION_MISMATCH', assessment: 'deterministic', severity: 'medium', confidence: 'medium', title: 'Quotation matches another explicit speaker', message: `The draft labels this quotation as ${attributed}, while matching source blocks have different explicit speaker labels.`, draftField, draftSpan: { start: quote.index, text: quote.text }, evidence: sourceMatches.flatMap(block => block.cues).slice(0, 3).map(cue => evidence(cue, selectedIds.has(cue.id) ? 'selected' : 'omitted')), suggestion: 'Verify speaker labels against the recording and correct the attribution if needed.', uncertainty: 'Only explicit transcript metadata and nearby Name: / Name said: patterns are compared. Diarization can be wrong; reporting and endorsement are not inferred.' });
    } else if (attributed && sourceMatches.length) attributionChecks++;
    if (selectedBlocks.some(block => quoteMatches(block.text, quote.text))) continue;
    const found = sourceMatches.length > 0;
    if (found && boundaryUncertainIds.size && quoteMatches(selectedText, quote.text)) {
      quoteAbstentions++;
      warnings.push({ code: 'QUOTE_BOUNDARY_UNCERTAIN', message: `A ${draftField} quotation matches overlapping cue text, but the exact retained words are uncertain at a cut. Listen to the boundary before using the quotation.` });
      continue;
    }
    const candidates = cues.map(cue => ({ cue, score: sharedAnchors(cue.text, quote.text).length + (quoteMatches(cue.text, quote.text) ? 100 : 0) })).filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
    addIssue({ ruleId: found ? 'QUOTE_OUTSIDE_CLIP' : 'QUOTE_NOT_FOUND', assessment: 'deterministic', severity: 'medium', confidence: 'high', title: found ? 'Quoted wording is outside this selection' : 'Quoted wording was not found verbatim', message: found ? `“${quote.text}” matches source wording but not a continuous selected speaker block.` : `“${quote.text}” has no normalized match within one continuous speaker block in the supplied transcript.`, draftField, draftSpan: { start: quote.index, text: quote.text }, evidence: candidates.map(({ cue }) => evidence(cue, selectedIds.has(cue.id) ? 'selected' : 'omitted')), suggestion: 'Check the recording and quotation. Use exact wording or clearly label a paraphrase.', uncertainty: 'Matching ignores case and ordinary punctuation, preserves English word boundaries/hyphens, and permits ordered ellipsis fragments. Ellipses may still omit meaning-critical context. Audio, ASR accuracy, translation, and rhetorical use of quotes are unassessed.' });
  }
  if (!quoteCount) skip(['QUOTE_NOT_FOUND', 'QUOTE_OUTSIDE_CLIP'], 'No quote of at least 8 normalized characters or 4 Chinese characters was detected.');
  else if (quoteAbstentions) coverage.filter(item => ['QUOTE_NOT_FOUND', 'QUOTE_OUTSIDE_CLIP'].includes(item.ruleId)).forEach(item => Object.assign(item, { status: quoteAbstentions === quoteCount ? 'skipped' : 'partial', reason: `${quoteAbstentions} quotation(s) unassessed due to uncertain retained words or the quote-candidate limit.` }));
  if (quoteCount > LIMITS.quoteCandidates) warnings.push({ code: 'QUOTE_LIMIT', message: `Only the first ${LIMITS.quoteCandidates} draft quotations were reviewed. Shorten the draft.` });
  if (!attributionChecks) skip(['QUOTE_ATTRIBUTION_MISMATCH'], 'No comparable quote attribution with known explicit source speaker metadata.');
  return makeReport(segments, selectedCues);

  function makeReport(segments = [], selectedCues = []) {
    const invalid = issues.some(issue => issue.ruleId === 'RANGE_INVALID');
    if (issues.length >= MAX_ISSUES) warnings.push({ code: 'ISSUE_LIMIT', message: `Output capped at ${MAX_ISSUES} issues. Shorten the draft or split the review for complete output.` });
    return {
      schemaVersion: SCHEMA_VERSION,
      engine: { name: 'ClipLint', version: VERSION, mode: 'deterministic-and-heuristic' },
      status: invalid ? 'invalid-input' : issues.length ? 'needs-review' : 'no-signals',
      summary: { issueCount: issues.length, bySeverity: Object.fromEntries(['high', 'medium', 'low', 'info'].map(severity => [severity, issues.filter(issue => issue.severity === severity).length])), selectedDuration: validated.reduce((total, range) => total + range.end - range.start, 0), selectedCueCount: selectedCues.length },
      source: { duration, cueCount: cues.length, format: transcript && typeof transcript === 'object' && typeof transcript.format === 'string' ? transcript.format : parsed.format },
      selection: { ranges: validated.map(({ start, end }) => ({ start, end })), text: segments.map(segment => segment.cues.map(cue => cue.text).join(' ')).join('\n[EDIT]\n'), timingPrecision: issues.some(issue => issue.ruleId === 'PARTIAL_CUE') ? 'boundary-uncertain' : 'cue-level' },
      draft: { title, copy },
      issues, coverage, warnings,
      semanticAssessment: { status: 'unassessed', reason: 'No model or semantic truth assessment runs. Human review of audio, meaning, attribution, and intent remains necessary.' },
      limitations: [
        'A source-context preflight, not a truth, legal, copyright, consent, or publish-safety check. No model is called.',
        'No signals means no implemented rule fired. It is not evidence that a clip is faithful, accurate, or safe to publish.',
        'Cue-level timestamps include whole overlapping cues; exact retained words require audio or word-level timing.',
        'English and Chinese lexicons are incomplete. Negation, sarcasm, scope, topic changes, and complex reference resolution may be missed or flagged incorrectly.',
        'Quantity matching handles supported Arabic and common Chinese cardinal numerals with explicit units. Only ms/second/minute/hour scaling is converted; no arithmetic, currency conversion, role assignment, or rounding is inferred. Same value does not establish same referent.',
        'The supplied transcript may be incomplete or wrong. Speaker metadata is used only when explicitly supplied.',
        'Visual edits, thumbnails, on-screen text, tone, music, delivery, and actual media timing are not inspected.',
      ],
    };
  }
}
