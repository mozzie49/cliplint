# Independent synthetic baseline review

All scenarios are synthetic. This is an adversarial engineering check, not a real-world accuracy claim. Cases and labels were fixed before implementation inspection. The baseline output is immutable at `runs/baseline/results.json`; later changes are development regressions.

## What the baseline actually showed

Of 28 deliberately distorted clips/titles, 11 received at least one projected substantive rule alert and 17 did not. Three of 17 benign controls received alerts. This case-level view is looser than correct-category detection: a generic splice warning can notice an edit without detecting the causal or negation error introduced by the title.

Across seven semantic gold categories, micro precision/recall/F1 were 73.3% / 28.2% / 40.7%. Macro recall was 37.3%, and macro F1 37.7%. Macro precision was 78.3% but covers only the five categories the engine predicted; there were no negation or attribution predictions. These stress-set metrics cannot estimate production precision or recall. The full per-category table, exact IDs and language slices are in `runs/baseline/SUMMARY.md` and `results.json`.

## Highest-impact blind spots

1. Full-cue framing changes are largely outside the implemented mechanisms. The entire source can remain selected while a title removes a condition, reverses a negation, changes a hedge to causation, or assigns a stance to the wrong speaker. Cases C02–C06, Q04 and A01–A03 show this. Nearby omitted-cue detection does not address title/source entailment
2. Numeric support is not numeric meaning. N01 changes 12 volunteers to 21; N03 changes 80 milliseconds to 80 seconds; N07 changes 三十万 to 三百万; N08 swaps the temporal roles of 50 and 5. Some are intentionally abstained from; others are beyond token matching. Seeing the same numeric token anywhere does not establish support
3. Unfinished conclusions and references can remain invisible. R01 starts with an unresolved “It should not…”; R03 ends with “only if” and loses the condition. C01 identifies the omitted condition but not the dependent opening
4. Meaning-safe quote normalization requires care. The baseline flags an honest ellipsis quotation (Q08), but additional development probes accept meaning-changing word-boundary normalization and a quotation assembled across explicit speakers

## False-alert / warning-burden risks

- Q08: source “We tested carefully, documented every result, and released the patch.” versus “We tested carefully … and released the patch.” The quotation is a faithful, explicitly marked omission. A direct full-string matcher flags it
- S05: omitting a water break between independent numbered instructions triggers STITCH_CONTEXT
- S07: omitting a meeting-room change between consistent archive statements also triggers STITCH_CONTEXT

The two splice outputs have low severity and explicitly say a discontinuity is not proof of changed meaning. The text is appropriately cautious; the risk is alert burden and a UI turning structural facts into accusations. The gold projection counts them as false substantive alerts, not false statements that an edit occurred. Preserve this distinction in any presentation of the results.

## Scope honesty and abstention review

The implementation does not claim that no issues proves faithfulness. Every non-error report includes semanticAssessment.status = unassessed and an explicit warning that no-signals is not evidence of accuracy, faithfulness, or publish safety. This is valuable and must remain visible to users.

N01/N03/N08 and the harmless unit conversion N10 produce quantity-abstention warnings rather than pretending the numeric question was settled. They remain misses against the semantic targets; conservative abstention is different from false certification.

Of the nine abstention cases:

- U01: global truth-check limitation is explicit and appropriate
- U03: PARTIAL_CUE specifically identifies the missing word-level timing; appropriate targeted uncertainty
- U06: explicit EMPTY_TRANSCRIPT validation error is safe and appropriate
- Q05: the quote-not-found finding correctly limits itself to normalized textual identity and explicitly disclaims translation verification. This is useful caution, but it does not assess whether the translation is faithful
- A05, R05, U02, U04: no case-specific detection of absent speaker identity, visual referents, sarcasm, or marked ASR ambiguity. Generic limitations cover some of these concerns but do not identify the actual missing evidence
- U05: the report is honest that semantics/publish safety are unassessed, but it should explicitly mention visual, music, thumbnail and audiovisual framing as outside the text-only review

In the baseline, quantity rules can be marked checked even where no selected quantity was comparable and a separate abstention warning is emitted. A UI should show compared versus unassessed candidates, not use checked as a green validation mark.

## Input handling and provenance

All eight frozen malformed cases handled safely under the protocol: four typed transcript exceptions, three explicit invalid-range findings, and one deterministic duplicate-ID normalization. Supplemental probes confirmed normalization produces unique IDs tied to source input positions; duplicate user-provided IDs do not collide. Supplied custom IDs are discarded rather than preserved as an external sourceId, which integrators should know when linking evidence back to their own data.

Nine supplemental interface probes passed: JSON/SRT/VTT timing/text equivalence, WebVTT speaker extraction, three non-finite time rejections, mixed-validity range failure, unique normalized IDs, no caller-input mutation, and explicit no-signal limitations. These were authored after baseline inspection and are not independent semantic evidence.

## Supplemental development findings, outside frozen metrics

`post-baseline-semantic-probes.json` records:

- D01: Maya says “We should stop now.” and Leo says “Then continue tomorrow.” A title quoting both as one Maya utterance receives no signal
- D02: “We are now here.” becomes “We are nowhere.” and receives no signal
- D03: “I will re-sign tomorrow.” becomes “I will resign tomorrow.” and receives no signal
- D04: a simple unresolved “It was broken” probe triggers a dangling-opening warning in the later working revision. This does not change the frozen baseline R01 outcome

The first three are precise engineering repros, not a new representative benchmark. Preserve word boundaries and explicit speaker boundaries during quotation matching. Punctuation-only changes can also alter meaning; normalized identity must never be described as a semantic equivalence check.

## Suggested next steps

- Keep deterministic matching, heuristic alerts and unassessed meaning separate in report and UI
- Treat unknown/unsupported numbers, absent attribution evidence, partial cues and visual dependence as visible uncertainty, never green passes
- Reduce routine-edit warning noise or clearly classify it as structural information rather than suspected distortion
- Fix normalization/provenance mechanisms with general regression tests; do not add narrow phrase-specific rules to inflate this suite's score
- Continue real-data evaluation only with authorized sources, episode/source-disjoint splits, bilingual annotation and adjudication, and predeclared deployment gates. See the protocol
