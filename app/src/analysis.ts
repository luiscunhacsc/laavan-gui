import type {CompiledModel,Options} from './model';
import en from './en.json';
export type VariableType='continuous'|'ordered'|'nominal';
export interface Variable {name:string;label:string;storage:'numeric'|'text'|'date'|'logical';type:VariableType;missing:number;systemMissing:number;userMissing:number;valid:number;distinct:number;categories:{value:number|string;label:string}[];levels:(number|string)[];min:number|null;max:number|null;mean:number|null}
export interface Dataset {id:string;revision:number;name:string;kind:'raw'|'covariance';rows:number;columns:Variable[];sampleSize?:number;names?:string[];matrix?:number[][];means?:number[];source:{format:string;fileName?:string;example?:string;sheet?:string;delimiter?:string;na?:string[]}}
export interface Cell {value:number|string|boolean|null;label:string|null;missing:boolean}
export interface DataPage {ok:true;start:number;columns:string[];rows:Cell[][];warnings:string[]}
export interface AnalysisOptions {estimator:'ML'|'MLR'|'WLSMV';missing:'listwise'|'fiml'|'pairwise';group:string;bootstrap?:number;seed?:number;confidence?:number;invariance?:boolean;reliability?:boolean;modificationIndices?:boolean}
export const defaultAnalysis:AnalysisOptions={estimator:'ML',missing:'listwise',group:''};
export interface Estimate {lhs:string;op:string;rhs:string;group?:number;block?:number;label?:string;est:number|null;se:number|null;z:number|null;pvalue:number|null;'ci.lower'?:number|null;'ci.upper'?:number|null;'std.all'?:number|null;'est.std'?:number|null}
export interface FitResult {ok:true;converged:boolean;admissible:boolean;model:CompiledModel;parameters:Estimate[];standardized:Estimate[];measures:{name:string;value:number|null;reason:string|null}[];rsquared:{name:string;group:number;value:number|null}[];nobs:number[];inputCases:number;excluded:number;estimator:string;missing:string;ordered:string[];script:string;versions:{lavaan:string;R:string;readxl?:string;haven?:string};datasetId:string;datasetRevision:number;warnings:string[]}
export interface AnalysisSnapshot {key:string;datasetName:string;syntax:string;result:FitResult;at:string}
export interface Modification {lhs:string;op:'=~'|'~'|'~~';rhs:string;group?:number;mi:number;epc:number|null;'sepc.all':number|null}
export interface InvarianceRow {stage:'configural'|'metric'|'scalar'|'strict';converged:boolean;admissible:boolean;chisq:number|null;df:number|null;pvalue:number|null;cfi:number|null;cfiType:string;rmsea:number|null;rmseaType:string;srmr:number|null;deltaCfi:number|null;deltaRmsea:number|null;difference:{chisq:number|null;df:number|null;pvalue:number|null;method:string[]}|null;differenceError:string|null}
export interface Reliability {status:string;version?:string;scales:{group:number;groupLabel:string;factor:string;omega:number|null;ave:number|null}[];pairs:{group:number;first:string;second:string;correlation:number|null;sqrtAveFirst:number|null;sqrtAveSecond:number|null;fornellLarcker:boolean|null;htmt2:number|null;reason?:string|null}[]}
export interface FitResult {confidence?:number;groupLabels?:string[];bootstrap?:{requested:number;completed:number;failed:number;nonadmissible:number;seed:number;confidence:number;interval:string}|null;modifications?:{status:string;message?:string;total:number;truncated:boolean;rows:Modification[]}|null;reliability?:Reliability|null;invariance?:InvarianceRow[]|null}
export type AnnotationOptions={mode:'specification'|'estimates'|'standardized';extra:'none'|'se'|'pvalue'|'stars';rsquared:boolean};
export const defaultAnnotation:AnnotationOptions={mode:'specification',extra:'none',rsquared:false};
export function analysisKey(syntax:string,options:Options,analysis:AnalysisOptions,dataset?:Dataset){return JSON.stringify([syntax,options,analysis,dataset?.id,dataset?.revision]);}
export function messageText(message:string){const split=message.indexOf(': '),key=split>=0?message.slice(0,split):message;const translated=(en.errors as Record<string,string>)[key];return translated?translated+(split>=0?message.slice(split):''):message;}
export function numberText(value:number|null|undefined,digits=3){return value==null||!Number.isFinite(value)?'—':value.toFixed(digits);}
export function estimateFor(row:{lhs:string;op:string;rhs:string;group:number},values:Estimate[]){return values.find(v=>v.lhs===row.lhs&&v.op===row.op&&v.rhs===row.rhs&&(v.group||1)===(row.group||1));}
// This is a display projection; the canonical fitted parameter table stays intact.
export function annotatedModel(fit:FitResult,view:AnnotationOptions):CompiledModel {
  const base={...fit.model,displayRSquared:view.rsquared?fit.rsquared:[],analysisDisplay:{estimator:fit.estimator,missing:fit.missing,datasetId:fit.datasetId,mode:view.mode,extra:view.extra}};
  if(view.mode==='specification')return base;
  return {...base,table:fit.model.table.map(row=>{
    if(['==','<','>'].includes(row.op))return row;
    const estimate=estimateFor(row,view.mode==='standardized'?fit.standardized:fit.parameters);
    const value=view.mode==='standardized'?estimate?.['est.std']:estimate?.est;
    if(value==null)return {...row,displayText:'—'};
    let text=numberText(value);
    if(view.extra==='se'&&estimate?.se!=null)text+=` (${numberText(estimate.se)})`;
    if(view.extra==='pvalue'&&estimate?.pvalue!=null)text+=` ${estimate.pvalue<.001?'p < .001':`p = ${numberText(estimate.pvalue)}`}`;
    if(view.extra==='stars'&&row.free>0&&estimate?.pvalue!=null)text+=estimate.pvalue<.001?'***':estimate.pvalue<.01?'**':estimate.pvalue<.05?'*':'';
    return {...row,displayText:text};
  })};
}
export function parametersCsv(fit:FitResult){
  const keys=['lhs','op','rhs','group','label','est','se','z','pvalue','ci.lower','ci.upper','std.all'] as const;
  const escape=(v:unknown)=>`"${String(v??'').replaceAll('"','""')}"`;
  return [keys.join(','),...fit.parameters.map(p=>keys.map(k=>escape(p[k])).join(','))].join('\r\n');
}
