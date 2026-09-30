# Validation notes

## First-party tests

The implementation includes 75 `node:test` tests covering parser formats and malformed input, range boundaries and overlap, cue-level timing abstention, English/Chinese qualifier linking, count/magnitude/time-unit checks and uncertain transcriptions, quotation normalization/ellipsis/speaker boundaries, explicit attribution, deterministic output, Markdown escaping, limits, and CLI file/exit/overwrite behavior.

Run `node --test` from the project root. These are authored regression tests and prove only the checked mechanics. They do not measure real-world accuracy or safety. Tests ran successfully in the development environment on Node v24.19.0; the package targets Node >=20, but other runtimes were not independently certified.

## Independent synthetic challenge

A separate evaluator authored and froze 54 bilingual synthetic labeled examples (plus 8 malformed-input cases) before reading this implementation. The first baseline surfaced false alarms around honest quote ellipses/harmless edits and important missed numeric and semantic cases. Once those results were inspected, subsequent changes were development regression work, **not an unbiased re-evaluation**.

No percentage from this small synthetic set establishes accuracy, robustness, editorial correctness, or suitability for automatic publishing. The source of the examples, implementation revision, baseline and later regression runs should remain separately labeled. Do not merge development-tuned cases into an “independent benchmark” claim.

## Known gaps retained honestly

- Full-clip paraphrase negation reversal and strengthened conditions may go undetected
- Matched numeric values assigned to the wrong roles may go undetected
- Attribution is only a narrow comparison of explicit known-name labels, exact quoted wording, and source speaker metadata
- Word-level subtitle timing, waveform/audio, video, captions on screen, music, and thumbnails are not examined
- ASR and speaker diarization errors are outside engine validation
- Ordered quote ellipses may remove meaning-critical content while satisfying text matching
- English written-out numerals, unsupported units, and complex Chinese number notation may abstain or escape detection

Recommended next validation is a separately held-out, rights-cleared human-annotated corpus of real editing decisions with double adjudication, per-rule false-positive/false-negative analysis, timing precision labels, and a clear editorial task definition. That work has not been performed here.
