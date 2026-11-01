// Actual webR/WASM execution in Node. This does not count as a browser UI check.
import {WebR,ChannelType} from 'webr';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
const r=new WebR({channelType:ChannelType.PostMessage,interactive:false});
try{
 await r.init();
 (async()=>{for await(const event of r.stream())if(['stdout','stderr'].includes(event.type))console.log(event.data);})().catch(()=>{});
 await r.installPackages(['lavaan','jsonlite','readxl','haven']);
 for(const p of ['app','app/src','app/src/r','app/scripts','fixtures','fixtures/data','evidence','evidence/phase-2','.Rlib'])await r.FS.mkdir('/home/web_user/'+p);
 for(const p of ['app/src/r/compile.R','app/src/r/analysis.R','app/scripts/check-analysis.R','fixtures/models.json',...(await readdir('fixtures/data')).filter(p=>/\.(csv|xlsx|sav)$/.test(p)).map(p=>'fixtures/data/'+p)]){
   await r.FS.writeFile('/home/web_user/'+p,await readFile(p));
 }
 await r.evalRVoid('setwd("/home/web_user/app"); options(forma.evidence="../evidence/phase-2/wasm-analysis.json"); source("scripts/check-analysis.R")');
 await mkdir('evidence/phase-2',{recursive:true});
 await writeFile('evidence/phase-2/wasm-analysis.json',await r.FS.readFile('/home/web_user/evidence/phase-2/wasm-analysis.json'));
 console.log('PASS: actual WASM import and analysis checks.');
}finally{await r.close();}
