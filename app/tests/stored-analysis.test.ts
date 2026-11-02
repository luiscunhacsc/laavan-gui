import test from 'node:test';
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {analysisKey,defaultAnalysis,type Dataset,type FitResult} from '../src/analysis';
import {datasetFingerprint,verifySavedDataset,readSavedAnalysis} from '../src/stored-analysis';
import {defaultDisplay} from '../src/model';
import {readProject} from '../src/project';
import {saveSession,loadSession} from '../src/storage';
const cases=JSON.parse(await readFile(new URL('./fixtures/advanced.json',import.meta.url),'utf8'));
const fit=cases.single as FitResult;
const source={query:{action:'example',example:'holzinger',id:fit.datasetId,name:'Holzinger'},types:[]};
const syntax=JSON.parse(await readFile(new URL('../../fixtures/models.json',import.meta.url),'utf8'))[0].syntax;
const snapshot=async()=>({key:analysisKey(syntax,fit.model.options,{...defaultAnalysis,reliability:true,modificationIndices:true},{id:fit.datasetId,revision:fit.datasetRevision} as Dataset),syntax,datasetName:'Holzinger',at:'2026-11-01T22:00:00Z',result:structuredClone(fit),datasetDigest:await datasetFingerprint(source),datasetVerified:true});
test('saved fit, complete inference tables and display choices survive project round trip',async()=>{
 const saved=await snapshot(),project=readProject(JSON.parse(JSON.stringify({format:'forma-sem',version:3,syntax,options:fit.model.options,display:defaultDisplay,analysis:defaultAnalysis,fit:saved,workspace:'results',annotation:{mode:'standardized',extra:'stars',rsquared:true}})));
 assert.equal(project.version,3);assert.deepEqual(project.fit?.result.parameters,saved.result.parameters);assert.deepEqual(project.fit?.result.reliability,saved.result.reliability);assert.equal(project.fit?.datasetVerified,false);assert.equal(project.workspace,'results');assert.equal(project.annotation?.mode,'standardized');
 assert.equal(await verifySavedDataset(project.fit!,source),true);
});
test('saved-result validation rejects malformed inference and inconsistent provenance',async()=>{
 for(const mutate of [(s:any)=>s.result.parameters[0].est='wrong',(s:any)=>s.result.model.table[0].label={},(s:any)=>s.result.measures[0].value=Infinity,(s:any)=>s.syntax='different model',(s:any)=>s.result.datasetId='other',(s:any)=>s.result.invariance=[{stage:'made-up'}],(s:any)=>s.result.measures[0].reason={},(s:any)=>s.result.parameters[0].pvalue=1.1,(s:any)=>s.result.estimator='MLR']){
  const s=await snapshot();mutate(s);assert.throws(()=>readSavedAnalysis(s));
 }
});
test('dataset fingerprints bind original file bytes, import settings and measurement types',async()=>{
 const file={query:{action:'import',id:'file',name:'data.csv',format:'csv',delimiter:',',sheet:'',na:['','NA']},binary:new Uint8Array([88,10,49]),types:[]};
 const hash=await datasetFingerprint(file);assert.notEqual(hash,await datasetFingerprint({...file,binary:new Uint8Array([88,10,50])}));assert.notEqual(hash,await datasetFingerprint({...file,types:[{name:'X',type:'ordered'}]}));assert.notEqual(hash,await datasetFingerprint({...file,query:{...file.query,delimiter:';'}}));
 const s=await snapshot();assert.equal(await verifySavedDataset(s,{...source,query:{...source.query,id:'replaced'}}),false);assert.equal(await verifySavedDataset({...s,result:{...s.result,datasetRevision:2}},source),false);
});
test('invariance and bootstrap results restore through IndexedDB with their recorded settings',async()=>{
 for(const [name,analysis] of Object.entries({invariance:{...defaultAnalysis,estimator:'MLR' as const,group:'school',invariance:true,reliability:true,modificationIndices:true},bootstrap:{...defaultAnalysis,bootstrap:100,seed:12345}})){
  const result=cases[name] as FitResult,state={query:{action:'example',example:name==='bootstrap'?'mediation':'holzinger',id:result.datasetId,name},types:[]};
  const s={key:analysisKey(syntax,result.model.options,analysis,{id:result.datasetId,revision:result.datasetRevision} as Dataset),syntax,datasetName:name,at:'2026-11-01T22:00:00Z',result,datasetDigest:await datasetFingerprint(state)};
  const project=readProject({format:'forma-sem',version:3,syntax,options:result.model.options,display:defaultDisplay,analysis,fit:s});
  await saveSession(project,state);const restored=await loadSession();assert.deepEqual(restored?.project.fit?.result,result);
  assert.equal(await verifySavedDataset(restored!.project.fit!,restored!.dataset!),true);
  const corrupt=structuredClone(s);if(corrupt.result.bootstrap)corrupt.result.bootstrap.seed++;else corrupt.result.invariance![1].differenceError={} as any;
  assert.throws(()=>readSavedAnalysis(corrupt));
 }
});
