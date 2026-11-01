import {WebR,ChannelType} from 'webr';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const r=new WebR({channelType:ChannelType.PostMessage,interactive:false});
try {
 await r.init();(async()=>{for await(const e of r.stream())if(e.type==='stderr')console.log(e.data);})().catch(()=>{});
 await r.installPackages(['lavaan','jsonlite','semTools']);
 for(const p of ['app','app/src','app/src/r','app/scripts','fixtures','evidence','evidence/phase-4','.Rlib'])await r.FS.mkdir('/home/web_user/'+p);
 for(const p of ['app/src/r/compile.R','app/src/r/edit.R','app/src/r/analysis.R','app/src/r/advanced.R','app/scripts/check-advanced.R','fixtures/models.json'])await r.FS.writeFile('/home/web_user/'+p,await readFile(p));
 await r.evalRVoid('setwd("/home/web_user/app"); options(forma.advancedEvidence="../evidence/phase-4/wasm.json"); source("scripts/check-advanced.R")');
 await mkdir('evidence/phase-4',{recursive:true});await writeFile('evidence/phase-4/wasm.json',await r.FS.readFile('/home/web_user/evidence/phase-4/wasm.json'));
 console.log('PASS: actual WebAssembly advanced-analysis checks.');
} finally {await r.close();}
