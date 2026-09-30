# ClipLint engine

A dependency-free, local-first source-context preflight for podcast and interview clips. Supply a timed source transcript, the selected source ranges, and draft copy. Get reproducible review signals with source timestamps, rule IDs, and explicit uncertainty.

**This is a prototype heuristic engine, not semantic verification.** It does not establish truth, faithful meaning, speaker intent, consent, copyright, legality, or publish safety. A clean report means only that no implemented rule fired. No model is invoked, and there are no accuracy, traction, or real-world reliability claims.

## Run locally

Node.js 20 or newer; no install step or third-party package is required.

```sh
node --test
node bin/cliplint.js --help
node bin/cliplint.js \
  --transcript examples/synthetic-interview.srt \
  --ranges 8:16 \
  --title 'AI cuts support costs by 80%' \
  --format markdown

node bin/cliplint.js --project examples/synthetic-review.json --output report.json
```

Every included interview and claim is **synthetic**. Examples demonstrate mechanics, not accuracy or real people. The CLI does not overwrite an existing output file unless `--force` is explicit. `--fail-on medium` gives exit code 1 when a medium/high signal is found; normal reviews otherwise exit 0, invalid input/I/O exits 2. Exit 0 is never editorial approval.

## Browser-safe API

```js
import { parseTranscript, reviewClip, formatMarkdown } from './src/index.js';

const transcript = parseTranscript(srtText, { format: 'auto' });
const report = reviewClip({
  transcript,
  ranges: [{ start: 8, end: 16 }], // seconds, half-open, playback order
  title: 'AI cuts support costs by 80%',
  copy: 'A draft social caption',
  contextWindowSeconds: 12,
});
const markdown = formatMarkdown(report);
```

The core uses no Node imports, DOM, network, storage, environment values, credentials, telemetry, randomness, or clock. It is synchronous and deterministic. For large inputs, call it from a Web Worker; render transcript/evidence as text, never HTML. The Node-only CLI is separate. Type declarations are included.

### Inputs

- SRT, WebVTT, a JSON cue array, or `{ "cues": [...] }` / `{ "segments": [...] }`
- Each cue: `{ "start": 0, "end": 4, "text": "A statement.", "speaker": "Optional explicit label" }`
- Times are seconds or subtitle timestamps. Untimed prose is rejected rather than assigned invented times
- Optional `id` is preserved as `sourceId`; unique internal IDs are generated from original cue positions. Cues are sorted if needed, with warnings
- Segment-envelope metadata and word-level timestamps are not currently consumed. The engine always reports cue-level precision
- Ranges retain the supplied playback order. Partially selected cues get boundary warnings. The engine cannot tell which words remain inside a cue
- A project JSON embeds `transcript`, `ranges`, optional `title`, `copy`, and `contextWindowSeconds`. The CLI never follows a transcript path embedded in project JSON

## What it checks

- Invalid, reversed, empty, out-of-coverage, and overlapping selections
- Cuts through a subtitle cue, with quote/number inclusion abstention
- A nearby omitted English/Chinese qualifier only when lexical linkage or a clear adjacent continuation is also present
- Potentially dangling openings, and discontinuous or reordered selections
- Supported literal quantities with explicit units, including percentages, percentage points, selected currencies/count nouns/time units, Arabic numerals and common Chinese cardinals
- Exact ms/second/minute/hour scaling; no currency conversion or percentage arithmetic
- Draft quotation non-matches, quoted wording outside a continuous selection, ordered ellipsis fragments, and explicit known-speaker attribution mismatch

Each issue is tagged `deterministic` (a mechanical observation) or `heuristic` (a possible concern). All output separately declares `semanticAssessment.status: "unassessed"`. An informational discontinuity is an editing fact, not an allegation of distortion. Confidence concerns only the signal, never the underlying claim.

## Important blind spots

Negation reversal in a paraphrased title, subtly removed conditions, numeric role swaps, rhetoric, sarcasm, valid rounding, speaker endorsement, unknown names, translated quotations, and visual/music/thumbnail manipulation remain unassessed or only weakly covered. Equal numbers can describe different things. Missing lexicon hits do not imply complete context. Transcript and diarization errors can cause both missed and false signals.

Quotation normalization preserves English word boundaries, apostrophes and lexical hyphens. It ignores case and ordinary punctuation and permits ordered `…` or `...` fragments. These are text-matching choices, not proof that a quotation is editorially fair. A quote cannot be assembled across explicit speaker changes. With no speaker metadata, attribution remains unknown.

See [schema](docs/schema.md), [rule behavior](docs/rules.md), and [validation notes](docs/validation.md).

## Resource and privacy boundaries

Limits: 2,000,000 transcript characters, 25,000 cues, 20,000 characters per cue and per combined draft, 100 ranges, 7-day timestamps, a 60-second context window. Numeric review caps at 50,000 source quantities / 200 draft candidates; quotation review caps at 100 quotations; reports cap at 500 issues. Limits produce errors, explicit warnings, or partial/skipped coverage rather than silent truncation. Evidence excerpts are capped at 600 characters and marked when truncated.

The local library/CLI makes no network calls. Files and reports may contain private transcript text: the person using the CLI controls their storage and sharing. A website embedding this engine has its own hosting/privacy behavior; this engine cannot guarantee that behavior.

## Architecture

`transcript.js` validates and normalizes timed input. `text.js` holds transparent lexicons and literal matching. `review.js` applies source-range/copy rules. `markdown.js` serializes reports. `bin/cliplint.js` handles bounded local file I/O. Tests use only `node:test` and Node's standard library.

There is deliberately no optional model adapter in this shipment: preserving explicit rule coverage and reproducible evidence comes first. A future local-model layer would need separate provenance, confidence calibration, failure handling, and evaluation, and could not silently replace these deterministic observations.
