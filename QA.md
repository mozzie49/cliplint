# Verification scope

Updated 2026-09-30 08:53 UTC. Synthetic inputs only; no real interview or private resume data.

## Reproducible source and tests

- At commit `a3ed02002e0cf03e4eb52d7e09868da6a14361c5`, every one of the 72 released source/documentation/evaluation files matched the frozen release byte-for-byte
- The separately published source ZIP also matches SHA-256 `c24173a014023f25c3e25f04643a9147713a145dd5bac52976cf035930b49ca4`
- Fresh public-repository checkout: 26/26 workbench DOM tests, 75/75 engine/parser/CLI tests, and syntax checks pass
- GitHub Actions succeeded on both Node 20 and Node 22: https://github.com/mozzie49/cliplint/actions/runs/36691548625
- Final independent synthetic development regression: see `evaluation/FINAL_REVIEW.md` and `evaluation/runs/revision-002/results.json`
- The frozen evaluation suite was used to fix defects, so its final scores are development regression evidence, not an unseen test-set or production accuracy claim

## Live desktop browser verification

The public static demo deployed successfully using GitHub Pages from the same source:
https://mozzie49.github.io/cliplint/dist/

Deployment: https://github.com/mozzie49/cliplint/actions/runs/36691783364

Verified in the live cloud Chrome browser:
- Desktop viewport rendered and visually inspected: input panel, computed review queue and original source context
- Default fictional Chinese example computes three findings
- Review requires a written reason; a valid review changes progress to one of three resolved
- A synthetic project imports successfully, switches to its English locale, and recomputes findings
- A whole-transcript, zero-signal selection explicitly says semantic fidelity is unassessed and is not a pass
- Changed inputs disable stale report export, and rerunning updates the computed count
- Malformed transcript text displays an explicit error and disables report export
- Reloading the example and switching language restore the three computed Chinese findings

## Remaining checks

- A native project-download event was not captured by this cloud browser despite the application's generated-download notice. Real-browser download completion remains unverified; DOM export and import round-trip tests pass
- Full-page screenshot capture timed out; the visible desktop viewport was captured and inspected
- Mobile/tablet rendering, other browser engines, screen-reader behavior, and broad keyboard-only/device testing remain unverified. Responsive CSS and focus safeguards are implemented but are not a substitute for those tests
- Before production use, test recent Chrome/Firefox/Safari, a screen reader, real SRT/VTT exports, larger transcripts and actual source-cue alignment using non-sensitive material

The initial private hosted preview could not be inspected in the cloud browser. The public Pages route enabled the desktop checks above; it does not establish private-host authentication behavior.
