# ClipLint independent synthetic evaluation protocol, v1

## Status and intended use

All 54 semantic cases and 8 malformed-input cases are invented, including people, episodes, claims, and scenarios. This is an adversarial engineering challenge set, not a representative sample. Results cannot establish real-world accuracy, safety, factual truth, or editorial acceptability. No content is sent to external services.

The case author wrote and fixed the cases and gold labels before inspecting or running the engine. `frozen-manifest.json` records the two JSON files' SHA-256 values. The API/rule inventory can subsequently inform an explicit adapter, never case relabeling. Changes to gold labels require a new version, documented rationale, and the old version retained. A later bug-fix run is regression evaluation on known cases, not a fresh independent test.

## Files and units

- `cases.synthetic.v1.json`: 54 cases, comprising 28 actionable distortions, 17 benign controls, and 9 abstention/limits cases. Languages: 31 English, 18 Chinese, 5 mixed
- `malformed.synthetic.v1.json`: 8 validation cases, scored separately
- `source_cues`: complete supplied context with stable IDs, numeric timestamps in seconds, text, optional speaker
- `clip_ranges`: half-open source-time intervals in playback order. Multiple ranges can be separated, adjacent, or reversed in order. Do not sort them in the adapter
- `title` and `copy`: candidate framing of the selected clip
- `expected.labels`: semantic gold categories; multilabel, not mutually exclusive
- `expected.mode`: `flag`, `clear`, or `abstain`. `clear` means no targeted textual distortion in this case, never overall factual certification

Cases test source consistency, not whether the source itself is true. The source can be wrong, sarcastic, translated, ASR-corrupted, or dependent on visual context. Those limitations must remain explicit.

## Preserve independent labels

Seven substantive categories are assessed on the 45 determinate cases: numeric_mismatch, omitted_condition, negation_reversal, unsupported_quote, misattribution, misleading_splice, incomplete_reference. `insufficient_evidence` is evaluated separately on the 9 abstention cases. All substantive case-label pairs in the determinate subset are scored, including labels an implementation does not support. Also report which unsupported capabilities explain misses. Do not erase missed labels merely because the library is a preflight heuristic rather than a semantic judge.

A rule alert only earns a hit for its declared category. A generic context warning is not credit for negation, attribution, or every missing condition. Broad mappings must be fixed and disclosed before interpreting the run. Preserve rule IDs, evidence, confidence/assessment, severity, and uncertainty in raw output.

Public-rule projection for the initial API inventory:

| Public rule | Gold projection | Interpretation |
| --- | --- | --- |
| NUMBER_MISMATCH | numeric_mismatch | Numeric risk alert, not a semantic proof |
| NUMBER_OUTSIDE_CLIP | numeric_mismatch | Numeric support outside selection; not necessarily a contradiction |
| OMITTED_QUALIFIER | omitted_condition | Omitted qualification risk |
| QUOTE_NOT_FOUND | unsupported_quote | Exact/normalized quote search result |
| QUOTE_OUTSIDE_CLIP | unsupported_quote | Quoted words absent from selection |
| DANGLING_OPENING | incomplete_reference | Incomplete opening reference risk |
| STITCH_CONTEXT | misleading_splice | Meaning-changing splice risk |
| PARTIAL_CUE | no substantive projection | Targeted timing/evidence limitation |
| RANGE_* | no substantive projection | Validation or selection coverage |

No initial public rule maps to negation_reversal or misattribution. Do not manufacture such a mapping after seeing misses. Multiple rules projected to one category count once per case. Unmapped rule IDs must be listed and reviewed, not silently discarded. Range overlap/invalidity is not a proof of semantic distortion.

## Scoring

On the 45 determinate cases:

1. Per-category TP, FP, FN, support, precision = TP/(TP+FP), recall = TP/(TP+FN), F1. An undefined precision or recall is null, not 100%
2. Macro precision over categories with defined precision, reporting that category count. Macro recall over categories with support. Macro F1 includes zero for a supported category with no predictions, so absent capabilities cannot inflate results
3. Micro precision/recall/F1 over all substantive case-label pairs
4. Case-level any-alert detection: a positive is an actionable-distortion case, predicted positive means one or more substantive projected alerts. Report misses and benign-control false-alert rate, with exact IDs
5. Exact label-set agreement and per-language breakdown. Language subsets are too small for reliable population inference
6. Separately present raw rule counts and all unmapped rules. An alert marked heuristic still contributes to alert burden; it is not equivalent to a deterministic finding of wrongdoing

