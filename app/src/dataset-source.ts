import type {VariableType} from './analysis';
export interface DatasetState {query:Record<string,unknown>;binary?:Uint8Array;types:Record<string,unknown>[]}
export interface DatasetAttachment {schema:1;source:Record<string,unknown>;types:{name:string;type:VariableType}[];base64?:string}
const MAX=50*1024*1024;
const str=(v:unknown,max=500)=>typeof v==='string'&&v.length<=max;
export function sourceQuery(value:unknown):Record<string,unknown>{
  const q=value as Record<string,unknown>;
  if(!q||!str(q.id,200)||!q.id||!str(q.name)||!['import','example','covariance'].includes(String(q.action)))throw new Error('badDatasetAttachment');
  const clean:Record<string,unknown>={action:q.action,id:q.id,name:q.name};
  if(q.action==='import'){
    if(!['csv','xlsx','xls','sav','zsav'].includes(String(q.format))||!str(q.sheet)||!Array.isArray(q.na)||q.na.length>100||q.na.some(v=>!str(v))||![',',';','\t'].includes(String(q.delimiter)))throw new Error('badDatasetAttachment');
    Object.assign(clean,{format:q.format,sheet:q.sheet,na:q.na,delimiter:q.delimiter});
  }else if(q.action==='example'){
    if(!['holzinger','democracy','mediation'].includes(String(q.example)))throw new Error('badDatasetAttachment');clean.example=q.example;
  }else{
    if(!str(q.text,3000000)||!str(q.means,20000)||typeof q.n!=='number'||!Number.isInteger(q.n)||q.n<2)throw new Error('badDatasetAttachment');
    Object.assign(clean,{text:q.text,means:q.means,n:q.n});
  }
  return clean;
}
export function cleanTypes(types:unknown):{name:string;type:VariableType}[]{
  if(!Array.isArray(types)||types.length>10000)throw new Error('badDatasetAttachment');
  return types.map(t=>{if(!t||!str(t.name)||!['continuous','ordered','nominal'].includes(t.type))throw new Error('badDatasetAttachment');return{name:t.name,type:t.type};});
}
export function readAttachment(value:unknown):DatasetAttachment{
  const a=value as DatasetAttachment;
  if(!a||a.schema!==1)throw new Error('badDatasetAttachment');
  const source=sourceQuery(a.source),types=cleanTypes(a.types);
  if(source.action==='import'){
    if(typeof a.base64!=='string'||!a.base64.length||a.base64.length>Math.ceil(MAX/3)*4||a.base64.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(a.base64))throw new Error('badDatasetAttachment');
  }else if(a.base64!==undefined)throw new Error('badDatasetAttachment');
  return{schema:1,source,types,...(a.base64?{base64:a.base64}:{})};
}
export function attachmentState(value:DatasetAttachment):DatasetState{
  const a=readAttachment(value);
  const binary=a.base64?Uint8Array.from(atob(a.base64),c=>c.charCodeAt(0)):undefined;
  if(binary&&binary.byteLength>MAX)throw new Error('badDatasetAttachment');
  return{query:a.source,binary,types:a.types.map((t,i)=>({action:'type',id:a.source.id,revision:i+1,...t}))};
}
export function portableAttachment(state:DatasetState):DatasetAttachment{
  const source=sourceQuery(state.query),types=cleanTypes(state.types);
  if(source.action!=='import')return{schema:1,source,types};
  if(!state.binary?.length||state.binary.length>MAX)throw new Error('badDatasetAttachment');
  let text='';for(let i=0;i<state.binary.length;i+=8192)text+=String.fromCharCode(...state.binary.subarray(i,i+8192));
  return{schema:1,source,types,base64:btoa(text)};
}
