# Synthetic adversarial evaluation: baseline

All people, episodes and factual scenarios are synthetic. This small challenge set is not representative and cannot establish real-world accuracy, safety, or editorial correctness.

Gold labels remained unchanged. Engine artifact hashes and full raw findings are in results.json.

## Semantic projections on 45 determinate cases

| Category | TP | FP | FN | Precision | Recall | F1 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| numeric_mismatch | 2 | 0 | 6 | 100.0% | 25.0% | 40.0% |
| omitted_condition | 1 | 1 | 8 | 50.0% | 11.1% | 18.2% |
| negation_reversal | 0 | 0 | 7 | undefined | 0.0% | 0.0% |
| unsupported_quote | 3 | 1 | 0 | 75.0% | 100.0% | 85.7% |
| misattribution | 0 | 0 | 4 | undefined | 0.0% | 0.0% |
| misleading_splice | 4 | 2 | 0 | 66.7% | 100.0% | 80.0% |
| incomplete_reference | 1 | 0 | 3 | 100.0% | 25.0% | 40.0% |

Macro precision (5 predicted categories): 78.3%. Macro recall (7 supported categories): 37.3%. Macro F1: 37.7%. Micro precision/recall/F1: 73.3% / 28.2% / 40.7%.

Any substantive warning on positives: 11/28. Benign controls with warnings: 3/17. Exact substantive label-set matches: 20/45.

Missed cases: N01, N03, N05, N06, N07, N08, C02, C03, C04, C05, C06, Q04, A01, A02, A03, R01, R03.

False-alert control cases: Q08, S05, S07.

## Case-level discrepancies

- N01 (changed integer): missing [numeric_mismatch]; extra []; rules []
- N03 (same value wrong unit): missing [numeric_mismatch]; extra []; rules []
- N05 (range converted to certainty): missing [numeric_mismatch, omitted_condition]; extra []; rules []
- N06 (numeric relation reversal): missing [negation_reversal, numeric_mismatch]; extra []; rules []
- N07 (Chinese numeral magnitude): missing [numeric_mismatch]; extra []; rules []
- N08 (all numbers present but roles swapped): missing [numeric_mismatch]; extra []; rules []
- C01 (condition in previous cue): missing [incomplete_reference]; extra []; rules [OMITTED_QUALIFIER]
- C02 (exception removed): missing [omitted_condition]; extra []; rules []
- C03 (negation dropped in copy): missing [negation_reversal]; extra []; rules []
- C04 (double-negative misread): missing [negation_reversal]; extra []; rules []
- C05 (tentative claim made categorical): missing [omitted_condition]; extra []; rules []
- C06 (unless exception omitted): missing [omitted_condition]; extra []; rules []
- Q03 (quote assembled across contrast): missing [negation_reversal]; extra []; rules [QUOTE_NOT_FOUND]
- Q04 (quote attributed to wrong context): missing [misattribution, omitted_condition]; extra []; rules []
- Q08 (clearly marked quote omission): missing []; extra [unsupported_quote]; rules [QUOTE_NOT_FOUND]
- A01 (wrong named speaker): missing [misattribution]; extra []; rules []
- A02 (host question changed to guest claim): missing [misattribution, negation_reversal]; extra []; rules []
- A03 (reported claim treated as endorsement): missing [misattribution, negation_reversal]; extra []; rules []
- S01 (split retraction dropped): missing [omitted_condition]; extra []; rules [STITCH_CONTEXT]
- S02 (split removes intervening negation): missing [negation_reversal]; extra [omitted_condition]; rules [OMITTED_QUALIFIER, STITCH_CONTEXT]
- S03 (juxtaposition changes causal relation): missing [omitted_condition]; extra []; rules [STITCH_CONTEXT]
- S05 (safe discontinuous list): missing []; extra [misleading_splice]; rules [STITCH_CONTEXT]
- S07 (irrelevant omitted context benign): missing []; extra [misleading_splice]; rules [STITCH_CONTEXT]
- R01 (unresolved leading pronoun): missing [incomplete_reference]; extra []; rules []
- R03 (unfinished clause at clip end): missing [incomplete_reference, omitted_condition]; extra []; rules []

## Abstention outputs, requiring manual assessment

- Q05 (unmarked translation presented verbatim): rules [QUOTE_NOT_FOUND], semanticAssessment={"status":"unassessed","reason":"No model or semantic truth assessment runs. Human review of audio, meaning, attribution, and intent remains necessary."}
- A05 (speaker identity unavailable): rules [], semanticAssessment={"status":"unassessed","reason":"No model or semantic truth assessment runs. Human review of audio, meaning, attribution, and intent remains necessary."}
- R05 (visual referent unknown): rules [], semanticAssessment={"status":"unassessed","reason":"No model or semantic truth assessment runs. Human review of audio, meaning, attribution, and intent remains necessary."}
- U01 (world truth outside source scope): rules [], semanticAssessment={"status":"unassessed","reason":"No model or semantic truth assessment runs. Human review of audio, meaning, attribution, and intent remains necessary."}
- U02 (sarcasm requires prosody): rules [], semanticAssessment={"status":"unassessed","reason":"No model or semantic truth assessment runs. Human review of audio, meaning, attribution, and intent remains necessary."}
- U03 (cut falls inside cue): rules [PARTIAL_CUE], semanticAssessment={"status":"unassessed","reason":"No model or semantic truth assessment runs. Human review of audio, meaning, attribution, and intent remains necessary."}
- U04 (ASR uncertainty marked): rules [], semanticAssessment={"status":"unassessed","reason":"No model or semantic truth assessment runs. Human review of audio, meaning, attribution, and intent remains necessary."}
- U05 (unannotated edit effect unknown): rules [], semanticAssessment={"status":"unassessed","reason":"No model or semantic truth assessment runs. Human review of audio, meaning, attribution, and intent remains necessary."}
- U06 (no source text supplied): ERROR ClipLintError: Transcript must contain at least one timed cue.

## Malformed outputs, separate from semantic metrics

- M01 (Negative cue start): ERROR ClipLintError: Timestamp must be a finite non-negative number within 7 days.
- M02 (Cue end precedes start): ERROR ClipLintError: Cue 1 must end after it starts.
- M03 (Zero-length clip range): rules [RANGE_INVALID]
- M04 (Timestamp string instead of number): ERROR ClipLintError: Invalid timestamp: bad
- M05 (Duplicate cue identifiers): rules []
- M06 (Null required cue text): ERROR ClipLintError: Cue 1 text must be a string.
- M07 (Clip selection outside source extent): rules [RANGE_INVALID]
- M08 (Reversed clip range): rules [RANGE_INVALID]

Unmapped public rules: none.

No metric above is a production accuracy estimate. Subsequent tuning on these cases turns this into a known regression suite.
