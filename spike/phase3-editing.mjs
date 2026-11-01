// Native-equivalent semantic transactions in actual webR/WASM, not a browser UI test.
import {WebR,ChannelType} from 'webr';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const r=new WebR({channelType:ChannelType.PostMessage,interactive:false});
try{
 await r.init();(async()=>{for await(const event of r.stream())if(event.type==='stderr')console.log(event.data);})().catch(()=>{});
 await r.installPackages(['lavaan','jsonlite']);
 for(const p of ['app','app/src','app/src/r','app/scripts','app/tests','app/tests/fixtures','fixtures','evidence','evidence/phase-3','.Rlib'])await r.FS.mkdir('/home/web_user/'+p);
 for(const p of ['app/src/r/compile.R','app/src/r/edit.R','app/src/r/analysis.R','app/scripts/check-editing.R','app/tests/fixtures/extra-models.json','fixtures/models.json'])await r.FS.writeFile('/home/web_user/'+p,await readFile(p));
 await r.evalRVoid('setwd("/home/web_user/app"); options(forma.editEvidence="../evidence/phase-3/wasm-editing.json"); source("scripts/check-editing.R")');
 await mkdir('evidence/phase-3',{recursive:true});await writeFile('evidence/phase-3/wasm-editing.json',await r.FS.readFile('/home/web_user/evidence/phase-3/wasm-editing.json'));
 console.log('PASS: WASM semantic editing and 15 model round trips.');
}finally{await r.close();}
