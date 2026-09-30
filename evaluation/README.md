# ClipLint synthetic adversarial evaluation

54 fixed bilingual/mixed-language semantic cases, 8 separate malformed-input cases, and a reproducible local evaluator. All content is synthetic. No external transmissions and no production-accuracy claims.

## Start here

- `EVALUATION_PROTOCOL.md`: independent-label policy, category mappings, metrics, abstention review, deterministic/heuristic/unassessed distinctions, and future episode-level split protocol
- `FINAL_REVIEW.md`: final checkpoint, baseline-versus-regression comparison and remaining limits
- `BASELINE_REVIEW.md`: original independent interpretation and exact high-impact failures
- `cases.synthetic.v1.json`: frozen semantic inputs and labels
- `malformed.synthetic.v1.json`: frozen robustness cases
- `frozen-manifest.json`: SHA-256 integrity manifest
- `runs/baseline/SUMMARY.md`: first independent run
- `runs/baseline/results.json`: original raw findings, metrics, API projection and implementation fingerprints
- `runs/revision-002/{SUMMARY.md,results.json}`: final known-case development regression; intermediate revision-001 is retained

## Run locally

Requires Node.js and the ClipLint library. Set `CLIPLINT_ENGINE` to the engine root, or keep a sibling `engine/` (downloaded bundle layout) or `cliplint-engine/` (workspace layout). The runner selects the first existing supported layout. Historical outputs retain the original execution paths and hashes.

```sh
node run-evaluation.mjs local-check
node run-interface-probes.mjs interface-probes-local-check
```

The evaluator refuses to overwrite an existing run and verifies the frozen JSON checksums before testing. It does not modify the library. A rerun after tuning on these cases is a development regression, not a fresh independent evaluation.

`build_cases.py` records original case construction. Do not rerun it to change gold labels after viewing implementation results. A genuine labeling correction requires a new dataset version with a documented reason and the old version retained.

Supplemental `post-baseline-semantic-probes.json` and `interface-probes-baseline.json` are explicitly excluded from frozen semantic metrics. They were authored after baseline inspection. Any future production evaluation needs fresh source-disjoint data, independent labeling, and uncertainty reporting.
