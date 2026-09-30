# ClipLint

[中文说明](#中文说明) · [Source repository](https://github.com/mozzie49/cliplint)

A local-first, bilingual pre-publication review workbench for interview and podcast clips. Compare selected source ranges and publishing copy against a timestamped transcript, inspect concrete rule signals in context, and keep an auditable human review trail.

**Status: working v0.1 prototype.** The engine is deterministic/heuristic. It does not call an AI model. Demand, adoption, and effectiveness in real editorial workflows have not been validated. There are no claimed users, accuracy guarantees, or publish-safety scores.

## Run offline

Requires Node.js 20+ for the included server. No production dependencies, account, API key, build step, or internet connection is required.

```sh
node server.mjs
# Open http://localhost:4173
```

Alternatively, serve the `dist/` directory with any static HTTP server. ES modules need HTTP; opening `index.html` as a `file://` URL is not supported. The hosted edition requires its hosting account’s access controls; the local edition does not.

## Use

1. Paste or open an SRT, WebVTT, or JSON transcript (UTF-8, up to 2 MiB).
2. Enter kept source ranges in playback order. Use seconds or `HH:MM:SS.mmm`; up to 30 ranges in the UI. Expanded repeated transcript text is limited to 4 million characters.
3. Add the publishing title and copy, then run review.
4. Compare each signal with source context. Full-cue retention, omitted cues, and partial-cue overlap are labelled separately. Partial overlap never proves words survive the cut.
5. Mark signals reviewed or dismissed, with a written reason. These are your judgments, not a tool verdict.
6. Save project JSON for later, or export an auditable JSON/Markdown report. Imported projects are recomputed; decisions are restored only when the finding signature still matches.

The initial Chinese and English examples are explicitly fictional. Findings are computed from editable inputs, never hardcoded. Switching language on a modified project preserves its inputs; use “Reload example” to load that language’s synthetic example.

### JSON transcript

```json
[
  {"start":0,"end":4,"text":"This is a small pilot.","speaker":"Guest"},
  {"start":4,"end":8,"text":"We saw a 20% reduction.","speaker":"Guest"}
]
```

Use seconds and preserve source order. The engine also supports documented object wrappers; see `engine/README.md`. Speaker attribution is only as reliable as explicit input metadata. Names embedded in free text are not a verified identity system.

## What the rules cover

- Invalid, empty, overlapping, or partially intersected source ranges
- Nearby omitted qualification or negation cues, dependent openings, and discontinuous joins
- Literal numeric quantities and quoted wording missing from selected material, with whole-source vs selected-source distinctions
- Boundary uncertainty and explicit abstention where cue-level timing cannot establish retained wording

Each report exposes rule coverage, warnings, evidence, and limitations. Lexical signals can be wrong; read the evidence, not just the count.

## What it cannot establish

ClipLint is **not a fact checker, legal checker, consent/copyright check, misinformation classifier, or semantic fidelity model**. Zero signals means no implemented rule fired. **Semantic fidelity remains unassessed.** It cannot certify that a clip is faithful, truthful, fair, or safe to publish.

Misses/false positives can arise from: sarcasm; long-distance context; reference resolution; scope; deliberate paraphrases; rounding and unit conversions; speaker changes; noisy transcripts; and incomplete Chinese/English lexicons. Subtitle timing is usually cue-level, not word-level. Matching the same number does not prove it refers to the same thing.

## Privacy and persistence

The application has no telemetry, backend, model calls, or third-party asset requests. It does not automatically use localStorage, sessionStorage, IndexedDB, cookies, or service workers. Source text and decisions stay in the current page’s memory. A hosted instance still loads static files through its hosting platform, whose authentication and infrastructure are outside this application.

Closing or reloading the page clears the working project. Only explicit downloads preserve it. Project and report downloads contain the full original source; handle them as confidential when appropriate. Project imports are capped at 8 MiB. Source text is escaped before display, and oversized input is rejected.

## Architecture

- `dist/index.html`, `styles.css`, `app.js`: dependency-free accessible browser UI
- `dist/engine/`: browser-compatible ESM engine snapshot
- `engine/`: independent engine source, CLI, fixtures, and tests
- `tests/workbench.test.mjs`: DOM integration tests using jsdom (development-only)
- `examples/`: synthetic input and sample output
- `evaluation/`: independent synthetic regression evidence, when included; read its scope and limitations
- `server.mjs`: minimal static development server

There is no hidden semantic scoring or remote service. A future model-assisted pass would require explicit data handling, evaluation, and user consent; it is not implemented here.

## Test

```sh
npm ci
npm test
npm run check
```

`npm ci` downloads the development-only DOM test dependency. Running the app and engine does not need it. The root test command runs both workbench and engine suites. After editing `engine/src`, run `npm run sync:engine` to update browser modules. GitHub Actions runs the same tests on Node 20 and 22 when the workflow is pushed.

The workbench tests exercise locale switching, computed examples, review actions, validation, stale-result blocking, safe rendering, imports/exports, and no-surprise-storage behavior. DOM tests do not establish pixel-level rendering. See `QA.md` for the exact verified scope and remaining checks.

## License

MIT for this repository’s original code and synthetic fixtures. No external video-editor implementation is included. Dependencies retain their own licenses. ClipLint is a provisional project name, with no exclusivity or trademark clearance claim.

---

# 中文说明

ClipLint 是一个本地优先的访谈／播客切片发布前审校工作台。它把保留的原片时间段、发布文案和逐字稿放到同一个工作流中，显示可追溯的规则提示，并记录编辑者自己的判断。

**当前是可运行的 v0.1 原型，不是经过真实用户验证的 SaaS 产品。** 检查引擎使用确定性规则和轻量启发式；此版本没有调用大模型，没有语义评分，也不承诺检测准确率或发布安全性。

## 本地运行

安装 Node.js 20+，在目录中运行 `node server.mjs`，浏览器打开 `http://localhost:4173`。无需安装生产依赖、注册账号或配置 API key；下载代码后可完全离线运行。也可用任意静态 HTTP 服务器托管 `dist/`。不支持直接用 `file://` 打开模块文件。

## 操作流程

- 粘贴或选择 SRT、VTT、JSON 逐字稿（UTF-8，最大 2 MiB）
- 按成片顺序填写保留时间段，支持秒数或 `HH:MM:SS.mmm`，界面最多 30 段；重复段展开后的文本最多 400 万字符
- 填写发布标题和文案，运行审校
- 查看每条提示对应的原话及上下文；部分重叠只表示时间范围交叉，不证明整句话被保留
- 填写理由，再标记“已审阅”或“已忽略”
- 下载项目 JSON，或导出包含原文和人工判断的 JSON／Markdown 审校记录

默认中英文示例均为虚构测试材料。所有提示都由真实规则计算，修改后可重新运行。导入项目时会重新计算，仅恢复签名一致的提示判断。

## 边界与隐私

本工具不是事实、法律、版权、同意授权或语义忠实度检查器。没有提示不代表通过，**语义忠实度始终尚未评估**。反讽、远距离上下文、归因、单位换算、同义改写、字幕错误等均可能导致漏报或误报。

应用不上传稿件、不调用模型 API、不收集遥测，也不会自动写入浏览器存储。线上版仍需加载托管平台的静态资源，并受平台访问控制约束。稿件仅保存在当前页面内存中；关闭／刷新即清除。点击保存才会下载文件。导出包含完整原文，分享前请注意保密。项目导入上限为 8 MiB。

测试运行 `npm ci && npm test`；该安装仅用于 DOM 集成测试。运行界面与引擎本身无需依赖安装。`QA.md` 说明已验证范围与未完成的浏览器渲染验证；独立评估结果以附带报告为准，不代表实际编辑场景的准确率。

原创代码和合成示例使用 MIT 许可证。没有复制其他编辑器的实现。项目名称未做商标排他性承诺。
