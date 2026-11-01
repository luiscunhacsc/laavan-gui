import en from './en.json';
export type Options = {preset:'sem'|'cfa'|'path';groups:number;fixedX:boolean;meanstructure:boolean};
export const defaultOptions:Options={preset:'sem',groups:1,fixedX:false,meanstructure:false};
export interface Parameter {
  id:number;lhs:string;op:string;rhs:string;user:number;group:number;block:number;
  free:number;ustart:number|null;label:string;plabel:string;exo:number;level?:number;
  lower?:number|string;upper?:number|string;
  origin:'implicit'|'explicit'|'constraint';defaultFixed:boolean;sourceOrder:number;
  [key:string]:unknown;
}
export interface CompiledModel {
  ok:true;table:Parameter[];latent:string[];observed:string[];
  source:Record<string,unknown>[];constraints:unknown;modifiers:unknown;
  options:Options;warnings:string[];versions:{lavaan:string;R:string};
  displayRSquared?:{name:string;group:number;value:number|null}[];
  analysisDisplay?:{estimator:string;missing:string;datasetId:string;mode:string;extra:string};
  displayVariances?:'amos'|'loops';
  displayNotes?:string[];
}
export interface CompileFailure {ok:false;message:string;warnings:string[]}
export type CompileResult=CompiledModel|CompileFailure;
export type Position={x:number;y:number};
export type Positions=Record<string,Position>;
export type NodeKind='observed'|'latent'|'residual'|'composite';
export interface SceneNode extends Position {
  id:string;name:string;kind:NodeKind;width:number;height:number;group:number;
  implicit:boolean;owner?:string;variance?:Parameter;mean?:Parameter;thresholds:Parameter[];
}
export interface Edge {
  id:string;source:string;target:string;kind:'directed'|'covariance'|'residual';
  label:string;implicit:boolean;rowId?:number;fixed:boolean;points:Position[];
  defaultFixed?:boolean;
  labelBox?:Box;text?:string;
}
export interface Box extends Position {width:number;height:number}
export interface Annotation extends Box {text:string;implicit:boolean;rowId?:number}
export interface Panel extends Box {group:number;title:string}
export interface Scene {nodes:SceneNode[];edges:Edge[];annotations:Annotation[];panels:Panel[];
  width:number;height:number;minX:number;minY:number;coveredRows:number[];diagnostics:string[];model:CompiledModel}
export interface Display {implicit:boolean;labels:'labels'|'parameters';theme:'journal'|'presentation';title:string;notation?:boolean;varianceStyle?:'amos'|'loops'}
export const defaultDisplay:Display={implicit:true,labels:'labels',theme:'journal',title:en.defaultTitle};
export const nodeId=(group:number,name:string)=>`g${group}:${name}`;
export const isUnmeasured=(row:Parameter)=>row.op==='=~'&&row.lhs===row.rhs&&row.free===0&&row.ustart===0;
export function parameterText(row:Parameter) {
  if(typeof row.displayText==='string')return row.displayText;
  if(row.free===0&&row.ustart!==null) return row.label?`${row.label} = ${row.ustart}`:String(row.ustart);
  if(row.free===0&&row.ustart===null&&![':=','==','<','>'].includes(row.op))return row.label||(row.exo===1?en.sampleValue:en.derivedValue);
  return row.label||'';
}
export function normalizeModel(model:CompiledModel):CompiledModel {
  return {...model,latent:Array.isArray(model.latent)?model.latent:[model.latent].filter(Boolean),
    observed:Array.isArray(model.observed)?model.observed:[model.observed].filter(Boolean),
    warnings:Array.isArray(model.warnings)?model.warnings:[model.warnings].filter(Boolean)};
}
