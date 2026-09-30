import { ClipLintError, LIMITS } from './constants.js';

const fail = (code, message, details) => { throw new ClipLintError(code, message, details); };

/** Parse strict subtitle timestamps, or a non-negative seconds number. */
export function parseTimestamp(value) {
  if (typeof value === 'number') {
    if (Number.isFinite(value) && value >= 0 && value <= LIMITS.durationSeconds) return value;
    fail('INVALID_TIMESTAMP', 'Timestamp must be a finite non-negative number within 7 days.');
  }
  if (typeof value !== 'string') fail('INVALID_TIMESTAMP', 'Timestamp must be seconds or a subtitle timestamp.');
  const text = value.trim();
  if (/^\d+(?:\.\d+)?$/.test(text)) return parseTimestamp(Number(text));
  const match = text.match(/^(?:(\d{1,3}):)?([0-5]\d):([0-5]\d)(?:[.,](\d{1,3}))?$/);
  if (!match) fail('INVALID_TIMESTAMP', `Invalid timestamp: ${text.slice(0, 80)}`);
  const seconds = Number(match[1] || 0) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number((match[4] || '0').padEnd(3, '0')) / 1000;
  return parseTimestamp(seconds);
}

function decodeEntities(text) {
  return text.replace(/&(amp|lt|gt|quot|apos|nbsp);|&#(\d{1,7});|&#x([a-f\d]{1,6});/gi, (whole, named, decimal, hex) => {
    if (named) return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[named.toLowerCase()];
    const code = Number.parseInt(decimal || hex, decimal ? 10 : 16);
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : whole;
  });
}

export function cleanSubtitleText(text) {
  // Strip only known subtitle markup. Arbitrary angle-bracket content is preserved.
  return decodeEntities(text
    .replace(/<\/?(?:b|i|u|ruby|rt|c(?:\.[^\s>]*)?|v(?:\s[^>]*)?|lang(?:\s[^>]*)?)>/gi, '')
    .replace(/<\d{2}:\d{2}(?::\d{2})?[.,]\d{3}>/g, '')
    .replace(/\{\\[ibu][01]\}/g, ''))
    .replace(/\s+/g, ' ').trim();
}

function normalizeCues(input) {
  if (!Array.isArray(input)) fail('INVALID_TRANSCRIPT', 'JSON transcript must be a cue array or an object containing cues or segments.');
  if (input.length === 0) fail('EMPTY_TRANSCRIPT', 'Transcript must contain at least one timed cue.');
  if (input.length > LIMITS.cues) fail('INPUT_LIMIT', `Transcript exceeds ${LIMITS.cues} cues.`);
  const warnings = [];
  const seenSourceIds = new Set();
  let characters = 0;
  const cues = input.map((cue, index) => {
    if (!cue || typeof cue !== 'object' || Array.isArray(cue)) fail('INVALID_CUE', `Cue ${index + 1} must be an object.`);
    const start = parseTimestamp(cue.start);
    const end = parseTimestamp(cue.end);
    if (end <= start) fail('INVALID_CUE', `Cue ${index + 1} must end after it starts.`, { index });
    if (typeof cue.text !== 'string') fail('INVALID_CUE', `Cue ${index + 1} text must be a string.`);
    characters += cue.text.length;
    if (cue.text.length > LIMITS.cueCharacters || characters > LIMITS.transcriptCharacters) fail('INPUT_LIMIT', 'Transcript text limit exceeded.');
    const text = cleanSubtitleText(cue.text);
    if (!text) fail('INVALID_CUE', `Cue ${index + 1} has no text after subtitle formatting is removed.`);
    const normalized = { id: `cue-${index + 1}`, start, end, text };
    const sourceId = cue.sourceId ?? cue.id;
    if (sourceId !== undefined) {
      if (typeof sourceId !== 'string' || sourceId.length > 200 || !sourceId.trim()) fail('INVALID_CUE', `Cue ${index + 1} id must be a nonempty string of at most 200 characters.`);
      normalized.sourceId = sourceId;
      if (seenSourceIds.has(sourceId)) warnings.push({ code: 'DUPLICATE_SOURCE_ID', message: `Repeated source cue ID at cue ${index + 1}; generated cue IDs are used to disambiguate.` });
      seenSourceIds.add(sourceId);
    }
    if (cue.speaker !== undefined) {
      if (typeof cue.speaker !== 'string' || cue.speaker.length > 200) fail('INVALID_CUE', `Cue ${index + 1} speaker must be a string of at most 200 characters.`);
      normalized.speaker = cue.speaker;
    }
    return normalized;
  });
  if (cues.some((cue, index) => index && cue.start < cues[index - 1].start)) {
    warnings.push({ code: 'CUES_SORTED', message: 'Cues were sorted by start time; original indices remain in cue IDs.' });
    cues.sort((a, b) => a.start - b.start || a.end - b.end);
  }
  let runningEnd = -1;
  let overlapping = 0;
  for (const cue of cues) {
    if (cue.start < runningEnd) overlapping++;
    runningEnd = Math.max(runningEnd, cue.end);
  }
  if (overlapping) warnings.push({ code: 'OVERLAPPING_CUES', message: `${overlapping} cue(s) overlap earlier cues. Speaker order and boundary context may be ambiguous.` });
  return { cues, warnings };
}

