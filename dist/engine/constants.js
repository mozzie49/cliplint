export const VERSION = '0.1.0';
export const SCHEMA_VERSION = '1.0';
export const LIMITS = Object.freeze({
  transcriptCharacters: 2_000_000,
  cues: 25_000,
  cueCharacters: 20_000,
  draftCharacters: 20_000,
  ranges: 100,
  contextWindowSeconds: 60,
  durationSeconds: 604_800,
  draftQuantityCandidates: 200,
  quoteCandidates: 100,
  sourceQuantities: 50_000,
  issues: 500,
});

export class ClipLintError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ClipLintError';
    this.code = code;
    this.details = details;
  }
}

export const RULES = Object.freeze([
  { id: 'RANGE_INVALID', name: 'Invalid source range', category: 'structure' },
  { id: 'RANGE_EMPTY', name: 'No transcript in range', category: 'structure' },
  { id: 'RANGE_OVERLAP', name: 'Overlapping selected ranges', category: 'structure' },
  { id: 'PARTIAL_CUE', name: 'Boundary cuts through a timed cue', category: 'timing' },
  { id: 'OMITTED_QUALIFIER', name: 'Nearby omitted qualifier', category: 'context' },
  { id: 'DANGLING_OPENING', name: 'Opening may depend on earlier context', category: 'context' },
  { id: 'STITCH_CONTEXT', name: 'Source discontinuity needs review', category: 'context' },
  { id: 'NUMBER_MISMATCH', name: 'Draft quantity differs from selected source', category: 'copy' },
  { id: 'NUMBER_OUTSIDE_CLIP', name: 'Draft quantity appears only outside selection', category: 'copy' },
  { id: 'QUOTE_NOT_FOUND', name: 'Quoted wording not found in transcript', category: 'copy' },
  { id: 'QUOTE_OUTSIDE_CLIP', name: 'Quoted wording omitted from selection', category: 'copy' },
  { id: 'QUOTE_ATTRIBUTION_MISMATCH', name: 'Quoted wording matches another explicit speaker', category: 'copy' },
]);
