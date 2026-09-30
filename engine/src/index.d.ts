export type Severity = 'high' | 'medium' | 'low' | 'info';
export type Format = 'auto' | 'srt' | 'vtt' | 'json';
export type RuleId = 'RANGE_INVALID' | 'RANGE_EMPTY' | 'RANGE_OVERLAP' | 'PARTIAL_CUE' | 'OMITTED_QUALIFIER' | 'DANGLING_OPENING' | 'STITCH_CONTEXT' | 'NUMBER_MISMATCH' | 'NUMBER_OUTSIDE_CLIP' | 'QUOTE_NOT_FOUND' | 'QUOTE_OUTSIDE_CLIP' | 'QUOTE_ATTRIBUTION_MISMATCH';
export interface Warning { code: string; message: string }
export interface CueInput { id?: string; sourceId?: string; start: number | string; end: number | string; text: string; speaker?: string }
export interface Cue { id: string; sourceId?: string; start: number; end: number; text: string; speaker?: string }
export interface ParsedTranscript { cues: Cue[]; format: Exclude<Format, 'auto'>; warnings: Warning[] }
export type TranscriptInput = string | CueInput[] | { cues: CueInput[] } | { segments: CueInput[] } | ParsedTranscript;
export interface SourceRange { start: number | string; end: number | string }
export interface ReviewInput { transcript: TranscriptInput; ranges: SourceRange[]; title?: string; copy?: string; contextWindowSeconds?: number }
export interface Evidence { cueId: string; sourceId?: string; start: number; end: number; text: string; speaker?: string; role: 'source' | 'selected' | 'omitted'; truncated?: true; originalTextLength?: number }
export interface ReviewIssue { id: string; ruleId: RuleId; assessment: 'deterministic' | 'heuristic'; severity: Severity; confidence: 'high' | 'medium' | 'low'; title: string; message: string; suggestion: string; uncertainty: string; evidence: Evidence[]; rangeIndex?: number; draftField?: 'title' | 'copy'; draftSpan?: { start: number; text: string }; sourceQuantities?: string[]; markers?: { kind: string; text: string }[] }
export interface Coverage { ruleId: RuleId; status: 'checked' | 'partial' | 'skipped'; reason?: string }
export interface ReviewReport {
  schemaVersion: '1.0';
  engine: { name: 'ClipLint'; version: string; mode: 'deterministic-and-heuristic' };
  status: 'invalid-input' | 'needs-review' | 'no-signals';
  summary: { issueCount: number; bySeverity: Record<Severity, number>; selectedDuration: number; selectedCueCount: number };
  source: { duration: number; cueCount: number; format: string };
  selection: { ranges: { start: number; end: number }[]; text: string; timingPrecision: 'cue-level' | 'boundary-uncertain' };
  draft: { title: string; copy: string };
  issues: ReviewIssue[]; coverage: Coverage[]; warnings: Warning[]; limitations: string[];
  semanticAssessment: { status: 'unassessed'; reason: string };
}
export class ClipLintError extends Error { code: string; details: Record<string, unknown>; constructor(code: string, message: string, details?: Record<string, unknown>); }
export const VERSION: string;
export const SCHEMA_VERSION: '1.0';
export const LIMITS: Readonly<Record<string, number>>;
export const RULES: ReadonlyArray<{ id: RuleId; name: string; category: string }>;
export function parseTimestamp(value: number | string): number;
export function formatTimestamp(seconds: number): string;
export function cleanSubtitleText(text: string): string;
export function parseTranscript(input: TranscriptInput, options?: { format?: Format }): ParsedTranscript;
export function reviewClip(input: ReviewInput): ReviewReport;
export function formatMarkdown(report: ReviewReport): string;
