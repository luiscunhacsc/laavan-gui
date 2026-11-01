import type {CompiledModel} from './model';
const digits='₀₁₂₃₄₅₆₇₈₉';
const sub=(n:number)=>String(n).split('').map(d=>digits[Number(d)]).join('');
export function notationModel(model:CompiledModel):CompiledModel {
 const latent=new Set(model.latent),endogenous=new Set(model.table.filter(r=>r.op==='~').map(r=>r.lhs));
 const index=(name:string)=>1+(latent.has(name)?model.latent:model.observed).indexOf(name);
 const pair=(a:number,b:number)=>sub(a)+(a>9||b>9?',':'')+sub(b);
 return {...model,table:model.table.map(r=>{
  if(typeof r.displayText==='string'||r.label||r.free===0||!['=~','~','~~','~1','|'].includes(r.op))return r;
  let symbol='';
  if(r.op==='=~')symbol='λ'+pair(index(r.rhs),index(r.lhs));
  else if(r.op==='~')symbol=(latent.has(r.rhs)&&!endogenous.has(r.rhs)?'γ':'β')+pair(index(r.lhs),index(r.rhs));
  else if(r.op==='~~')symbol=(latent.has(r.lhs)&&latent.has(r.rhs)?endogenous.has(r.lhs)||endogenous.has(r.rhs)?'ψ':'φ':'θ')+pair(index(r.lhs),index(r.rhs));
  else if(r.op==='~1')symbol=(latent.has(r.lhs)?'α':'μ')+sub(index(r.lhs));
  else symbol='τ'+sub(index(r.lhs))+sub(Number(r.rhs.replace(/^t/,''))||1);
  return {...r,displayText:symbol};
 })};
}
