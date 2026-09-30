# ClipLint evaluation: final development checkpoint

## Bottom line

The library is a local, evidence-linked preflight with useful deterministic checks and cautious heuristics. It is not a source-faithfulness verifier. The improved version catches the demonstrated normalization/count/unit defects, keeps semantic assessment explicitly unassessed, and leaves substantial meaning-level failures undetected. Do not turn no-signals into a pass badge.

All evaluation content is synthetic. Gold labels were frozen before implementation inspection and remain unchanged. The first run is independent of the implementation; revision-001 and revision-002 are known-case development regressions after feedback. None of these numbers is a production accuracy estimate.

## Fixed corpus and latest run

- 54 semantic cases: 28 distortion cases, 17 benign controls, 9 uncertainty/abstention cases
- English 31, Chinese 18, mixed-language 5
- 8 separate malformed-input cases, excluded from semantic metrics
- Latest final run: `runs/revision-002/results.json` and `SUMMARY.md`
- All seven semantic gold categories remain scored, including meaning-level capabilities the engine leaves unassessed
- Frozen data hashes still match `frozen-manifest.json`

| View | First independent baseline | Latest known-case regression |
| --- | ---: | ---: |
| Distortion cases with any projected output, including info | 11/28 | 15/28 |
| Distortion cases with non-info risk warnings | 11/28 | 13/28 |
| Benign controls with any projected output, including info | 3/17 | 2/17 |
| Benign controls with non-info risk warnings | 3/17 | 0/17 |
| Exact projected semantic label-set agreement | 20/45 | 26/45 |

The latest two benign outputs are accurate informational discontinuity facts on S05/S07. The all-rule projection intentionally retains them for comparability and warning-burden accounting. Two distortion cases, S01 and S03, likewise receive only an informational discontinuity fact, so they are not counted as caught in the supplementary non-info view. This prevents improving an apparent success rate merely by calling every edit a risk.

Under the unchanged all-rule projection, latest micro precision/recall/F1 are 84.2% / 41.0% / 55.2%; macro precision is 83.3% over five predicted categories, macro recall 49.8% over seven supported categories, and macro F1 51.5%. Consult the per-category table rather than interpreting any aggregate as general accuracy. Undefined precision on never-predicted categories is not 100%.

## Verified improvements

- N01: 12 volunteers versus 21 volunteers now warns
- N03: 80 milliseconds versus 80 seconds now warns; the correct 1500 ms = 1.5 s control remains free of warnings
- N07: 三十万 versus 三百万 now warns
- Q08: a faithfully marked ellipsis quotation no longer triggers an unsupported-quote warning
- C01/R01: dependent openings are better surfaced
- Additional development probes now reject a single direct quote assembled across two explicitly named speakers, “now here” → “nowhere”, and “re-sign” → “resign”
- Source cue IDs are now preserved in evidence as sourceId alongside normalized unique internal IDs
- Numeric coverage can be partial, with unsupported candidates and boundary uncertainty explicitly disclosed
- Visuals, music, thumbnails, delivery, and actual media timing are explicitly listed as unassessed
- Revision-001's new U04 regression was fixed: explicit ASR uncertainty now produces SOURCE_QUANTITY_UNCERTAIN; “万元” alone is not invented as a numeric amount

## Important remaining misses

The latest full list with exact evidence is in `runs/revision-002/SUMMARY.md`. Thirteen distortion cases receive no projected output at all:

- N05/N06/N08: range-to-certainty changes, a number mentioned only in a negated comparison, and numeric role swapping
- C02–C06: scope, explicit negation, double negation, tentative-to-causal strengthening, and an omitted exception when the source cue remains selected
- Q04: a quoted vendor slogan rejected by the speaker is presented as that speaker's endorsement
- A01–A03: general speaker/stance misattribution, including treating a host's question or reported speech as the guest's own position
- R03: the selected clip ends in “only if” and omits the required completion

A narrow quote-name attribution mechanism exists, but it does not solve general stance attribution. Correct numeric tokens or verbatim quote fragments do not prove a faithful claim. Meaning-critical negation, attribution, causal relation, scope, and rhetorical intent require human review or a separately validated semantic method.

## Abstention and robustness

- All non-error reports retain semanticAssessment.status = unassessed and explicit no-signal limitations
- U03 identifies partial-cue timing uncertainty; U04 identifies marked ASR quantity uncertainty; U06 safely errors on absent transcript; U01/U05 have appropriate global truth/audiovisual scope disclosure
- Translation quotation Q05 gives a limited textual-match finding with translation uncertainty, not a translation-faithfulness judgment
- Missing speaker identity, visual referents, and sarcasm remain principally generic limitations, without reliable case-specific detection
- All 8 malformed cases are safely rejected, flagged, or uniquely normalized
- All 9 supplementary interface/parser checks pass on the final revision
- All 4 supplementary semantic mechanism probes now produce the expected cautious review signal
- The downloaded `evaluation/` + sibling `engine/` layout was executed from an unrelated working directory and passed. CLIPLINT_ENGINE remains an explicit override

## Files and reproducibility

`README.md` provides commands. `EVALUATION_PROTOCOL.md` documents category mappings, precision/recall/macros, explicit abstention, deterministic-versus-heuristic distinctions, and a future episode/source-disjoint real-data protocol. `BASELINE_REVIEW.md` preserves the original interpretation; historical raw outputs and implementation fingerprints remain intact.

The final engine source hashes are recorded in `runs/revision-002/results.json`. Re-running after additional engine changes should create a new run name, retain all existing results, and remain labeled regression testing on known cases. Real-data validation still needs authorized sources, bilingual independent annotation/adjudication, source-grouped splits, calibrated severity, and predeclared release gates.