Do not headline one composite accuracy percentage. This stress set intentionally contains hard negatives and targeted edge cases, so neither prevalence nor error rates represent production. Rule warning precision here measures agreement with the targeted semantic label, not whether asking a human to look could ever be defensible. Evidence quality and whether the warning language overclaims must also be examined manually.

Abstention is assessed separately:

- A safe result must not affirm source faithfulness, factual truth, or clip acceptability when the needed evidence is missing
- U01 (world truth) and U05 (audiovisual effect) require explicit global scope disclosure; no fabricated case-specific distortion is expected
- Q05, A05, R05, U02, U03, U04 and U06 need the relevant missing-evidence class surfaced, not merely the universal claim that semantics are unassessed
- A generic semantic disclaimer gets credit for scope honesty but not targeted uncertainty detection
- Preserve all warnings on these cases. A cautious risk alert can be helpful without proving a mismatch; manually distinguish targeted abstention, generic disclaimer only, overclaim, and error
- No-signal output is not a pass. Empty/missing source needs an explicit error or insufficient-evidence state

Malformed cases are robustness checks, not semantic precision/recall. Run independently; catch exceptions per input so one failure does not stop the suite. Record reject/warn/safe-normalization/silent-accept and whether evidence provenance survives. A stable validation exception is acceptable. Unexpected crashes, silent type coercion that asserts support, duplicate evidence IDs, and successful clean reports on empty selection are risks. JSON cannot encode NaN or Infinity; these are additional programmatic probes, not members of the frozen JSON.

## Deterministic, heuristic, unassessed

- Deterministic: timestamp/range validity, selected-cue identity, exact normalized text presence, numeric token extraction. “Substring absent” can be deterministic; “quotation fabricated” usually is not
- Heuristic: whether omitted adjacent content is meaning-critical; pronoun resolution; numeric role/unit equivalence; quote ellipses/translation; causal framing; negation scope; speaker stance; misleading ordering. A lexical match does not settle these
- Unassessed without more evidence: audio prosody, facial expression, B-roll, thumbnail, source recording authenticity, ASR correctness, context outside supplied transcript, real-world truth, cultural/satirical intent

Report an implementation's actual supported mechanism, not the perceived importance of a category. A passing deterministic extraction test is not validation of a heuristic conclusion. Every allegation-like output needs source evidence and measured uncertainty.

## Future real-data validation

1. Obtain authorized source videos/transcripts and editorial clips with documented provenance. Keep episode, channel/creator, recording, language, and derived-clip IDs. Never transmit private material without authorization
2. Split at episode/source recording before deriving clips or variants. All clips, paraphrases, subtitles, translations, perturbations, and near duplicates from one episode remain in one split. For creator generalization, add a stricter creator/channel-held-out evaluation
3. Group the synthetic `episode_id` variants in this same manner if used for development; the paired conversion cases must not leak across splits. This synthetic set should primarily serve as a known regression set after the first run
4. Maintain separate development, locked validation, and sealed test sets. Tune thresholds only on development/validation. Report a new post-tuning score as non-independent unless a fresh holdout is used
5. Have at least two bilingual annotators independently label full source + clip + framing, including evidence spans, ambiguity, distortion materiality, and assessability. Adjudicate disagreements, preserve original judgments, and report inter-annotator agreement per label. Add explicit clean controls and hard negatives from natural edits
6. Report per-rule/category precision and recall with confidence intervals bootstrapped by episode, not individual clip. Report alert volume, severity calibration, language/speaker/format breakdown, abstention quality, coverage, and unresolved disagreements. Low sample counts must remain visible
7. Compare against useful baselines: no alerts, always-context-warning, lexical exact match, and a qualified human review workflow. Measure whether alerts help editors find real issues, rather than merely whether an engine emits warnings
8. Define release gates before the final evaluation with editorial stakeholders. This synthetic suite supplies no justified production precision/recall threshold and no license to describe the tool as proven accurate

## Development-regression adapter extension, 2026-09-30

After baseline feedback, the implementation announced a new `QUOTE_ATTRIBUTION_MISMATCH` rule for explicit quote-name labels. Before the revision-001 run, it is mapped to `misattribution` by its declared meaning. This is an adapter extension, not a gold-label change. The original baseline report preserves the exact mapping used for that run. General stance attribution remains a broader gold target than this new quote-specific mechanism.

The revised engine may downgrade ordinary discontinuities to `info`. The original all-rule projection remains unchanged for comparability and alert-burden accounting. A supplementary non-info view can separately show actionable warnings, but must not replace the all-rule metrics or silently erase informational structural outputs. Neither view establishes semantic correctness.
