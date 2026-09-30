import { formatTimestamp } from './transcript.js';

const escape = value => String(value).replace(/[\\`*_[\]<>#|]/g, character => `\\${character}`).replace(/\r?\n/g, ' ');

export function formatMarkdown(report) {
  const lines = [
    '# ClipLint source-context review', '',
    `Status: **${escape(report.status)}** · ${report.summary.issueCount} signal(s)`, '',
    '**Heuristic preflight only. No truth, legal, copyright, or publish-safety verdict.**', '',
    `Source: ${report.source.cueCount} cues · ${formatTimestamp(report.source.duration)}`, '',
    '## Draft', '', `Title: ${escape(report.draft.title || '(none)')}`, '', `Copy: ${escape(report.draft.copy || '(none)')}`, '',
    '## Review signals', '',
  ];
  if (!report.issues.length) lines.push('No implemented rule fired. Meaning remains unassessed; this is not a pass or a publish recommendation.', '');
  for (const issue of report.issues) {
    lines.push(`### ${escape(issue.id)} · ${escape(issue.title)}`, '',
      `Rule: ${escape(issue.ruleId)} · Severity: ${escape(issue.severity)} · ${escape(issue.assessment)} · Signal confidence: ${escape(issue.confidence)}`, '',
      escape(issue.message), '', `Next step: ${escape(issue.suggestion)}`, '', `Uncertainty: ${escape(issue.uncertainty)}`, '');
    for (const item of issue.evidence) lines.push(`- ${formatTimestamp(item.start)}–${formatTimestamp(item.end)} (${escape(item.role)}${item.speaker ? `; ${escape(item.speaker)}` : ''}): ${escape(item.text)}${item.truncated ? ' [excerpt truncated]' : ''}`);
    if (issue.evidence.length) lines.push('');
  }
  lines.push('## Coverage', '');
  for (const item of report.coverage) lines.push(`- ${escape(item.ruleId)}: ${escape(item.status)}${item.reason ? ` — ${escape(item.reason)}` : ''}`);
  lines.push('', '## Limits', '', ...report.limitations.map(item => `- ${escape(item)}`), '', `Semantic assessment: ${escape(report.semanticAssessment.status)}. ${escape(report.semanticAssessment.reason)}`, '');
  if (report.warnings.length) lines.push('## Input and review warnings', '', ...report.warnings.map(item => `- ${escape(item.code)}: ${escape(item.message)}`), '');
  return lines.join('\n');
}
