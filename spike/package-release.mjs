import {WebR,ChannelType} from 'webr';
import {readFile,writeFile,mkdir,cp,stat,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const lock=JSON.parse(await readFile('app/src/engine-spec.json','utf8'));
const output=path.resolve('app/public/engine');await mkdir(output,{recursive:true});
await cp('spike/node_modules/webr/dist',output,{recursive:true,filter:p=>!p.endsWith('.map')&&!p.endsWith('.d.ts')&&!/[/\\](tests|repl)([/\\]|$)/.test(p)});
await cp('spike/node_modules/webr/LICENSE.md',output+'/LICENSE-webR.md');
await writeFile(output+'/package.json',JSON.stringify({private:true,type:'commonjs'}));
const r=new WebR({channelType:ChannelType.PostMessage,interactive:false});
try {
 await r.init();(async()=>{for await(const e of r.stream())if(e.type==='stderr')console.log(e.data);})().catch(()=>{});
 await r.installPackages(['lavaan','jsonlite','semTools','readxl','haven']);
 const info=JSON.parse(await r.evalRString('jsonlite::toJSON(as.data.frame(installed.packages()[,c("Package","Version","LibPath")]),dataframe="rows")'));
 const names=info.filter(p=>p.LibPath==='/usr/lib/R/library'&&!['base','compiler','datasets','graphics','grDevices','grid','methods','parallel','splines','stats','stats4','tcltk','tools','utils','webr'].includes(p.Package)).map(p=>p.Package);
 for(const [name,version] of Object.entries(lock.packages))if(!info.some(p=>p.Package===name&&p.Version===version))throw new Error(`Frozen package ${name} ${version} is unavailable; retain the vendored engine or explicitly review a new lock.`);
 console.log(JSON.stringify({libraries:[...new Set(info.map(p=>p.LibPath))],packages:names}));
 await writeFile(output+'/packages.json',JSON.stringify(info,null,2));
 const files=JSON.parse(await r.evalRString('jsonlite::toJSON(list.files(.libPaths()[1],recursive=TRUE,all.files=TRUE,full.names=TRUE,no..=TRUE),auto_unbox=FALSE)'));
 console.log('Library files: '+files.length);
 const chunks=[],metadata={files:[],remote_package_size:0};
 for(const file of files){const prefix=info.find(p=>file.startsWith(p.LibPath+'/'+p.Package+'/')&&names.includes(p.Package));if(!prefix)continue;
  const bytes=await r.FS.readFile(file);const start=metadata.remote_package_size;chunks.push(bytes);metadata.remote_package_size+=bytes.length;metadata.files.push({filename:file.slice(prefix.LibPath.length),start,end:metadata.remote_package_size});
 }
 await writeFile(output+'/library.data',Buffer.concat(chunks));await writeFile(output+'/library.metadata.json',JSON.stringify(metadata));
 const manifest={format:1,webr:'0.6.0',R:await r.evalRString('R.version.string'),packages:Object.fromEntries(info.filter(p=>names.includes(p.Package)).map(p=>[p.Package,p.Version])),files:{}};
 async function record(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())await record(p);else if(!p.endsWith('manifest.json')){const bytes=await readFile(p);manifest.files[path.relative(output,p).replaceAll('\\','/')]={bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};}}}
 await record(output);await writeFile(output+'/manifest.json',JSON.stringify(manifest,null,2));
 const spec={webr:manifest.webr,R:manifest.R,packages:manifest.packages,files:Object.fromEntries(['webr.js','library.data','library.metadata.json'].map(name=>[name,manifest.files[name]]))};
 await writeFile('app/src/engine-spec.json',JSON.stringify(spec,null,2)+'\n');
 console.log(`Packaged ${metadata.files.length} library files, ${metadata.remote_package_size} bytes.`);
} finally {await r.close();}
