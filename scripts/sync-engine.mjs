import {readdir,copyFile,mkdir} from 'node:fs/promises';
const source=new URL('../engine/src/',import.meta.url),target=new URL('../dist/engine/',import.meta.url);
await mkdir(target,{recursive:true});
for(const file of await readdir(source)){if(file.endsWith('.js'))await copyFile(new URL(file,source),new URL(file,target));}
console.log('Browser engine synchronized from engine/src.');
