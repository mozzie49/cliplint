// Re-run supplemental development probes. These never contribute to frozen-set metrics.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const here=path.dirname(new URL(import.meta.url).pathname);
const engine=process.env.CLIPLINT_ENGINE || [path.resolve(here,'../engine'),path.resolve(here,'../cliplint-engine')].find(root=>fs.existsSync(path.join(root,'src/index.js')));
if(!engine) throw Error('ClipLint engine not found. Set CLIPLINT_ENGINE to the engine root directory.');
const {reviewClip}=await import(pathToFileURL(path.join(engine,'src/index.js')).href);
const name=process.argv[2]||'post-baseline-probes-regression';if(!/^[\w-]+$/.test(name))throw Error('Invalid output slug');
const dest=path.join(here,name+'.json');if(fs.existsSync(dest))throw Error('Refusing to overwrite existing results');
const input=JSON.parse(fs.readFileSync(path.join(here,'post-baseline-semantic-probes.json'),'utf8'));
const probes=input.probes.map(({result,...p})=>({...p,result:reviewClip(p.input)}));
fs.writeFileSync(dest,JSON.stringify({synthetic:true,not_independent_holdout:true,not_in_frozen_semantic_metrics:true,at:new Date().toISOString(),probes},null,2)+'\n');
for(const p of probes)console.log(JSON.stringify({id:p.id,status:p.result.status,rules:p.result.issues.map(i=>i.ruleId),warnings:p.result.warnings}));