function parseSubtitles(input, format) {
  const lines = input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  const cues = [];
  let i = 0;
  if (format === 'vtt') {
    if (!/^WEBVTT(?:[ \t].*)?$/.test(lines[0].trim())) fail('INVALID_VTT', 'WebVTT must begin with WEBVTT.');
    i++;
    while (i < lines.length && lines[i].trim() && !lines[i].includes('-->')) i++;
  }
  while (i < lines.length) {
    if (!lines[i].trim()) { i++; continue; }
    if (format === 'vtt' && /^(NOTE(?:\s|$)|STYLE$|REGION$)/.test(lines[i].trim())) {
      while (i < lines.length && lines[i].trim()) i++;
      continue;
    }
    let timing = lines[i].trim();
    if (!timing.includes('-->')) {
      // Optional cue number or WebVTT cue identifier.
      if (i + 1 < lines.length && lines[i + 1].includes('-->')) timing = lines[++i].trim();
      else fail('INVALID_SUBTITLE', `Expected a timestamp at line ${i + 1}.`, { line: i + 1 });
    }
    const match = timing.match(/^(\S+)\s+-->\s+(\S+)(?:\s+.*)?$/);
    if (!match) fail('INVALID_SUBTITLE', `Invalid timestamp range at line ${i + 1}.`, { line: i + 1 });
    const start = parseTimestamp(match[1]);
    const end = parseTimestamp(match[2]);
    const body = [];
    i++;
    while (i < lines.length && lines[i].trim()) {
      if (lines[i].includes('-->')) fail('INVALID_SUBTITLE', `Missing blank line between cues near line ${i + 1}.`, { line: i + 1 });
      body.push(lines[i++]);
    }
    const voice = body.join(' ').match(/<v\s+([^>]+)>/i);
    cues.push({ start, end, text: body.join('\n'), ...(voice ? { speaker: cleanSubtitleText(voice[1]) } : {}) });
    if (cues.length > LIMITS.cues) fail('INPUT_LIMIT', `Transcript exceeds ${LIMITS.cues} cues.`);
  }
  return normalizeCues(cues);
}

/**
 * Parse SRT, WebVTT, a JSON string, a cue array, or { cues }.
 * Cue times use seconds; no untimed text is guessed into timestamps.
 */
export function parseTranscript(input, { format = 'auto' } = {}) {
  if (!['auto', 'srt', 'vtt', 'json'].includes(format)) fail('INVALID_FORMAT', 'Format must be auto, srt, vtt, or json.');
  if (typeof input !== 'string') {
    if (format !== 'auto' && format !== 'json') fail('INVALID_TRANSCRIPT', `${format} input must be a string.`);
    return { ...normalizeCues(Array.isArray(input) ? input : input?.cues ?? input?.segments), format: 'json' };
  }
  if (input.length > LIMITS.transcriptCharacters) fail('INPUT_LIMIT', `Transcript exceeds ${LIMITS.transcriptCharacters} characters.`);
  if (!input.trim()) fail('EMPTY_TRANSCRIPT', 'Transcript is empty.');
  const text = input.replace(/^\uFEFF/, '').trim();
  const detected = format === 'auto' ? (/^WEBVTT(?:\s|$)/.test(text) ? 'vtt' : /^[\[{]/.test(text) ? 'json' : 'srt') : format;
  if (detected === 'json') {
    let json;
    try { json = JSON.parse(text); } catch { fail('INVALID_JSON', 'Transcript is not valid JSON.'); }
    return { ...normalizeCues(Array.isArray(json) ? json : json?.cues ?? json?.segments), format: 'json' };
  }
  return { ...parseSubtitles(text, detected), format: detected };
}

export function formatTimestamp(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return 'unknown';
  const ms = Math.round(seconds * 1000);
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor(ms / 60000) % 60;
  const secs = Math.floor(ms / 1000) % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
}
