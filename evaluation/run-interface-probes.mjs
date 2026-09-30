// Supplementary interface/robustness checks authored after the frozen semantic baseline.
// These are development probes, not independently held-out accuracy evidence.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const here=path.dirname(new URL(import.meta.url).pathname);
const engine=process.env.CLIPLINT_ENGINE || [path.resolve(here,'../engine'),path.resolve(here,'../cliplint-engine')].find(root=>fs.existsSync(path.join(root,'src/index.js')));
if(!engine) throw Error('ClipLint engine not found. Set CLIPLINT_ENGINE to the engine root directory.');
const {parseTranscript,reviewClip}=await import(pathToFileURL(path.join(engine,'src/index.js')).href);
const checks=[];
function check(id, description, fn) {try{const detail=fn();checks.push({id,description,status:'pass',detail});}catch(e){checks.push({id,description,status:'fail',error:{name:e.name,message:e.message}});}}
function assert(ok,message){if(!ok)throw Error(message);}
const body='We tested 25% of the sample. 第二步仍需验证。';
check('P01','JSON, SRT and VTT preserve text and timestamps',()=>{
 const samples=[[{id:'external-cue',start:1.25,end:4.5,text:body}],`1\n00:00:01,250 --> 00:00:04,500\n${body}\n`,`WEBVTT\n\nexample-id\n00:01.250 --> 00:04.500 align:start\n${body}\n`];
 const parsed=samples.map(x=>parseTranscript(x));
 assert(parsed.every(p=>p.cues.length===1&&p.cues[0].start===1.25&&p.cues[0].end===4.5&&p.cues[0].text===body),'Format parsing is not equivalent.');
 return parsed;
});
check('P02','WebVTT speaker tags retained as explicit metadata',()=>{
 const p=parseTranscript('WEBVTT\n\n00:00.000 --> 00:05.000\n<v Maya>Hello, world.</v>\n');
 assert(p.cues[0].speaker==='Maya'&&p.cues[0].text==='Hello, world.','Speaker tag not preserved/cleaned.');return p;
});
for(const [name,value] of [['NaN',NaN],['Infinity',Infinity],['negative infinity',-Infinity]])check('P03-'+name,'Reject non-finite cue timestamps',()=>{
 let rejected=false;try{parseTranscript([{start:value,end:5,text:'Hello.'}]);}catch(e){assert(e.name==='ClipLintError','Unexpected untyped crash');rejected=true;}assert(rejected,'Non-finite timestamp accepted');return {rejected};
});
check('P04','Invalid range prevents partial review of otherwise valid range',()=>{
 const r=reviewClip({transcript:[{start:0,end:5,text:'Only with permission.'}],ranges:[{start:0,end:5},{start:20,end:25}],title:'Always allowed'});
 assert(r.status==='invalid-input'&&r.issues.some(i=>i.ruleId==='RANGE_INVALID'),'Mixed valid/invalid ranges must be invalid-input.');
 assert(r.coverage.filter(c=>c.ruleId!=='RANGE_INVALID').every(c=>c.status==='skipped'),'Content checks should not certify a partial selection.');return {status:r.status,coverage:r.coverage};
});
check('P05','Duplicate supplied IDs normalize to unique evidence identifiers',()=>{
 const p=parseTranscript([{id:'same',start:0,end:2,text:'The first sentence.'},{id:'same',start:2,end:4,text:'The second sentence.'}]);
 assert(new Set(p.cues.map(c=>c.id)).size===2,'Duplicate normalized IDs.');
 assert(p.cues[0].start===0&&p.cues[1].start===2,'Lost source position mapping.');return p;
});
check('P06','Input array and range order are not mutated',()=>{
 const cues=[{id:'late',start:4,end:8,text:'Second thought.'},{id:'early',start:0,end:4,text:'First thought.'}];
 const ranges=[{start:4,end:8},{start:0,end:4}];const before=JSON.stringify({cues,ranges});
 reviewClip({transcript:cues,ranges,title:'Thoughts'});
 assert(before===JSON.stringify({cues,ranges}),'Review mutated caller-owned inputs.');return {unchanged:true};
});
check('P07','No-signal reports explicitly prohibit semantic certification',()=>{
 const r=reviewClip({transcript:[{start:0,end:5,text:'Hello, world.'}],ranges:[{start:0,end:5}],title:'Hello, world.'});
 assert(r.semanticAssessment?.status==='unassessed','Missing unassessed semantic state.');
 assert(r.limitations.some(s=>/not evidence|not proof/i.test(s)),'No explicit no-signal disclaimer.');return {status:r.status,semanticAssessment:r.semanticAssessment,limitations:r.limitations};
});
const out={synthetic:true,status:'post-baseline-development-probes',at:new Date().toISOString(),checks,passed:checks.filter(c=>c.status==='pass').length,failed:checks.filter(c=>c.status==='fail').length};
const name=process.argv[2]||'interface-probes';if(!/^[\w-]+$/.test(name))throw Error('Invalid output slug');
const dest=path.join(here,`${name}.json`);if(fs.existsSync(dest))throw Error('Refusing to overwrite existing probe results');
fs.writeFileSync(dest,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({passed:out.passed,failed:out.failed,checks:checks.map(({id,description,status,error})=>({id,description,status,error}))},null,2));
