import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

const here=path.dirname(new URL(import.meta.url).pathname);
const engine=process.env.CLIPLINT_ENGINE || [path.resolve(here,'../engine'),path.resolve(here,'../cliplint-engine')].find(root=>fs.existsSync(path.join(root,'src/index.js')));
if(!engine) throw Error('ClipLint engine not found. Set CLIPLINT_ENGINE to the engine root directory.');
const outName=process.argv[2] || 'baseline';
if(!/^[a-zA-Z0-9_-]+$/.test(outName)) throw Error('Output name must be a simple slug.');
const outDir=path.join(here,'runs',outName);
if(fs.existsSync(outDir)) throw Error(`Refusing to overwrite an existing evaluation: ${outDir}`);
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const manifest=JSON.parse(fs.readFileSync(path.join(here,'frozen-manifest.json'),'utf8'));
for(const [file,want] of Object.entries(manifest.files)) {
  const actual=sha(fs.readFileSync(path.join(here,file)));
  if(actual!==want) throw Error(`Frozen case data changed: ${file}`);
}
const lib=await import(pathToFileURL(path.join(engine,'src/index.js')).href);
if(typeof lib.reviewClip!=='function') throw Error('reviewClip export absent.');
const dataset=JSON.parse(fs.readFileSync(path.join(here,'cases.synthetic.v1.json'),'utf8'));
const malformed=JSON.parse(fs.readFileSync(path.join(here,'malformed.synthetic.v1.json'),'utf8'));
const labels=['numeric_mismatch','omitted_condition','negation_reversal','unsupported_quote','misattribution','misleading_splice','incomplete_reference'];
const ruleProjection={NUMBER_MISMATCH:'numeric_mismatch',NUMBER_OUTSIDE_CLIP:'numeric_mismatch',OMITTED_QUALIFIER:'omitted_condition',QUOTE_NOT_FOUND:'unsupported_quote',QUOTE_OUTSIDE_CLIP:'unsupported_quote',QUOTE_ATTRIBUTION_MISMATCH:'misattribution',DANGLING_OPENING:'incomplete_reference',STITCH_CONTEXT:'misleading_splice'};
const knownNonsemantic=new Set(['PARTIAL_CUE','RANGE_INVALID','RANGE_EMPTY','RANGE_OVERLAP']);
const hashTree={};
function hashFiles(dir) { for(const f of fs.readdirSync(dir,{withFileTypes:true})) { const full=path.join(dir,f.name); if(f.isDirectory()&&!['node_modules','.git'].includes(f.name)) hashFiles(full); else if(f.isFile()&&(/\.(m?js|cjs|json)$/.test(f.name))) hashTree[path.relative(engine,full)]=sha(fs.readFileSync(full)); } }
hashFiles(engine);
function runCase(c) {
  const input={transcript:c.source_cues,ranges:c.clip_ranges,title:c.title,copy:c.copy,contextWindowSeconds:12};
  try {
    const result=lib.reviewClip(input);
    const ruleIds=[...new Set((result?.issues||[]).map(x=>x.ruleId))];
    const predicted=[...new Set(ruleIds.map(r=>ruleProjection[r]).filter(Boolean))].sort();
    const gold=c.expected?.labels?.filter(x=>labels.includes(x)).sort()||[];
    return {id:c.id,language:c.language,mode:c.expected?.mode||'malformed',focus:c.focus||c.description,expected:c.expected,
      ruleIds,predicted,gold,missing:gold.filter(x=>!predicted.includes(x)),extra:predicted.filter(x=>!gold.includes(x)),result};
  } catch(e) {return {id:c.id,language:c.language,mode:c.expected?.mode||'malformed',focus:c.focus||c.description,expected:c.expected,predicted:[],gold:c.expected?.labels?.filter(x=>labels.includes(x)).sort()||[],error:{name:e.name,code:e.code,message:e.message,details:e.details}};}
}
const rows=dataset.cases.map(runCase);
const malformedRows=malformed.cases.map(runCase);
const valid=rows.filter(r=>r.mode!=='abstain');
const div=(a,b)=>b?a/b:null;
const f1=(p,r)=>p===null||r===null?null:p+r?2*p*r/(p+r):0;
function metricsFor(data) {
 const perLabel=Object.fromEntries(labels.map(l=>{
  let tp=0,fp=0,fn=0;
  for(const r of data){const g=r.gold.includes(l),p=r.predicted.includes(l);if(g&&p)tp++;else if(!g&&p)fp++;else if(g&&!p)fn++;}
  const precision=div(tp,tp+fp),recall=div(tp,tp+fn);
  return [l,{tp,fp,fn,support:tp+fn,predictions:tp+fp,precision,recall,f1:tp+fn>0&&tp+fp===0?0:f1(precision,recall)}];
 }));
 const entries=Object.values(perLabel);
 const mean=vs=>vs.length?vs.reduce((a,b)=>a+b,0)/vs.length:null;
 const macro={precision:mean(entries.map(x=>x.precision).filter(x=>x!==null)),precisionCategoryCount:entries.filter(x=>x.precision!==null).length,recall:mean(entries.map(x=>x.recall).filter(x=>x!==null)),recallCategoryCount:entries.filter(x=>x.recall!==null).length,f1:mean(entries.map(x=>x.f1).filter(x=>x!==null))};
 const sums=entries.reduce((a,x)=>({tp:a.tp+x.tp,fp:a.fp+x.fp,fn:a.fn+x.fn}),{tp:0,fp:0,fn:0});
 const p=div(sums.tp,sums.tp+sums.fp),r=div(sums.tp,sums.tp+sums.fn);
 const micro={...sums,precision:p,recall:r,f1:f1(p,r)};
 const goldPos=data.filter(r=>r.mode==='flag'),clear=data.filter(r=>r.mode==='clear');
 const caseLevel={positiveCount:goldPos.length,controlCount:clear.length,trueAlertCount:goldPos.filter(r=>r.predicted.length).length,falseAlertCount:clear.filter(r=>r.predicted.length).length,missedCaseIds:goldPos.filter(r=>!r.predicted.length).map(r=>r.id),falseAlertCaseIds:clear.filter(r=>r.predicted.length).map(r=>r.id)};
 caseLevel.anyAlertRecall=div(caseLevel.trueAlertCount,caseLevel.positiveCount);caseLevel.controlFalseAlertRate=div(caseLevel.falseAlertCount,caseLevel.controlCount);
 return {count:data.length,perLabel,macro,micro,caseLevel,exactLabelAgreement:{count:data.filter(r=>JSON.stringify(r.predicted)===JSON.stringify(r.gold)&&!r.error).length,total:data.length}};
}
const nonInfoRows=valid.map(r=>({...r,predicted:[...new Set((r.result?.issues||[]).filter(i=>i.severity!=='info').map(i=>ruleProjection[i.ruleId]).filter(Boolean))].sort()}));
const counts={};for(const r of rows)for(const id of r.ruleIds||[])counts[id]=(counts[id]||0)+1;
const report={evaluationVersion:'v1',run:outName,at:new Date().toISOString(),synthetic:true,independentGoldUnchanged:true,disclaimer:dataset.disclaimer,enginePath:engine,engineFileHashes:hashTree,datasetHashes:manifest.files,ruleProjection,unknownRuleIds:Object.keys(counts).filter(r=>!ruleProjection[r]&&!knownNonsemantic.has(r)),rawRuleCaseCounts:counts,semantic:metricsFor(valid),nonInfoSemantic:metricsFor(nonInfoRows),byLanguage:Object.fromEntries(['en','zh','mixed'].map(l=>[l,metricsFor(valid.filter(r=>r.language===l))])),abstentions:rows.filter(r=>r.mode==='abstain'),malformed:malformedRows,errors:rows.filter(r=>r.error).map(r=>({id:r.id,error:r.error})),rows};
fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,'results.json'),JSON.stringify(report,null,2)+'\n');
const percentage=x=>x===null?'undefined':(x*100).toFixed(1)+'%';
let summary=`# Synthetic adversarial evaluation: ${outName}\n\n${report.disclaimer}\n\nGold labels remained unchanged. Engine artifact hashes and full raw findings are in results.json.\n\n## Semantic projections on ${valid.length} determinate cases\n\n`;
summary+='| Category | TP | FP | FN | Precision | Recall | F1 |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: |\n';
for(const [label,m] of Object.entries(report.semantic.perLabel))summary+=`| ${label} | ${m.tp} | ${m.fp} | ${m.fn} | ${percentage(m.precision)} | ${percentage(m.recall)} | ${percentage(m.f1)} |\n`;
summary+=`\nMacro precision (${report.semantic.macro.precisionCategoryCount} predicted categories): ${percentage(report.semantic.macro.precision)}. Macro recall (${report.semantic.macro.recallCategoryCount} supported categories): ${percentage(report.semantic.macro.recall)}. Macro F1: ${percentage(report.semantic.macro.f1)}. Micro precision/recall/F1: ${percentage(report.semantic.micro.precision)} / ${percentage(report.semantic.micro.recall)} / ${percentage(report.semantic.micro.f1)}.\n\n`;
summary+=`Any projected rule output on positives (including info): ${report.semantic.caseLevel.trueAlertCount}/${report.semantic.caseLevel.positiveCount}. Benign controls with projected outputs (including info): ${report.semantic.caseLevel.falseAlertCount}/${report.semantic.caseLevel.controlCount}. Exact substantive label-set matches: ${report.semantic.exactLabelAgreement.count}/${report.semantic.exactLabelAgreement.total}.\n\nMissed cases: ${report.semantic.caseLevel.missedCaseIds.join(', ')||'none'}.\n\nFalse-alert control cases: ${report.semantic.caseLevel.falseAlertCaseIds.join(', ')||'none'}.\n\n`;
summary+=`Supplementary non-info view: ${report.nonInfoSemantic.caseLevel.trueAlertCount}/${report.nonInfoSemantic.caseLevel.positiveCount} positive cases warned; ${report.nonInfoSemantic.caseLevel.falseAlertCount}/${report.nonInfoSemantic.caseLevel.controlCount} benign controls warned. This does not replace the original all-rule projection.\n\n`;
summary+='## Case-level discrepancies\n\n';
for(const row of valid.filter(r=>r.missing?.length||r.extra?.length||r.error))summary+=`- ${row.id} (${row.focus}): missing [${(row.missing||row.gold).join(', ')}]; extra [${(row.extra||[]).join(', ')}]; rules [${(row.ruleIds||[]).join(', ')}]${row.error?`; ERROR ${row.error.name}: ${row.error.message}`:''}\n`;
summary+='\n## Abstention outputs, requiring manual assessment\n\n';for(const row of report.abstentions)summary+=`- ${row.id} (${row.focus}): ${row.error?`ERROR ${row.error.name}: ${row.error.message}`:`rules [${row.ruleIds.join(', ')}], semanticAssessment=${JSON.stringify(row.result.semanticAssessment)}`}\n`;
summary+='\n## Malformed outputs, separate from semantic metrics\n\n';for(const row of malformedRows)summary+=`- ${row.id} (${row.focus}): ${row.error?`ERROR ${row.error.name}: ${row.error.message}`:`rules [${row.ruleIds.join(', ')}]`}\n`;
summary+=`\nUnmapped public rules: ${report.unknownRuleIds.join(', ')||'none'}.\n\nNo metric above is a production accuracy estimate. Subsequent tuning on these cases turns this into a known regression suite.\n`;
fs.writeFileSync(path.join(outDir,'SUMMARY.md'),summary);
console.log(summary);
