import {nodeId,parameterText,isUnmeasured,type CompiledModel,type SceneNode,type Parameter,type Edge} from './model';
export function buildGraph(model:CompiledModel,group:number){
  const rows=model.table.filter(r=>r.group===group),latent=new Set(model.latent);
  const composites=new Set(rows.filter(r=>r.op==='<~').map(r=>r.lhs));
  const names=[...new Set(rows.filter(r=>['=~','<~','~','~~','~1','|','~*~'].includes(r.op)).flatMap(r=>['~1','|','~*~'].includes(r.op)?[r.lhs]:[r.lhs,r.rhs]))].filter(Boolean);
  const nodes:SceneNode[]=names.map(name=>({id:nodeId(group,name),name,group,
    kind:composites.has(name)?'composite':latent.has(name)?'latent':'observed',x:0,y:0,
    width:Math.max(latent.has(name)?114:96,Math.min(320,name.length*8.8+30)),
    height:latent.has(name)?58:44,implicit:false,thresholds:[]}));
  const byName=new Map(nodes.map(n=>[n.name,n]));
  const endogenous=new Set([...rows.filter(r=>r.op==='=~'&&!isUnmeasured(r)).map(r=>r.rhs),...rows.filter(r=>r.op==='~').map(r=>r.lhs)]);
  const residuals=new Map<string,SceneNode>();
  let error=0,disturbance=0;
  for(const row of rows){
    const n=byName.get(row.lhs);
    if(row.op==='~~'&&row.lhs===row.rhs&&n){
      if(endogenous.has(n.name)&&!(row.free===0&&row.ustart===0)){
        const e:SceneNode={id:`res:${n.id}`,name:n.kind==='observed'?`e${++error}`:`d${++disturbance}`,
          owner:n.id,kind:'residual',width:34,height:34,x:0,y:0,group,implicit:row.origin==='implicit',variance:row,thresholds:[]};
        residuals.set(n.name,e);nodes.push(e);
      }else n.variance=row;
    }else if(row.op==='~1'&&n)n.mean=row;
    else if((row.op==='|'||row.op==='~*~')&&n)n.thresholds.push(row);
  }
  const edges:Edge[]=[];
  for(const row of rows){
    const id=`g${group}:p${row.id}`;
    if(isUnmeasured(row))continue;
    if(['=~','<~','~'].includes(row.op)){
      const [source,target]=row.op==='=~'?[row.lhs,row.rhs]:[row.rhs,row.lhs];
      edges.push({id,source:nodeId(group,source),target:nodeId(group,target),kind:'directed',
        label:parameterText(row),implicit:row.origin==='implicit',defaultFixed:row.defaultFixed,
        rowId:row.id,fixed:row.free===0,points:[]});
    }else if(row.op==='~~'&&row.lhs!==row.rhs){
      edges.push({id,source:residuals.get(row.lhs)?.id||nodeId(group,row.lhs),target:residuals.get(row.rhs)?.id||nodeId(group,row.rhs),
        kind:'covariance',label:parameterText(row),implicit:row.origin==='implicit',rowId:row.id,fixed:row.free===0,points:[]});
    }
  }
  for(const e of residuals.values())edges.push({id:`attach:${e.id}`,source:e.id,target:e.owner!,kind:'residual',label:'1',implicit:e.implicit,fixed:true,points:[]});
  return{nodes,edges,rows,byName,residuals};
}
export function directedCycle(names:string[],arrows:[string,string][]){
  const seen=new Set<string>(),visiting=new Set<string>();
  const walk=(name:string):boolean=>{if(visiting.has(name))return true;if(seen.has(name))return false;visiting.add(name);
    for(const [a,b] of arrows)if(a===name&&walk(b))return true;
    visiting.delete(name);seen.add(name);return false;};
  return names.some(walk);
}
