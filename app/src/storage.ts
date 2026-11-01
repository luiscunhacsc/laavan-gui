import {readProject,type Project} from './project';
import {sourceQuery,cleanTypes,type DatasetState} from './dataset-source';
const DB='forma.workspace',VERSION=1;
let opening:Promise<IDBDatabase>|undefined,queue:Promise<unknown>=Promise.resolve();
const hashes=new WeakMap<Uint8Array,Map<string,Promise<string>>>();
function database(){
  if(!opening)opening=new Promise<IDBDatabase>((resolve,reject)=>{
    const request=indexedDB.open(DB,VERSION);
    request.onupgradeneeded=()=>{request.result.createObjectStore('session');request.result.createObjectStore('sources');};
    request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error('storage.blocked'));
    request.onsuccess=()=>{request.result.onversionchange=()=>{request.result.close();opening=undefined;};resolve(request.result);};
  }).catch(error=>{opening=undefined;throw error;});
  return opening;
}
async function sourceKey(state:DatasetState){
  const query=JSON.stringify(sourceQuery(state.query));
  const compute=async()=>{
    const prefix=new TextEncoder().encode(query),binary=state.binary||new Uint8Array();
    const joined=new Uint8Array(prefix.length+binary.length);joined.set(prefix);joined.set(binary,prefix.length);
    const hash=await crypto.subtle.digest('SHA-256',joined);
    return [...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('');
  };
  if(!state.binary)return compute();let cache=hashes.get(state.binary);if(!cache){cache=new Map();hashes.set(state.binary,cache);}
  if(!cache.has(query))cache.set(query,compute());return cache.get(query)!;
}
export function saveSession(project:Project,state?:DatasetState){
  const snapshot=structuredClone({...project,dataset:undefined}),types=state?cleanTypes(state.types):[];
  // Serialize writes so a slower older save cannot overwrite a newer transaction.
  const run=async()=>{
    const key=state?await sourceKey(state):undefined,db=await database();
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction(['session','sources'],'readwrite'),session=tx.objectStore('session'),sources=tx.objectStore('sources');
      tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||new Error('storage.failed'));tx.onerror=()=>{};
      const previous=session.get('active');previous.onsuccess=()=>{
        const old=previous.result?.sourceKey;
        if(old&&old!==key)sources.delete(old);
        if(state&&key){const exists=sources.get(key);exists.onsuccess=()=>{if(!exists.result)sources.put({query:sourceQuery(state.query),binary:state.binary},key);};}
        session.put({project:snapshot,sourceKey:key,types},'active');
      };
    });
  };
  const result=queue.then(run,run);queue=result.catch(()=>{});return result;
}
export async function loadSession():Promise<{project:Project;dataset?:DatasetState}|undefined>{
  const db=await database();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(['session','sources'],'readonly');let record:any,source:any;
    tx.onabort=()=>reject(tx.error);tx.onerror=()=>{};
    const request=tx.objectStore('session').get('active');request.onsuccess=()=>{
      record=request.result;if(record?.sourceKey){const r=tx.objectStore('sources').get(record.sourceKey);r.onsuccess=()=>{source=r.result;};}
    };
    tx.oncomplete=()=>{
      try{if(!record){resolve(undefined);return;}
        const project=readProject(record.project);
        if(record.sourceKey&&!source)throw new Error('storage.missing');
        const dataset=source?{query:sourceQuery(source.query),binary:source.binary,types:cleanTypes(record.types).map((t,i)=>({action:'type',id:source.query.id,revision:i+1,...t}))}:undefined;
        resolve({project,dataset});
      }catch(e){reject(e);}
    };
  });
}
