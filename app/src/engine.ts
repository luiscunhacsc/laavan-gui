import spec from './engine-spec.json';
import en from './en.json';
const root=()=>new URL(`${import.meta.env.BASE_URL}engine/`,location.href).href;
let image:Promise<{metadata:unknown;blob:Blob}>|undefined;
async function verified(name:keyof typeof spec.files){
 const response=await fetch(root()+name);if(!response.ok)throw new Error(en.errors['engine.missing']);
 const bytes=await response.arrayBuffer(),expected=spec.files[name];
 const digest=await crypto.subtle.digest('SHA-256',bytes),hash=[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
 if(bytes.byteLength!==expected.bytes||hash!==expected.sha256)throw new Error(en.errors['engine.integrity']);return bytes;
}
export async function openEngine(){
 await verified('webr.mjs');
 const module=await import(/* @vite-ignore */ root()+'webr.mjs');
 const runtime=new module.WebR({baseUrl:root(),repoUrl:root()+'no-remote-repository/',channelType:module.ChannelType.PostMessage,interactive:false});
 try {
  const load=image??=Promise.all([verified('library.data'),verified('library.metadata.json')]).then(([data,metadata])=>({blob:new Blob([data]),metadata:JSON.parse(new TextDecoder().decode(metadata))})).catch(error=>{image=undefined;throw error;});
  const [,library]=await Promise.all([runtime.init(),load]);
  await runtime.FS.mkdir('/forma-library');await runtime.FS.mount('WORKERFS',{packages:[library]},'/forma-library');
  await runtime.evalRVoid('.libPaths(c("/forma-library",.libPaths())); options(repos=character(),useFancyQuotes=FALSE)');
  const packages=JSON.parse(await runtime.evalRString('jsonlite::toJSON(as.list(vapply(c("lavaan","semTools","readxl","haven"),function(p)as.character(packageVersion(p)),character(1))),auto_unbox=TRUE)'));
  for(const name of ['lavaan','semTools','readxl','haven'] as const)if(packages[name]!==spec.packages[name].replaceAll('-','.'))throw new Error(en.errors['engine.integrity']);
  return runtime;
 }catch(error){await runtime.close();throw error;}
}
