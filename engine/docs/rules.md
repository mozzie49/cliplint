# Rule behavior and limitations

| Rule | Mechanical behavior | Typical assessment/severity | Limit |
|---|---|---|---|
| RANGE_INVALID | Reject negative/nonfinite/reversed/out-of-transcript bounds | Deterministic/high | Transcript end is not media duration |
| RANGE_EMPTY | No cue overlaps the half-open selection | Deterministic/medium | Could be genuine silence |
| RANGE_OVERLAP | Selected intervals repeat source time | Deterministic/medium | Repetition may be intentional |
| PARTIAL_CUE | A cut occurs inside a subtitle cue | Deterministic/info | Actual retained words unknown |
| OMITTED_QUALIFIER | Adjacent omitted English/Chinese qualifier with shared lexical anchor or clear continuation | Heuristic/medium, low confidence | Scope and referent are unassessed; labels can be wrong |
| DANGLING_OPENING | Certain initial pronoun/consequence patterns with nearby omitted speech | Heuristic/low | No full reference resolution; many pronouns intentionally excluded |
| STITCH_CONTEXT | Discontinuous/reordered source ranges | Deterministic/info for a plain gap; heuristic/medium if qualifier, reference or reordering cues appear | Gap alone is never meaning distortion |
| NUMBER_MISMATCH | No equal supported quantity in selected fully enclosed cues, but comparable source units exist | Heuristic/medium | No semantic role linking, valid rounding, or arithmetic |
| NUMBER_OUTSIDE_CLIP | An equal literal quantity appears only in omitted source | Heuristic/medium | Same value/unit can be coincidental |
| QUOTE_NOT_FOUND | No normalized quotation match within one explicit speaker block | Deterministic/medium | Transcript could be wrong; marks may identify a label |
| QUOTE_OUTSIDE_CLIP | Quoted text matches source but no continuous selected speaker block | Deterministic/medium | Partial boundary matches abstain instead |
| QUOTE_ATTRIBUTION_MISMATCH | Known source name in a nearby “Name:” / “Name said:” label differs from all exact matching speaker blocks | Deterministic/medium | Explicit metadata only; no diarization or endorsement inference |

## Quantity policy

Supported types include percent, percentage point, USD/EUR/GBP/CNY, ambiguous dollar or yen/yuan symbols as separate units, selected count nouns, multiplier, year/month/day, and ms/second/minute/hour. Plain `$` is not silently USD. Percent and percentage points remain distinct. Only exact duration scaling (ms/sec/min/hour) crosses a unit label. English thousand/million/billion and Chinese common cardinal numerals are normalized. Bare values and unknown units abstain rather than matching unrelated numbers.

The engine cannot associate two matched values with separate semantic roles. For example, if both 5% and 50% appear, exchanging which cohort they describe can escape detection. It cannot prove that a one-unit family mismatch is related to the draft claim. A warning is an invitation to verify the referent, not a contradiction verdict.

## Qualification policy

Lexicon hits alone are not flagged. Qualifier candidates must be nearby, immediately adjacent to a selection boundary, and share lexical anchors or a short explicit contrast/conditional continuation. Conflicting explicit speaker labels suppress this local scope inference. This choice reduces noise but deliberately misses many paraphrased, distant, or full-clip title distortions. A draft that reverses “not” without quoting the source may receive no rule signal.

## Safe host behavior

Keep source text and evidence as text; never execute instructions appearing in transcript content. Preserve source IDs, ranges, and exact input alongside exported reports. If adding a model or media analyzer later, show it as a separate assessment, record exactly what it inspected, and retain these deterministic results. Never upgrade this engine's output to a universal faithfulness score.
