# Input and report schema, v1.0

## Source and project

```json
{
  "transcript": {
    "cues": [
      { "id": "original-17", "start": 0, "end": 4, "text": "A 20% reduction.", "speaker": "Demo guest" }
    ]
  },
  "ranges": [{ "start": 0, "end": 4 }],
  "title": "A 30% reduction",
  "copy": "",
  "contextWindowSeconds": 12
}
```

All sample data is synthetic. `transcript` can instead be an SRT/VTT/JSON string, a cue array, or a parser result. Cue text must be nonempty after known subtitle formatting is stripped. Optional source IDs must be nonempty strings of at most 200 characters; duplicate source IDs are preserved with a warning and disambiguated by generated cue IDs. Speaker labels are strings up to 200 characters. No speaker label is inferred from prose.

Ranges are half-open `[start, end)`, in intended playback order, with `end > start >= 0`. They are bounded by the transcript's maximum cue end, not a claimed video duration. A selection in a subtitle gap gets `RANGE_EMPTY`. Each selected cue overlaps the selection by positive time; `selectedCueCount` counts unique overlapping cues. `selectedDuration` sums requested valid range durations, including intentional/repeated overlaps. Source bounds are not verified against media.

`parseTranscript` returns `{ cues, format, warnings }`. Each cue has a generated `id`, seconds-based `start/end`, cleaned `text`, optional `speaker`, and optional original `sourceId`. Known SRT/VTT markup is stripped; arbitrary angle-bracket content is left as text. It must never be rendered through `innerHTML`.

## Report

- `schemaVersion`: `"1.0"`
- `engine`: name, implementation version, and `"deterministic-and-heuristic"` mode
- `status`: `invalid-input`, `needs-review`, or `no-signals`; neither valid status is an editorial pass
- `summary`: issue count, high/medium/low/info counts, summed selected seconds, unique overlapping cue count
- `source`: cue count, last cue end in seconds, detected/declared parser format
- `selection`: validated ranges, whole overlapping cue text in playback order separated by `[EDIT]`, `timingPrecision` of `cue-level` or `boundary-uncertain`
- `draft`: exact title/copy inputs
- `issues`: ordered review signals, described below
- `coverage`: one entry per implemented rule; `checked`, `partial`, or `skipped` plus a reason when applicable
- `warnings`: parser/review caveats as `{ code, message }`
- `semanticAssessment`: always `{ "status": "unassessed", "reason": "..." }`
- `limitations`: human-readable non-verdict scope and known blind spots

Input-type, transcript, parser and option errors throw `ClipLintError` with `code`, `message`, and optional `details`. Invalid individual ranges instead produce high-severity `RANGE_INVALID` issues and skip all content review. The CLI emits a compact JSON error on stderr with exit code 2, without stack traces.

### Issue

```json
{
  "id": "issue-1",
  "ruleId": "NUMBER_MISMATCH",
  "assessment": "heuristic",
  "severity": "medium",
  "confidence": "medium",
  "title": "Draft quantity is not matched in selected cues",
  "message": "Human-readable mechanical finding",
  "draftField": "title",
  "draftSpan": { "start": 2, "text": "30%" },
  "evidence": [{
    "cueId": "cue-1", "sourceId": "original-17",
    "start": 0, "end": 4, "text": "A 20% reduction.",
    "speaker": "Demo guest", "role": "selected"
  }],
  "suggestion": "Review the number and its referent against the recording.",
  "uncertainty": "Matching quantities does not establish the same referent."
}
```

`assessment` is a mechanical observation (`deterministic`) or a scope/linkage hypothesis (`heuristic`), never a semantic accuracy grade. `confidence` refers only to the rule's signal. Severity prioritizes review; it does not predict damage or publish safety. `rangeIndex`, when present, is zero-based in the submitted ranges. `draftSpan.start` is a JavaScript string offset in the original draft; for quotations it points to the opening quote while `text` is the quoted content. This field is an anchor, not a claim that `text.length` spans the entire marked original substring.

Evidence has source cue timestamps, not word-level claim offsets. `role` is selected/omitted/source. Excerpts exceeding 600 characters include `truncated: true` and `originalTextLength`; consult the parsed source for full text. Some non-match findings have no meaningful source cue, so `evidence` may be empty. Optional `markers` and `sourceQuantities` explain the trigger. Stable cross-run identity should use rule ID + source ID/range + draft content, not ordinal `issue-N` IDs.

## Coverage and boundary uncertainty

`checked` means that rule's supported mechanical pattern was attempted, not that all related meanings were assessed. `partial` explicitly reports unassessed candidates alongside attempted ones. `skipped` means the prerequisite did not hold or no candidate could be assessed. No comparable units, written-out English numbers, unsupported units, and partial-cue inclusion can all cause numeric abstention. A selected subtitle cue is not proof that a word survives a cut.

Hosts should display uncertainties, warnings, coverage, and semantic-unassessed status alongside findings. Do not turn `no-signals` into a green “safe to publish” badge. Do not omit a partial-coverage warning from an exported review.
