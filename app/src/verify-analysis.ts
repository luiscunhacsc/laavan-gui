import type {LavaanRuntime} from './runtime';
import {layoutModel,type Measure} from './layout';
import {annotatedModel,defaultAnalysis,type FitResult,type Dataset,type DataPage} from './analysis';
import {defaultOptions} from './model';
import fixtures from '../../fixtures/models.json';
// Opt-in development QA uses only public/synthetic fixtures and loopback evidence writes.
export async function verifyAnalysis(runtime:LavaanRuntime,measure:Measure){
 const models=[];
 for(const [i,example] of ['holzinger','democracy','mediation'].entries()){
   const fixture=fixtures[i],id=fixture.id;
   const {dataset}=await runtime.request<{dataset:Dataset}>({action:'example',id,name:example,example});
   const result=await runtime.request<FitResult>({action:'fit',id,revision:dataset.revision,text:fixture.syntax,options:{...defaultOptions,preset:i===2?'path':fixture.preset,groups:1},analysis:defaultAnalysis});
   const scene=await layoutModel(annotatedModel(result,{mode:'standardized',extra:'se',rsquared:true}),{},measure);
   models.push({id,result,scene});
 }
 const binary=async(name:string)=>{const response=await fetch(`/__fixtures/${name}`);if(!response.ok)throw new Error(`Fixture unavailable: ${name}`);return new Uint8Array(await response.arrayBuffer());};
 const common={delimiter:',',na:['','NA'],sheet:'Participants'};
 const sav=await binary('labelled.sav');
 const {dataset:spss}=await runtime.request<{dataset:Dataset}>({action:'import',format:'sav',id:'labelled.sav',name:'labelled.sav',...common},sav);
 const spssPage=await runtime.request<DataPage>({action:'page',id:spss.id,revision:spss.revision,start:0,count:5,columns:['satisfaction','city']});
 const xlsx=await binary('workbook.xlsx');
 const sheets=await runtime.request<{sheets:string[]}>({action:'sheets',format:'xlsx'},xlsx);
 const {dataset:excel}=await runtime.request<{dataset:Dataset}>({action:'import',format:'xlsx',id:'workbook.xlsx',name:'workbook.xlsx',...common},xlsx);
 const largeBytes=await binary('large.csv');
 const {dataset:large}=await runtime.request<{dataset:Dataset}>({action:'import',format:'csv',id:'large.csv',name:'large.csv',...common},largeBytes);
 const distantPage=await runtime.request<DataPage>({action:'page',id:large.id,revision:large.revision,start:4899,count:20,columns:['v14']});
 if(large.rows!==5000||distantPage.rows.length!==20||Math.abs(Number(distantPage.rows[0][0].value)-Math.round((Math.sin(4900*14*.017)+14)*1e6)/1e6)>1e-9)throw new Error('Distant data paging check failed');
 const response=await fetch('/__qa-analysis',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userAgent:navigator.userAgent,at:new Date().toISOString(),models,imports:{spss,spssPage,excel},sheets,large:{rows:large.rows,page:distantPage}})});
 if(!response.ok)throw new Error('Local analysis evidence write failed');
 return models.filter(m=>m.result.converged&&m.result.admissible&&!m.scene.diagnostics.length).length;
}
