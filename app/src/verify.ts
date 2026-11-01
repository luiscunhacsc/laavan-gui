import {layoutModel,type Measure} from './layout';
import type {LavaanRuntime} from './runtime';
import {defaultOptions} from './model';
import fixtures from '../../fixtures/models.json';
// Opt-in development verification uses only the seven public fixture models.
// This module and local evidence writes are absent from production execution.
export async function verifyBrowser(runtime:LavaanRuntime,measure:Measure){
  const models=[];
  for(const fixture of fixtures){
    const start=performance.now();
    try{
      const model=await runtime.compile(fixture.syntax,{...defaultOptions,preset:fixture.preset as 'sem'|'cfa',groups:fixture.groups,meanstructure:fixture.groups>1});
      if(!model.ok)throw new Error(model.message);
      const scene=await layoutModel(model,{},measure);
      models.push({id:fixture.id,ok:true,seconds:(performance.now()-start)/1000,model,scene});
    }catch(error){models.push({id:fixture.id,ok:false,error:String(error)});}
  }
  const response=await fetch('/__qa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userAgent:navigator.userAgent,models})});
  if(!response.ok)throw new Error('Local evidence write failed');
  return models.filter(m=>m.ok).length;
}
