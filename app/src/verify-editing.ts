import type {LavaanRuntime} from './runtime';
import {layoutModel,type Measure} from './layout';
import {defaultOptions,defaultDisplay,type Options} from './model';
import {ModelHistory,editHeadings,type EditCommand,type EditResult} from './editing';
import {defaultAnalysis,type Dataset,type DataPage,type FitResult} from './analysis';
import {portableAttachment,attachmentState} from './dataset-source';
import {readProject,type Project} from './project';
import {loadSession,saveSession} from './storage';
import fixtures from '../../fixtures/models.json';
import extras from '../tests/fixtures/extra-models.json';
// Explicit development QA: only the fixed public/synthetic fixtures enter reports.
export async function verifyEditing(runtime:LavaanRuntime,measure:Measure){
 const oldSource=runtime.snapshotDataset(),oldSession=await loadSession();
 try{
  const models=[];
  for(const f of [...fixtures,...extras]){
    const options={...defaultOptions,preset:('preset' in f?f.preset:'sem') as Options['preset'],groups:f.groups};
    const result=await runtime.request<EditResult>({action:'edit',text:f.syntax,options,command:{kind:'format'},headings:editHeadings()});
    if(!result.model)throw new Error('Expected canonical model');
    const scene=await layoutModel(result.model,{},measure);if(scene.diagnostics.length)throw new Error(scene.diagnostics.join(', '));
    models.push({id:f.id,syntax:result.syntax,model:result.model,scene});
  }
  let text='',latest:EditResult|undefined;
  const edit=async(command:EditCommand)=>{latest=await runtime.request<EditResult>({action:'edit',text,options:defaultOptions,command,headings:editHeadings()});text=latest.syntax;return latest;};
  for(const name of ['X','M','Y'])await edit({kind:'observed',name});
  for(const [from,to] of [['X','M'],['M','Y'],['X','Y']])await edit({kind:'connect',from,to,relation:'regression'});
  for(const [lhs,rhs,label] of [['M','X','a'],['Y','M','b'],['Y','X','cp']]){
    const row=latest!.model!.table.find(r=>r.lhs===lhs&&r.op==='~'&&r.rhs===rhs)!;
    await edit({kind:'parameter',id:row.id,mode:'free',label,allGroups:true});
  }
  text+='\nind := a*b\ntotal := cp + ind';
  const {dataset:med}=await runtime.request<{dataset:Dataset}>({action:'example',id:'qa-mediation',name:'Mediation',example:'mediation'});
  const fitted=await runtime.request<FitResult>({action:'fit',id:med.id,revision:med.revision,text,options:defaultOptions,analysis:defaultAnalysis});
  if(!fitted.converged||!fitted.admissible)throw new Error('Drawn model did not produce an admissible fit');
  const history=new ModelHistory({syntax:'',options:defaultOptions,positions:{}});history.record({syntax:text,options:defaultOptions,positions:{'g1:X':{x:100,y:200}}});history.record({syntax:text,options:defaultOptions,positions:{'g1:X':{x:300,y:400}}},true);history.move(-1);
  if(history.current.positions['g1:X'].x!==100)throw new Error('Undo did not restore positions');history.move(-1);if(history.current.syntax!=='')throw new Error('Undo did not restore syntax');history.move(1);
  const response=await fetch('/__fixtures/labelled.sav');if(!response.ok)throw new Error('SPSS fixture unavailable');const bytes=new Uint8Array(await response.arrayBuffer());
  let {dataset}=await runtime.request<{dataset:Dataset}>({action:'import',format:'sav',id:'qa-project',name:'labelled.sav',delimiter:',',na:['','NA'],sheet:''},bytes);
  ({dataset}=await runtime.request<{dataset:Dataset}>({action:'type',id:dataset.id,revision:dataset.revision,name:'satisfaction',type:'ordered'}));
  const source=runtime.snapshotDataset()!;
  const project:Project={format:'forma-sem',version:2,syntax:'satisfaction ~ age',options:{...defaultOptions,preset:'path'},analysis:{...defaultAnalysis,estimator:'WLSMV'},positions:{},display:defaultDisplay,datasetAttached:true,dataset:portableAttachment(source)};
  const parsed=readProject(JSON.parse(JSON.stringify(project))),decoded=attachmentState(parsed.dataset!);
  const bytesExact=decoded.binary?.length===bytes.length&&decoded.binary.every((v,i)=>v===bytes[i]);if(!bytesExact)throw new Error('Portable dataset bytes changed');
  await saveSession(parsed,decoded);const loaded=await loadSession();if(!loaded?.dataset)throw new Error('Browser autosave did not restore data');
  const restored=await runtime.restoreDataset(loaded.dataset);
  const ordinal=restored.dataset.columns.find(c=>c.name==='satisfaction');
  if(ordinal?.type!=='ordered'||ordinal.label!=='Course satisfaction'||ordinal.userMissing!==1)throw new Error('Restored SPSS metadata differs');
  await runtime.restart();
  const page=await runtime.request<DataPage>({action:'page',id:restored.dataset.id,revision:restored.dataset.revision,start:0,count:5,columns:['satisfaction']});
  if(page.rows[2][0].value!==9||!page.rows[2][0].missing||page.rows[2][0].label!=='Declined')throw new Error('Worker restart lost declared missing values');
  const report={userAgent:navigator.userAgent,at:new Date().toISOString(),models,drawn:{syntax:text,fit:fitted},storage:{bytesExact,typeRestored:true,labelsRestored:true,missingCodesRestored:true,workerRestart:true},history:{syntaxUndo:true,positionsUndo:true}};
  const written=await fetch('/__qa-editing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});if(!written.ok)throw new Error('Evidence save failed');
  return models.length;
 }finally{
   if(oldSession)await saveSession(oldSession.project,oldSession.dataset);
   if(oldSource)await runtime.restoreDataset(oldSource);else await runtime.discardDataset();
 }
}
