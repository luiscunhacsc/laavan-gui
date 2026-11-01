import {WebR,ChannelType} from 'webr';
const r=new WebR({channelType:ChannelType.PostMessage,interactive:false});
try {
 await r.init();(async()=>{for await(const e of r.stream())if(e.type==='stderr')console.log(e.data);})().catch(()=>{});
 await r.installPackages(['lavaan','jsonlite','semTools']);
 console.log(await r.evalRString('paste("lavaan",packageVersion("lavaan"),"semTools",packageVersion("semTools"))'));
} finally {await r.close();}
