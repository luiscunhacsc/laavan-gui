import type {LavaanRuntime} from './runtime';
import {layoutModel,type Measure} from './layout';
import {annotatedModel,defaultAnalysis,type Dataset,type FitResult,type AnalysisSnapshot} from './analysis';
import {defaultDisplay,defaultOptions} from './model';
import {notationModel} from './notation';
import {diagramPdf,diagramPng,diagramTikz,portableSvg} from './exports';
import {reportLatex} from './report';
import {reportWord} from './report-word';
import fixtures from '../../fixtures/models.json';
import native from '../tests/fixtures/advanced.json';
import core from '../tests/fixtures/analysis.json';
// Development-only public/synthetic checks. The prior dataset never enters the report.
export async function verifyAdvanced(runtime:LavaanRuntime,measure:Measure,progress:(n:number)=>void){
 const backup=runtime.snapshotDataset(),checks:string[]=[],models:{id:string;result:FitResult}[]=[],artifacts:Record<string,string>={};
 const pass=(name:string)=>{checks.push(name);progress(checks.length);};
 const close=(a:unknown,b:unknown,path:string)=>{if(typeof a==='number'&&typeof b==='number'){if(Math.round(a*1e4)!==Math.round(b*1e4))throw new Error(`${path}: ${a} differs from ${b}`);}else if(a!==b)throw new Error(`${path}: reference differs`);};
 const numerical=(actual:FitResult,reference:FitResult)=>{for(const row of reference.parameters){const found=actual.parameters.find(p=>p.lhs===row.lhs&&p.op===row.op&&p.rhs===row.rhs&&(p.group||1)===(row.group||1));if(!found)throw new Error('Missing parameter');for(const key of ['est','se','std.all','ci.lower','ci.upper'] as const)close(found[key],row[key],`${row.lhs} ${row.op} ${row.rhs} ${key}`);}};
 const encoded=async(blob:Blob)=>{const bytes=new Uint8Array(await blob.arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);};
 try{
  for(const [i,example] of ['holzinger','democracy','mediation'].entries()){
   const fixture=fixtures[i],{dataset}=await runtime.request<{dataset:Dataset}>({action:'example',example,id:fixture.id,name:example});
   const result=await runtime.request<FitResult>({action:'fit',id:dataset.id,revision:dataset.revision,text:fixture.syntax,options:{...defaultOptions,preset:i===2?'path':fixture.preset},analysis:{...defaultAnalysis,...i===0?{reliability:true,modificationIndices:true}:{}}});
   numerical(result,(core.core as unknown as Record<string,FitResult>)[fixture.id]);models.push({id:fixture.id,result});pass(fixture.id);
  }
  const {dataset}=await runtime.request<{dataset:Dataset}>({action:'example',example:'holzinger',id:'qa-invariance',name:'Holzinger-Swineford'});
  const iq={action:'fit',id:dataset.id,revision:dataset.revision,text:fixtures[0].syntax,options:{...defaultOptions,preset:'cfa',groups:2,meanstructure:true},analysis:{...defaultAnalysis,group:'school',estimator:'MLR',invariance:true,reliability:true}};
  const invariance=await runtime.request<FitResult>(iq);numerical(invariance,native.invariance as unknown as FitResult);
  for(let i=0;i<4;i++){const row=invariance.invariance?.[i],ref=native.invariance.invariance[i];if(!row?.converged)throw new Error('Invariance stage failed');for(const key of ['chisq','df','cfi','rmsea','srmr','deltaCfi','deltaRmsea'] as const)close(row[key],ref[key],`invariance ${key}`);if(i)close(row.difference?.chisq,ref.difference?.chisq,'difference test');}pass('invariance');
  const reliability=models[0].result.reliability;if(!reliability||reliability.status!=='ok')throw new Error('Reliability unavailable');
  for(let i=0;i<reliability.scales.length;i++){close(reliability.scales[i].omega,native.single.reliability.scales[i].omega,'omega');close(reliability.scales[i].ave,native.single.reliability.scales[i].ave,'AVE');}for(let i=0;i<reliability.pairs.length;i++)close(reliability.pairs[i].htmt2,native.single.reliability.pairs[i].htmt2,'HTMT2');pass('reliability');
  const edit=await runtime.request<{model:FitResult['model']}>({action:'edit',text:fixtures[0].syntax,options:{...defaultOptions,preset:'cfa',groups:2},command:{kind:'modification',lhs:'x1',op:'~~',rhs:'x2',group:2}});
  for(const r of edit.model.table.filter(r=>r.lhs==='x1'&&r.op==='~~'&&r.rhs==='x2'))if((r.free>0)!==(r.group===2))throw new Error('MI group scope changed');
  const mi=models[0].result.modifications?.rows[0];if(!mi)throw new Error('Missing MI');close(mi.mi,native.single.modifications.rows[0].mi,'MI');pass('modification');
  const med=(await runtime.request<{dataset:Dataset}>({action:'example',example:'mediation',id:'qa-bootstrap',name:'Mediation'})).dataset;
  const bq={action:'fit',id:med.id,revision:med.revision,text:fixtures[2].syntax,options:{...defaultOptions,preset:'path'},analysis:{...defaultAnalysis,bootstrap:100,seed:12345,confidence:.95}};
  const bootstrap=await runtime.request<FitResult>(bq);numerical(bootstrap,native.bootstrap as unknown as FitResult);if(bootstrap.bootstrap?.failed!==0)throw new Error('Bootstrap draws failed');pass('bootstrap');
  const scene=await layoutModel(annotatedModel(bootstrap,{mode:'standardized',extra:'stars',rsquared:true}),{},measure),display={...defaultDisplay,title:'Mediation · standardised estimates'};
  const greek=await layoutModel(notationModel(models[0].result.model),{},measure);if(!greek.edges.some(e=>e.label.includes('λ')))throw new Error('Notation missing');
  const svg=await portableSvg(greek,{...defaultDisplay,title:'CFA · λ₁₁'});if(!svg.includes('data:font/ttf;base64,'))throw new Error('Font missing');artifacts['notation.svg']=await encoded(new Blob([svg],{type:'image/svg+xml'}));pass('notation-svg');
  const png=await diagramPng(scene,display,6.5,300),image=await createImageBitmap(png);if(image.width!==1950)throw new Error('PNG width differs');image.close();artifacts['mediation.png']=await encoded(png);pass('png');
  const pdf=await diagramPdf(scene,display,6.5);if((await pdf.text()).slice(0,5)!=='%PDF-')throw new Error('Invalid PDF');artifacts['mediation.pdf']=await encoded(pdf);pass('pdf');
  const snapshot:AnalysisSnapshot={key:'qa',syntax:fixtures[0].syntax,datasetName:'Holzinger-Swineford',result:invariance,at:new Date().toISOString()},word=await reportWord(snapshot);if(new Uint8Array(await word.arrayBuffer())[0]!==80)throw new Error('Invalid Word archive');
  artifacts['analysis.docx']=await encoded(word);artifacts['analysis.tex']=await encoded(new Blob([reportLatex(snapshot)],{type:'text/plain'}));artifacts['mediation.tex']=await encoded(new Blob([diagramTikz(scene,display)],{type:'text/plain'}));pass('word-latex-tikz');
  let rejected=false;try{await runtime.request({...bq,analysis:{...bq.analysis,estimator:'MLR'}});}catch{rejected=true;}if(!rejected)throw new Error('Unsupported bootstrap accepted');
  if(backup)await runtime.restoreDataset(backup);else await runtime.discardDataset();pass('guards-and-restoration');
  const response=await fetch('/__qa-advanced',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userAgent:navigator.userAgent,at:new Date().toISOString(),checks,models,invariance,bootstrap,artifacts})});if(!response.ok)throw new Error('Evidence save failed');
  return checks.length;
 }finally{if(backup)await runtime.restoreDataset(backup);else await runtime.discardDataset();}
}
