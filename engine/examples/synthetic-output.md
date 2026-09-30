# ClipLint source-context review

Status: **needs-review** · 5 signal(s)

**Heuristic preflight only. No truth, legal, copyright, or publish-safety verdict.**

Source: 5 cues · 00:00:20.000

## Draft

Title: AI降低80%的客服成本

Copy: “所有客服岗位都会消失”

## Review signals

### issue-1 · Opening may depend on earlier context

Rule: DANGLING\_OPENING · Severity: low · heuristic · Signal confidence: low

The first selected cue begins with a reference or consequence cue that may rely on omitted speech.

Next step: Check whether the audience can identify the referent; extend the opening or add a faithful context label.

Uncertainty: Pronouns and transitions can be fully understandable on their own. This rule does not resolve references.

- 00:00:04.000–00:00:08.000 (omitted; 演示嘉宾): 如果只处理简单问题，成本可以降低。
- 00:00:08.000–00:00:12.000 (selected; 演示嘉宾): 这样可以降低20%的客服成本。

### issue-2 · A nearby qualifier is outside the selection

Rule: OMITTED\_QUALIFIER · Severity: medium · heuristic · Signal confidence: low

An omitted cue before this range contains condition language and may qualify the selected statement.

Next step: Listen to both cues together. Include the qualifier or adjust the copy if it changes the intended claim.

Uncertainty: Adjacency, cue words, and shared terms do not establish logical scope. Speaker attribution is checked only when both cues explicitly provide it.

- 00:00:04.000–00:00:08.000 (omitted; 演示嘉宾): 如果只处理简单问题，成本可以降低。
- 00:00:08.000–00:00:12.000 (selected; 演示嘉宾): 这样可以降低20%的客服成本。

### issue-3 · A nearby qualifier is outside the selection

Rule: OMITTED\_QUALIFIER · Severity: medium · heuristic · Signal confidence: low

An omitted cue after this range contains negation/qualification language and may qualify the selected statement.

Next step: Listen to both cues together. Include the qualifier or adjust the copy if it changes the intended claim.

Uncertainty: Adjacency, cue words, and shared terms do not establish logical scope. Speaker attribution is checked only when both cues explicitly provide it.

- 00:00:12.000–00:00:16.000 (omitted; 演示嘉宾): 但是，这只是小样本，不能推广到所有业务。
- 00:00:08.000–00:00:12.000 (selected; 演示嘉宾): 这样可以降低20%的客服成本。

### issue-4 · Draft quantity is not matched in selected cues

Rule: NUMBER\_MISMATCH · Severity: medium · heuristic · Signal confidence: medium

“80%” has no equivalent quantity in the selected transcript; it contains different percent quantities.

Next step: Verify the number and its referent against the recording. Correct the draft if it is intended to restate this passage.

Uncertainty: This compares literal quantities and exact ms/second/minute/hour scaling, not other conversions, arithmetic, valid rounding, attribution, or semantic equivalence. Percent and percentage points are separate.

- 00:00:08.000–00:00:12.000 (selected; 演示嘉宾): 这样可以降低20%的客服成本。

### issue-5 · Quoted wording was not found verbatim

Rule: QUOTE\_NOT\_FOUND · Severity: medium · deterministic · Signal confidence: high

“所有客服岗位都会消失” has no normalized match within one continuous speaker block in the supplied transcript.

Next step: Check the recording and quotation. Use exact wording or clearly label a paraphrase.

Uncertainty: Matching ignores case and ordinary punctuation, preserves English word boundaries/hyphens, and permits ordered ellipsis fragments. Ellipses may still omit meaning-critical context. Audio, ASR accuracy, translation, and rhetorical use of quotes are unassessed.

- 00:00:00.000–00:00:04.000 (omitted; 演示嘉宾): 我们测试了客服自动化。
- 00:00:08.000–00:00:12.000 (selected; 演示嘉宾): 这样可以降低20%的客服成本。
- 00:00:12.000–00:00:16.000 (omitted; 演示嘉宾): 但是，这只是小样本，不能推广到所有业务。

## Coverage

- RANGE\_INVALID: checked
- RANGE\_EMPTY: checked
- RANGE\_OVERLAP: skipped — Only one range was selected.
- PARTIAL\_CUE: checked
- OMITTED\_QUALIFIER: checked
- DANGLING\_OPENING: checked
- STITCH\_CONTEXT: skipped — Only one range was selected.
- NUMBER\_MISMATCH: checked
- NUMBER\_OUTSIDE\_CLIP: checked
- QUOTE\_NOT\_FOUND: checked
- QUOTE\_OUTSIDE\_CLIP: checked
- QUOTE\_ATTRIBUTION\_MISMATCH: skipped — No comparable quote attribution with known explicit source speaker metadata.

## Limits

- A source-context preflight, not a truth, legal, copyright, consent, or publish-safety check. No model is called.
- No signals means no implemented rule fired. It is not evidence that a clip is faithful, accurate, or safe to publish.
- Cue-level timestamps include whole overlapping cues; exact retained words require audio or word-level timing.
- English and Chinese lexicons are incomplete. Negation, sarcasm, scope, topic changes, and complex reference resolution may be missed or flagged incorrectly.
- Quantity matching handles supported Arabic and common Chinese cardinal numerals with explicit units. Only ms/second/minute/hour scaling is converted; no arithmetic, currency conversion, role assignment, or rounding is inferred. Same value does not establish same referent.
- The supplied transcript may be incomplete or wrong. Speaker metadata is used only when explicitly supplied.
- Visual edits, thumbnails, on-screen text, tone, music, delivery, and actual media timing are not inspected.

Semantic assessment: unassessed. No model or semantic truth assessment runs. Human review of audio, meaning, attribution, and intent remains necessary.
