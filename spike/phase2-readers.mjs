import {WebR, ChannelType} from 'webr';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const r=new WebR({channelType:ChannelType.PostMessage,interactive:false});
const evidence={environment:'Node.js WASM (not a browser)',date:new Date().toISOString(),webR:'0.6.0'};
try{
 await r.init();
 (async()=>{for await(const event of r.stream())if(['stdout','stderr'].includes(event.type))console.log(event.data);})().catch(()=>{});
 for(const p of ['readxl','haven','jsonlite']){console.log('Installing',p);await r.installPackages([p]);}
 evidence.packages=JSON.parse(await r.evalRString('jsonlite::toJSON(as.list(vapply(c("readxl","haven","jsonlite"),function(p) as.character(packageVersion(p)),character(1))),auto_unbox=TRUE)'));
 evidence.ok=true;
 console.log(evidence);
}catch(e){evidence.ok=false;evidence.error=String(e);process.exitCode=1;}
finally{await mkdir('evidence/phase-2',{recursive:true});await writeFile('evidence/phase-2/wasm-readers.json',JSON.stringify(evidence,null,2));await r.close();}
