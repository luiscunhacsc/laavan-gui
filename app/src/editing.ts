import type {CompiledModel,Options,Parameter,Positions} from './model';
import en from './en.json';
export type DrawTool='select'|'observed'|'latent'|'regression'|'loading'|'covariance'|'formative';
export type EditCommand=
 |{kind:'observed'|'latent';name:string}
 |{kind:'connect';from:string;to:string;relation:'regression'|'loading'|'covariance'|'formative'}
 |{kind:'parameter';id:number;mode:'free'|'fixed'|'default';value?:number;label:string;allGroups:boolean}
 |{kind:'removeParameter';id:number}
 |{kind:'rename';name:string;newName:string}
 |{kind:'removeVariable';name:string}
 |{kind:'format'};
export interface EditResult {ok:true;syntax:string;model:CompiledModel|null;warnings:string[]}
export const parameterKey=(r:Pick<Parameter,'lhs'|'op'|'rhs'|'group'>)=>JSON.stringify([r.group,r.lhs,r.op,r.rhs]);
export function nextVariableName(kind:'observed'|'latent',model?:CompiledModel){const taken=new Set([...(model?.observed||[]),...(model?.latent||[])]);let n=1;const prefix=kind==='latent'?'F':'x';while(taken.has(`${prefix}${n}`))n++;return `${prefix}${n}`;}
export const editHeadings=()=>en.builder.sections;
export interface ModelSnapshot {syntax:string;options:Options;positions:Positions}
const semantic=(a:ModelSnapshot,b:ModelSnapshot)=>a.syntax===b.syntax&&JSON.stringify(a.options)===JSON.stringify(b.options);
export class ModelHistory {
  private entries:ModelSnapshot[];private index=0;
  constructor(initial:ModelSnapshot){this.entries=[structuredClone(initial)];}
  get current(){return structuredClone(this.entries[this.index]);}
  get canUndo(){return this.index>0;}
  get canRedo(){return this.index<this.entries.length-1;}
  reset(snapshot:ModelSnapshot){this.entries=[structuredClone(snapshot)];this.index=0;}
  record(snapshot:ModelSnapshot,geometry=false){
    const previous=this.entries[this.index];
    if(semantic(previous,snapshot)&&!geometry){previous.positions=structuredClone(snapshot.positions);return;}
    if(JSON.stringify(previous)===JSON.stringify(snapshot))return;
    this.entries=this.entries.slice(0,this.index+1);this.entries.push(structuredClone(snapshot));
    if(this.entries.length>100)this.entries.shift();this.index=this.entries.length-1;
  }
  peek(delta:number){const i=this.index+delta;return i>=0&&i<this.entries.length?structuredClone(this.entries[i]):undefined;}
  move(delta:number){if(this.peek(delta))this.index+=delta;}
}
