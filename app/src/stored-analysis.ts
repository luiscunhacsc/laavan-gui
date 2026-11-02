import {normalizeModel,type CompiledModel,type Options} from './model';
import {readAnalysisOptions,type AnalysisSnapshot,type Estimate} from './analysis';
import {sourceQuery,cleanTypes,type DatasetState} from './dataset-source';
const bad=():never=>{throw new Error('project.badFit');};
const str=(v:unknown,max=10000):v is string=>typeof v==='string'&&v.length<=max;
const int=(v:unknown,min=0,max=1e9):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=max;
const numeric=(v:unknown)=>v===null||typeof v==='number'&&Number.isFinite(v);
const strings=(v:unknown,max=10000):v is string[]=>Array.isArray(v)&&v.length<=max&&v.every(s=>str(s));
const optionalString=(v:unknown)=>v==null||str(v);
const ops=['=~','<~','~','~~','~1',':=','==','<','>','|','~*~'];
function bounded(value:unknown,depth=0,budget={n:0}) {
 if(depth>30||++budget.n>2000000)bad();
 if(typeof value==='number'&&!Number.isFinite(value)||typeof value==='string'&&value.length>5000000)bad();
 if(value&&typeof value==='object'){if(Array.isArray(value)){if(value.length>20000)bad();}else if(Object.getPrototypeOf(value)!==Object.prototype)bad();for(const v of Object.values(value))bounded(v,depth+1,budget);}
 else if(value!==null&&!['string','number','boolean','undefined'].includes(typeof value))bad();
}
function options(v:any):v is Options{return v&&['sem','cfa','path'].includes(v.preset)&&int(v.groups,1,16)&&typeof v.fixedX==='boolean'&&typeof v.meanstructure==='boolean';}
export function validateSavedModel(raw:CompiledModel):CompiledModel {
 if(!raw||raw.ok!==true||raw.versions?.lavaan!=='0.7.3'||!options(raw.options)||!Array.isArray(raw.table)||raw.table.length>10000)bad();
 const model=normalizeModel(raw),ids=new Set<number>();
 if(!strings(model.latent,300)||!strings(model.observed,300)||!strings(model.warnings)||!Array.isArray(model.source))bad();
 for(const r of model.table){
  if(!int(r.id,1)||ids.has(r.id)||!str(r.lhs)||!str(r.rhs)||!ops.includes(r.op)||!int(r.group,0,16)||!int(r.free)||!str(r.label)||!str(r.plabel)||!numeric(r.ustart)||!['implicit','explicit','constraint'].includes(r.origin)||typeof r.defaultFixed!=='boolean')bad();ids.add(r.id);
 }return model;
}
function estimates(value:unknown,column:'est'|'est.std'):value is Estimate[]{return Array.isArray(value)&&value.length<=20000&&value.every(r=>r&&str(r.lhs)&&str(r.rhs)&&ops.includes(r.op)&&numeric(r[column])&&optionalString(r.label)&&['est','se','z','pvalue','ci.lower','ci.upper','std.all','est.std'].every(k=>r[k]===undefined||numeric(r[k]))&&(r.se==null||r.se>=0)&&(r.pvalue==null||r.pvalue>=0&&r.pvalue<=1)&&(r.group===undefined||int(r.group,0,16)));}
export function readSavedAnalysis(value:unknown):AnalysisSnapshot {
 bounded(value);const s=value as AnalysisSnapshot,f=s?.result;
 if(!s||!str(s.key,500000)||!str(s.syntax,200000)||!str(s.datasetName,500)||!str(s.at,100)||!Number.isFinite(Date.parse(s.at))||!str(s.datasetDigest,64)||!/^[a-f0-9]{64}$/.test(s.datasetDigest)||!f||f.ok!==true||typeof f.converged!=='boolean'||typeof f.admissible!=='boolean')bad();
 let key:any;try{key=JSON.parse(s.key);}catch{bad();}
 if(!Array.isArray(key)||key.length!==5||key[0]!==s.syntax||!options(key[1])||key[3]!==f.datasetId||key[4]!==f.datasetRevision)bad();
 const analysis=readAnalysisOptions(key[2]);
 if(!str(f.datasetId,200)||!int(f.datasetRevision,1)||!estimates(f.parameters,'est')||!estimates(f.standardized,'est.std')||!strings(f.warnings)||!Array.isArray(f.measures)||!f.measures.every(m=>m&&str(m.name)&&numeric(m.value)&&optionalString(m.reason))||!Array.isArray(f.rsquared)||!f.rsquared.every(r=>r&&str(r.name)&&int(r.group,1,16)&&numeric(r.value))||!Array.isArray(f.nobs)||!f.nobs.every(n=>int(n))||!int(f.inputCases)||!int(f.excluded)||!str(f.script,5000000)||!strings(f.ordered,500)||!f.versions||!str(f.versions.R)||f.versions.lavaan!=='0.7.3'||f.estimator!==analysis.estimator||f.missing!==analysis.missing||(f.confidence??.95)!==(analysis.confidence??.95))bad();
 if(f.groupLabels!==undefined&&!strings(f.groupLabels,16))bad();
 if(f.invariance!=null&&(!analysis.invariance||!Array.isArray(f.invariance)||f.invariance.length>4||!f.invariance.every(r=>r&&['configural','metric','scalar','strict'].includes(r.stage)&&typeof r.converged==='boolean'&&typeof r.admissible==='boolean'&&str(r.cfiType)&&str(r.rmseaType)&&optionalString(r.differenceError)&&['chisq','df','pvalue','cfi','rmsea','srmr','deltaCfi','deltaRmsea'].every(k=>numeric((r as any)[k]))&&(r.difference==null||numeric(r.difference.chisq)&&numeric(r.difference.df)&&numeric(r.difference.pvalue)&&strings(r.difference.method)))))bad();
 if(f.reliability!=null){const r=f.reliability;if(!analysis.reliability||!str(r.status)||!Array.isArray(r.scales)||!r.scales.every(x=>x&&int(x.group,1,16)&&str(x.factor)&&str(x.groupLabel)&&numeric(x.omega)&&numeric(x.ave))||!Array.isArray(r.pairs)||!r.pairs.every(x=>x&&int(x.group,1,16)&&str(x.first)&&str(x.second)&&optionalString(x.reason)&&numeric(x.correlation)&&numeric(x.htmt2)&&numeric(x.sqrtAveFirst)&&numeric(x.sqrtAveSecond)&&(x.fornellLarcker===null||typeof x.fornellLarcker==='boolean')))bad();}
 if(f.modifications!=null){const m=f.modifications;if(!analysis.modificationIndices||!str(m.status)||!optionalString(m.message)||!int(m.total)||typeof m.truncated!=='boolean'||!Array.isArray(m.rows)||!m.rows.every(r=>r&&str(r.lhs)&&str(r.rhs)&&['=~','~','~~'].includes(r.op)&&numeric(r.mi)&&numeric(r.epc)&&numeric(r['sepc.all'])&&(r.group===undefined||int(r.group,1,16))))bad();}
 if(f.bootstrap!=null){const b=f.bootstrap;if(!['requested','completed','failed','nonadmissible','seed'].every(k=>int((b as any)[k]))||b.requested!==analysis.bootstrap||b.seed!==(analysis.seed??20261101)||b.confidence!==(analysis.confidence??.95)||b.interval!=='perc'||b.completed>b.requested||b.failed>b.completed||b.nonadmissible>b.completed)bad();}
 const model=validateSavedModel(f.model);for(const name of ['groups','preset','fixedX','meanstructure'] as const)if(model.options[name]!==key[1][name])bad();
 return {...s,result:{...f,model},datasetVerified:false};
}
export async function datasetFingerprint(state:DatasetState){
 const query=sourceQuery(state.query),types=cleanTypes(state.types),prefix=new TextEncoder().encode(JSON.stringify([query,types])),binary=state.binary||new Uint8Array();
 const bytes=new Uint8Array(prefix.length+binary.length);bytes.set(prefix);bytes.set(binary,prefix.length);
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
}
export async function verifySavedDataset(snapshot:AnalysisSnapshot,state:DatasetState){return snapshot.datasetDigest===await datasetFingerprint(state)&&snapshot.result.datasetId===state.query.id&&snapshot.result.datasetRevision===state.types.length+1;}
