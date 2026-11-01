import {defaultOptions,defaultDisplay,normalizeModel,type CompiledModel,type Options,type Positions,type Display} from './model';
import {defaultAnalysis,type AnalysisOptions} from './analysis';
import {readAttachment,type DatasetAttachment} from './dataset-source';
export interface Project {format:'forma-sem';version:1|2;syntax:string;options:Options;positions:Positions;display:Display;canonical?:CompiledModel;validSyntax?:string;analysis?:AnalysisOptions;datasetAttached?:boolean;dataset?:DatasetAttachment}
export const SESSION='forma.project.v1';
export function readProject(value:unknown):Project{
  const p=value as Partial<Project>;
  if(!p||p.format!=='forma-sem'||![1,2].includes(p.version as number)||typeof p.syntax!=='string'||p.syntax.length>200000)throw new Error('badProject');
  if(p.validSyntax!==undefined&&(typeof p.validSyntax!=='string'||p.validSyntax.length>200000))throw new Error('badProject');
  const options={...defaultOptions,...p.options};
  if(!['sem','cfa','path'].includes(options.preset)||!Number.isInteger(options.groups)||options.groups<1||options.groups>16||typeof options.fixedX!=='boolean'||typeof options.meanstructure!=='boolean')throw new Error('badProject');
  const positions:Positions={};for(const [key,pos] of Object.entries(p.positions||{})){
    if(pos&&Number.isFinite(pos.x)&&Number.isFinite(pos.y)&&Math.abs(pos.x)<1e6&&Math.abs(pos.y)<1e6)positions[key]={x:pos.x,y:pos.y};
  }
  const display={...defaultDisplay,...p.display};
  const analysis={...defaultAnalysis,...p.analysis};
  if(!['ML','MLR','WLSMV'].includes(analysis.estimator)||!['listwise','fiml','pairwise'].includes(analysis.missing)||typeof analysis.group!=='string'||analysis.group.length>500)throw new Error('badProject');
  if(analysis.bootstrap!==undefined&&(!Number.isInteger(analysis.bootstrap)||analysis.bootstrap!==0&&(analysis.bootstrap<100||analysis.bootstrap>10000)))throw new Error('badProject');
  if(analysis.seed!==undefined&&(!Number.isInteger(analysis.seed)||analysis.seed<1||analysis.seed>2147483647))throw new Error('badProject');
  if(analysis.confidence!==undefined&&(!Number.isFinite(analysis.confidence)||analysis.confidence<.8||analysis.confidence>.99))throw new Error('badProject');
  for(const key of ['invariance','reliability','modificationIndices'] as const)if(analysis[key]!==undefined&&typeof analysis[key]!=='boolean')throw new Error('badProject');
  if(typeof display.title!=='string'||display.title.length>250||!['journal','presentation'].includes(display.theme)||typeof display.implicit!=='boolean')throw new Error('badProject');
  if(display.notation!==undefined&&typeof display.notation!=='boolean')throw new Error('badProject');
  let canonical:CompiledModel|undefined;
  if(p.canonical){
    const model=p.canonical,ids=new Set<number>(),ops=new Set(['=~','<~','~','~~','~1',':=','==','<','>','|','~*~']);
    if(model.ok!==true||model.versions?.lavaan!=='0.7.3'||!Array.isArray(model.table)||model.table.length>10000)throw new Error('badProject');
    for(const row of model.table){
      if(!Number.isInteger(row.id)||ids.has(row.id)||typeof row.lhs!=='string'||typeof row.rhs!=='string'||!ops.has(row.op)||!Number.isInteger(row.group)||!Number.isInteger(row.free))throw new Error('badProject');
      ids.add(row.id);
    }
    canonical=normalizeModel(model);
  }
  const dataset=p.dataset?readAttachment(p.dataset):undefined;
  return{format:'forma-sem',version:2,syntax:p.syntax,options,positions,display,canonical,analysis,dataset,datasetAttached:!!dataset||p.datasetAttached===true,
    validSyntax:typeof p.validSyntax==='string'?p.validSyntax:undefined};
}
export function savedProject():Project|undefined{try{const text=localStorage.getItem(SESSION);return text?readProject(JSON.parse(text)):undefined;}catch{return undefined;}}
export function downloadFile(content:string,filename:string,type:string){
  downloadBlob(new Blob([content],{type}),filename);
}
export function downloadBlob(blob:Blob,filename:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function rScript(syntax:string,options:Options){return `# Reproduce the model specification in R\n# Compiled using lavaan 0.7-3; no data or fitting\nlibrary(lavaan)\n\nmodel <- ${JSON.stringify(syntax)}\n\nparameters <- lavaanify(\n  model,\n  model_type = "${options.preset==='path'?'sem':options.preset}",\n  auto = TRUE,\n  ngroups = ${options.groups},\n  fixed_x = ${options.fixedX?'TRUE':'FALSE'},\n  meanstructure = ${options.meanstructure?'TRUE':'FALSE'},\n  int_ov_free = TRUE,\n  int_lv_free = FALSE\n)\n\nparameters\n`;}
