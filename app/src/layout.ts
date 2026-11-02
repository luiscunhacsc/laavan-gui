import {buildGraph,directedCycle} from './sem-graph';
import {nodeId,parameterText,isUnmeasured,type Scene,type SceneNode,type Parameter,type Position,type Positions,type Box,type Edge,type Annotation,type CompiledModel} from './model';
import {nodeBox,overlaps,port,cubic,polyLength,segmentHitsBox,segmentsCross,parallelOverlap,distance,routeGrid,simplify} from './geometry';
import en from './en.json';

export type Measure=(text:string,size:number)=>number;
export const approximateMeasure:Measure=(s,size)=>[...s].reduce((n,c)=>n+(c===' '? .28:/[ilI1.,:;'|]/.test(c)? .29:/[MW@]/.test(c)? .88:.55),0)*size;
const elkReady=import('elkjs/lib/elk.bundled.js').then(module=>new module.default());
const union=(boxes:Box[]):Box=>{
  if(!boxes.length)return{x:0,y:0,width:700,height:400};
  const x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y));
  return{x,y,width:Math.max(...boxes.map(b=>b.x+b.width))-x,height:Math.max(...boxes.map(b=>b.y+b.height))-y};
};
function textFor(row:Parameter,all=false){return parameterText(row)||(all?en.free.toLowerCase():'');}

async function placeGroup(model:CompiledModel,group:number,measure:Measure){
  const graph=buildGraph(model,group),{nodes,rows,byName}=graph;
  for(const n of nodes)if(n.kind!=='residual')n.width=Math.max(n.kind==='observed'?96:114,measure(n.name,16)+34);
  const base=nodes.filter(n=>n.kind!=='residual');
  const measurement=rows.filter(r=>(r.op==='=~'||r.op==='<~')&&!isUnmeasured(r));
  const ownership=new Map<string,string>();
  for(const r of measurement)if(!ownership.has(r.rhs))ownership.set(r.rhs,r.lhs);
  const regressions=rows.filter(r=>r.op==='~');
  const arrows=regressions.map(r=>[r.rhs,r.lhs] as [string,string]);
  const measurementArrows=measurement.map(r=>(r.op==='=~'?[r.lhs,r.rhs]:[r.rhs,r.lhs]) as [string,string]);
  if(directedCycle(base.map(n=>n.name),[...arrows,...measurementArrows]))throw new Error('layout.feedback');
  const children=(name:string)=>measurement.filter(r=>r.lhs===name&&ownership.get(r.rhs)===name).map(r=>byName.get(r.rhs)!).filter(Boolean);
  const regNames=new Set(regressions.flatMap(r=>[r.lhs,r.rhs]));
  const skeleton=base.filter(n=>!ownership.has(n.name)||regNames.has(n.name));
  const skeletonNames=new Set(skeleton.map(n=>n.name));
  const treeChildren=(name:string)=>children(name).filter(n=>!skeletonNames.has(n.name));
  if(!regressions.length){
    const roots=skeleton;
    const height=(name:string):number=>{const c=treeChildren(name);return c.length?c.reduce((s,n)=>s+height(n.name),0)+Math.max(0,c.length-1)*26:104;};
    const levels=new Map<string,number>();
    const depth=(n:SceneNode,d:number)=>{levels.set(n.name,Math.max(levels.get(n.name)||0,d));for(const c of treeChildren(n.name))depth(c,d+1);};
    roots.forEach(n=>depth(n,0));
    const columnWidths:Array<number>=[];
    for(const n of base)columnWidths[levels.get(n.name)||0]=Math.max(columnWidths[levels.get(n.name)||0]||0,n.width);
    const xs=columnWidths.map((_,i)=>220+columnWidths.slice(0,i).reduce((s,w)=>s+w+210,0));
    const assign=(n:SceneNode,top:number)=>{const h=height(n.name),d=levels.get(n.name)||0;n.x=xs[d];n.y=top+h/2;
      let y=top;for(const c of treeChildren(n.name)){assign(c,y);y+=height(c.name)+26;}};
    let top=120;for(const root of roots){assign(root,top);top+=height(root.name)+110;}
  }else{
    const subtreeWidth=(n:SceneNode):number=>{const c=treeChildren(n.name);return c.length?Math.max(n.width,c.reduce((s,child)=>s+subtreeWidth(child),0)+(c.length-1)*36):Math.max(n.width,104);};
    const blockWidth=(n:SceneNode)=>Math.max(n.width+50,subtreeWidth(n)+70);
    const result=await (await elkReady).layout({id:'structural',layoutOptions:{'elk.algorithm':'layered','elk.direction':'RIGHT',
      'elk.spacing.nodeNode':'150','elk.layered.spacing.nodeNodeBetweenLayers':'180',
      'elk.layered.considerModelOrder.strategy':'NODES_AND_EDGES','elk.randomSeed':'41'},
      children:skeleton.map(n=>({id:n.id,width:blockWidth(n),height:treeChildren(n.name).length?480:110})),
      edges:regressions.map(r=>({id:`s${r.id}`,sources:[nodeId(group,r.rhs)],targets:[nodeId(group,r.lhs)]}))});
    for(const n of skeleton){const p=result.children!.find(p=>p.id===n.id)!;n.x=p.x!+p.width!/2+100;n.y=p.y!+140;}
    // A transitive three-node DAG is the classic mediation triangle, latent or observed.
    if(skeleton.length===3&&arrows.length===3){
      const degree=(name:string,incoming:boolean)=>arrows.filter(e=>e[incoming?1:0]===name).length;
      const x=skeleton.find(n=>degree(n.name,true)===0),m=skeleton.find(n=>degree(n.name,true)===1&&degree(n.name,false)===1),y=skeleton.find(n=>degree(n.name,false)===0);
      if(x&&m&&y){const baseline=480;x.y=baseline;y.y=baseline;m.y=baseline-210;}
    }
    const directions=new Map<string,number>();
    const roots=skeleton.filter(n=>!arrows.some(e=>e[1]===n.name));
    const sinks=skeleton.filter(n=>!arrows.some(e=>e[0]===n.name));
    if(!measurement.length&&roots.length>=2&&sinks.length===1&&skeleton.length===roots.length+2&&arrows.length===roots.length*2+1){
      const middle=skeleton.find(n=>!roots.includes(n)&&!sinks.includes(n))!;
      const left=Math.min(...roots.map(n=>n.x)),right=sinks[0].x;
      roots.forEach((n,i)=>{n.x=left;n.y=400+(i-(roots.length-1)/2)*280;});
      middle.x=(left+right)/2;middle.y=400;sinks[0].y=400;
    }
    // Long latent chains use alternating outside measurement rows. Reserving
    // each entire cluster's width in the structural spine wastes almost half
    // the page and needlessly produces extremely wide diagrams.
    if(skeleton.length>=4&&arrows.length===skeleton.length-1&&roots.length===1&&sinks.length===1&&
      skeleton.every(n=>arrows.filter(e=>e[0]===n.name).length<=1&&arrows.filter(e=>e[1]===n.name).length<=1)){
      const step=Math.max(240,...skeleton.map(n=>subtreeWidth(n)/2+45));
      let current:SceneNode|undefined=roots[0],i=0;
      while(current){current.x=300+i*step;current.y=500;directions.set(current.id,i%2?-1:1);
        const next=arrows.find(e=>e[0]===current!.name)?.[1];current=next?byName.get(next):undefined;i++;}
    }
    const spine=Math.max(...skeleton.map(n=>n.y));
    const assignChildren=(parent:SceneNode,direction:number)=>{
      const c=treeChildren(parent.name);const widths=c.map(subtreeWidth);const width=widths.reduce((a,b)=>a+b,0)+Math.max(0,c.length-1)*36;
      let x=parent.x-width/2;
      c.forEach((child,i)=>{child.x=x+widths[i]/2;child.y=parent.y+direction*240;x+=widths[i]+36;assignChildren(child,direction);});
    };
    skeleton.forEach(n=>assignChildren(n,directions.get(n.id)||(n.y<spine-120?-1:1)));
  }
  // Remaining shared indicators retain the position assigned by their first measurement relation.
  return graph;
}

function nodeHits(points:Position[],nodes:SceneNode[],source:string,target:string){
  return nodes.some(n=>{
    if(n.id!==source&&n.id!==target)return points.slice(1).some((p,i)=>segmentHitsBox(points[i],p,nodeBox(n,9)));
    // A curved edge may re-enter its endpoint node; excluding endpoint nodes
    // entirely would incorrectly accept such routes.
    const inside=(p:Position)=>n.kind==='observed'?p.x>n.x-n.width/2+1&&p.x<n.x+n.width/2-1&&p.y>n.y-n.height/2+1&&p.y<n.y+n.height/2-1:
      ((p.x-n.x)/(n.width/2-1))**2+((p.y-n.y)/(n.height/2-1))**2<1;
    return points.slice(1,-1).some(inside);
  });
}
function crossingCost(points:Position[],edges:Edge[]){
  return edges.reduce((total,e)=>total+points.slice(1).reduce((sum,p,i)=>sum+e.points.slice(1).reduce((score,q,j)=>score+(segmentsCross(points[i],p,e.points[j],q)?1:0)+parallelOverlap(points[i],p,e.points[j],q)/15,0),0),0);
}
function covariance(edge:Edge,nodes:SceneNode[],existing:Edge[],index:number):Position[]{
  const a=nodes.find(n=>n.id===edge.source)!,b=nodes.find(n=>n.id===edge.target)!;
  const candidates:Position[][]=[];
  // Diagonal bows let residual covariances follow the space between clusters.
  // Keep the cardinal candidates too: each route must clear every node.
  const dx=b.x-a.x,dy=b.y-a.y,length=distance(a,b)||1;
  for(const sign of [-1,1])for(const bend of [45,90,160,260]){
    const bow=sign*(bend+length*.08),nx=-dy/length,ny=dx/length;
    const c={x:a.x+dx*.3+nx*bow,y:a.y+dy*.3+ny*bow},d={x:b.x-dx*.3+nx*bow,y:b.y-dy*.3+ny*bow};
    const points=cubic(port(a,c),c,d,port(b,d));
    if(!nodeHits(points,nodes,edge.source,edge.target))candidates.push(points);
  }
  for(const side of ['west','east','north','south']){
    for(const extra of [0,65,140,240]){
      const span=(side==='west'||side==='east')&&Math.abs(a.x-b.x)<10?Math.abs(a.y-b.y)*.18:
        (side==='north'||side==='south')&&Math.abs(a.y-b.y)<10?Math.abs(a.x-b.x)*.18:0;
      const lane=65+span+(index%3)*8+extra;
      let p:Position,q:Position,c:Position,d:Position;
      if(side==='west'||side==='east'){
        const sign=side==='west'?-1:1;
        const x=(sign<0?Math.min(a.x-a.width/2,b.x-b.width/2):Math.max(a.x+a.width/2,b.x+b.width/2))+sign*lane;
        p={x:a.x+sign*a.width/2,y:a.y};q={x:b.x+sign*b.width/2,y:b.y};c={x,y:a.y};d={x,y:b.y};
      }else{
        const sign=side==='north'?-1:1;
        const y=(sign<0?Math.min(a.y-a.height/2,b.y-b.height/2):Math.max(a.y+a.height/2,b.y+b.height/2))+sign*lane;
        p={x:a.x,y:a.y+sign*a.height/2};q={x:b.x,y:b.y+sign*b.height/2};c={x:a.x,y};d={x:b.x,y};
      }
      const points=cubic(p,c,d,q);
      if(!nodeHits(points,nodes,edge.source,edge.target))candidates.push(points);
    }
  }
  if(candidates.length){
    const ranked=candidates.map(points=>({points,score:polyLength(points)+crossingCost(points,existing)*600}));
    return ranked.sort((a,b)=>a.score-b.score)[0].points;
  }
  const obstacles=nodes.map(n=>nodeBox(n,12));
  // Endpoint ports lead outside inflated bounds before the visibility search.
  const directions=[{x:-1,y:0},{x:1,y:0},{x:0,y:-1},{x:0,y:1}];
  const pairs=directions.flatMap(da=>directions.map(db=>({da,db,
    cost:distance({x:a.x+da.x*100,y:a.y+da.y*100},{x:b.x+db.x*100,y:b.y+db.y*100})}))).sort((x,y)=>x.cost-y.cost);
  let best:Position[]|undefined;
  for(const {da,db} of pairs.slice(0,8)){
    const p=port(a,{x:a.x+da.x*1000,y:a.y+da.y*1000}),q=port(b,{x:b.x+db.x*1000,y:b.y+db.y*1000});
    const outsideA={x:p.x+da.x*34,y:p.y+da.y*34},outsideB={x:q.x+db.x*34,y:q.y+db.y*34};
    if(obstacles.some(o=>segmentHitsBox(p,outsideA,o)&&!containsEndpoint(o,a))||obstacles.some(o=>segmentHitsBox(q,outsideB,o)&&!containsEndpoint(o,b)))continue;
    const avoid=existing.filter(e=>e.kind==='covariance'&&e.points.length<20).flatMap(e=>e.points.slice(1).map((p,i)=>[e.points[i],p] as [Position,Position]));
    const path=routeGrid(outsideA,outsideB,obstacles,avoid);
    if(path){const points=simplify([p,...path,q]);if(!nodeHits(points,nodes,edge.source,edge.target)&&(!best||polyLength(points)+crossingCost(points,existing)*600<polyLength(best)+crossingCost(best,existing)*600))best=points;}
  }
  if(!best)throw new Error('layout.route');
  return best;
}
function containsEndpoint(box:Box,n:SceneNode){return n.x>box.x&&n.x<box.x+box.width&&n.y>box.y&&n.y<box.y+box.height;}

export async function layoutModel(model:CompiledModel,previous:Positions={},measure:Measure=approximateMeasure):Promise<Scene>{
  const nodes:SceneNode[]=[],edges:Edge[]=[],annotations:Annotation[]=[],covered=new Set<number>(),diagnostics:string[]=[];
  let offset=0;
  for(let group=1;group<=model.options.groups;group++){
    const graph=await placeGroup(model,group,measure);
    const base=graph.nodes.filter(n=>n.kind!=='residual');
    for(const n of base){n.x+=offset;if(previous[n.id])Object.assign(n,previous[n.id]);}
    for(const n of graph.nodes.filter(n=>n.kind==='residual'))if(previous[n.id])Object.assign(n,previous[n.id]);
    // Only newly introduced variables may move to avoid an existing position.
    const placed=[...nodes,...graph.nodes.filter(n=>previous[n.id])];
    for(const n of base.filter(n=>!previous[n.id])){
      const original={x:n.x,y:n.y};
      if(placed.some(p=>overlaps(nodeBox(n,12),nodeBox(p,12)))){
        let found=false;
        for(let ring=1;ring<30&&!found;ring++)for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,1]]){
          n.x=original.x+dx*ring*135;n.y=original.y+dy*ring*100;
          if(!placed.some(p=>overlaps(nodeBox(n,12),nodeBox(p,12)))){found=true;break;}
        }
        if(!found)throw new Error('layout.nodes');
      }
      placed.push(n);
    }
    const directed=graph.edges.filter(e=>e.kind==='directed');
    for(const edge of directed){const a=graph.nodes.find(n=>n.id===edge.source)!,b=graph.nodes.find(n=>n.id===edge.target)!;edge.points=[port(a,b),port(b,a)];}
    const residuals=graph.nodes.filter(n=>n.kind==='residual');
    for(const e of residuals){
      const owner=base.find(n=>n.id===e.owner)!;
      if(previous[e.id])Object.assign(e,previous[e.id]);
      else{
        const measured=model.table.some(r=>r.group===group&&r.op==='=~'&&r.rhs===owner.name);
        const measuringParent=measured?base.find(n=>n.name===model.table.find(r=>r.group===group&&r.op==='=~'&&r.rhs===owner.name)!.lhs):undefined;
        const prefer=measuringParent?{x:owner.x+(owner.x-measuringParent.x)*.8,y:owner.y+(owner.y-measuringParent.y)*.8}:{x:owner.x,y:owner.y-130};
        // Prefer outward continuation for indicators; score all cardinal sectors.
        const candidates=[{x:owner.x+owner.width/2+104,y:owner.y},{x:owner.x-owner.width/2-104,y:owner.y},
          {x:owner.x,y:owner.y-owner.height/2-100},{x:owner.x,y:owner.y+owner.height/2+100}];
        const all=[...nodes,...base,...residuals.filter(r=>r!==e&&r.x!==0)];
        candidates.sort((a,b)=>{
          const score=(p:Position)=>distance(p,prefer)+all.filter(n=>overlaps({x:p.x-28,y:p.y-28,width:56,height:56},nodeBox(n,20))).length*10000+
            directed.filter(edge=>edge.points.slice(1).some((q,i)=>segmentHitsBox(edge.points[i],q,{x:p.x-24,y:p.y-24,width:48,height:48}))).length*2000+
            directed.filter(edge=>edge.source!==owner.id&&edge.target!==owner.id&&segmentsCross(p,owner,edge.points[0],edge.points[1])).length*300;
          return score(a)-score(b);
        });Object.assign(e,candidates[0]);
      }
    }
    nodes.push(...graph.nodes);edges.push(...directed);
    for(const edge of graph.edges.filter(e=>e.kind==='residual')){const a=graph.nodes.find(n=>n.id===edge.source)!,b=graph.nodes.find(n=>n.id===edge.target)!;edge.points=[port(a,b),port(b,a)];edges.push(edge);}
    let i=0;for(const edge of graph.edges.filter(e=>e.kind==='covariance')){edge.points=covariance(edge,graph.nodes,edges,i++);edges.push(edge);}
    for(const r of graph.rows)covered.add(r.id);
    const bounds=union(graph.nodes.map(n=>nodeBox(n,90)));offset=Math.max(offset,bounds.x+bounds.width+200);
  }
  if(model.displayVariances==='loops')for(const n of nodes)if(n.variance){
    const row=n.variance,candidates:Position[][]=[];
    for(const angle of [-Math.PI/2,Math.PI/2,Math.PI,0])for(const reach of [65,100,145]){
      const dx=Math.cos(angle),dy=Math.sin(angle),sx=-dy,sy=dx;
      const a=port(n,{x:n.x+dx*80-sx*35,y:n.y+dy*80-sy*35}),b=port(n,{x:n.x+dx*80+sx*35,y:n.y+dy*80+sy*35});
      const cp={x:a.x+dx*reach-sx*reach*.8,y:a.y+dy*reach-sy*reach*.8},cq={x:b.x+dx*reach+sx*reach*.8,y:b.y+dy*reach+sy*reach*.8};
      const points=cubic(a,cp,cq,b);if(!nodeHits(points,nodes,n.id,n.id))candidates.push(points);
    }
    if(!candidates.length)throw new Error('layout.labels');
    const coarse=(points:Position[])=>points.length>12?points.filter((_,i)=>i%6===0||i===points.length-1):points;
    const obstacles=edges.map(e=>({...e,points:coarse(e.points)}));
    const ranked=candidates.map(points=>({points,score:crossingCost(coarse(points),obstacles)*1000+polyLength(points)})).sort((a,b)=>a.score-b.score);
    edges.push({id:`variance:${n.group}:${row.id}`,source:n.id,target:n.id,kind:'covariance',rowId:row.id,label:textFor(row,true),implicit:row.origin==='implicit',fixed:row.free===0,points:ranked[0].points});
  }
  const occupied:Box[]=[];
  const placeLabel=(text:string,candidates:Position[],size:number,implicit:boolean,rowId?:number):Annotation=>{
    const width=measure(text,size)+8,height=size+8;
    const valid=(box:Box)=>!nodes.some(n=>overlaps(box,nodeBox(n,6)))&&!occupied.some(o=>overlaps(box,o,4))&&
      !edges.some(e=>e.points.slice(1).some((p,i)=>segmentHitsBox(e.points[i],p,box)));
    let best:Box|undefined;
    for(const p of candidates){const box={x:p.x-width/2,y:p.y-height/2,width,height};if(valid(box)){best=box;break;}}
    if(!best){
      const p=candidates[0];
      for(let ring=1;ring<=25&&!best;ring++)for(let direction=0;direction<16;direction++){
        const angle=direction*Math.PI/8,box={x:p.x+Math.cos(angle)*ring*20-width/2,y:p.y+Math.sin(angle)*ring*20-height/2,width,height};
        if(valid(box)){best=box;break;}
      }
    }
    if(!best)throw new Error('layout.labels');
    occupied.push(best);return{...best,text,implicit,rowId};
  };
  // Fixed and user-labelled paths have first claim on space near their path.
  for(const edge of edges){
    const row=model.table.find(r=>r.id===edge.rowId);
    const text=edge.label;
    if(!text)continue;
    const candidates:Position[]=[];
    for(const fraction of [.5,.35,.65,.2,.8]){
      const step=Math.min(edge.points.length-2,Math.floor(fraction*(edge.points.length-1))),a=edge.points[step],b=edge.points[step+1];
      const p=edge.points.length===2?{x:a.x+(b.x-a.x)*fraction,y:a.y+(b.y-a.y)*fraction}:edge.points[step];
      const length=distance(a,b)||1;
      for(const offset of [17,-17,28,-28,42,-42])candidates.push({x:p.x-(b.y-a.y)/length*offset,y:p.y+(b.x-a.x)/length*offset});
    }
    const box=placeLabel(text,candidates,13,edge.implicit||!!row?.defaultFixed,edge.rowId);edge.labelBox=box;
  }
  for(const n of nodes){
    const candidates=(text:string)=>[
      {x:n.x,y:n.y-n.height/2-27},{x:n.x,y:n.y+n.height/2+27},
      {x:n.x+n.width/2+measure(text,12)/2+14,y:n.y},{x:n.x-n.width/2-measure(text,12)/2-14,y:n.y}];
    if(n.variance&&model.displayVariances!=='loops'){const r=n.variance,text=`${en.varianceNotation} ${textFor(r,true)}`;annotations.push(placeLabel(text,candidates(text),12,r.origin==='implicit',r.id));}
    if(n.mean){const r=n.mean,text=`μ = ${textFor(r,true)}`;annotations.push(placeLabel(text,candidates(text).reverse(),12,r.origin==='implicit',r.id));}
    if(n.kind==='composite')annotations.push(placeLabel(en.composite,candidates(en.composite),11,false));
    const declaration=model.table.find(r=>r.group===n.group&&r.lhs===n.name&&isUnmeasured(r));
    if(declaration)annotations.push(placeLabel(en.builder.unmeasured,candidates(en.builder.unmeasured),11,false,declaration.id));
    for(const r of n.thresholds){const text=r.op==='|'?`${r.rhs}${parameterText(r)?' = '+parameterText(r):''}`:`${en.scale} ${textFor(r,true)}`;annotations.push(placeLabel(text,candidates(text),12,r.origin==='implicit',r.id));}
    const r2=model.displayRSquared?.find(r=>r.name===n.name&&r.group===n.group);
    if(r2?.value!=null&&Number.isFinite(r2.value)){const text=`R² = ${r2.value.toFixed(3)}`;annotations.push(placeLabel(text,[{x:n.x,y:n.y-n.height/2-27},{x:n.x,y:n.y-n.height/2-52},{x:n.x-30,y:n.y-n.height/2-52},{x:n.x+30,y:n.y-n.height/2-52}],12,false));}
  }
  let bounds=union([...nodes.map(n=>nodeBox(n,0)),...edges.flatMap(e=>e.points.map(p=>({...p,width:0,height:0}))),...occupied]);
  let footerY=bounds.y+bounds.height+65;
  for(const row of model.table.filter(r=>[':=','==','<','>'].includes(r.op))){
    let text=`${row.lhs} ${row.op} ${row.rhs}`;
    if(row.op===':='&&typeof row.displayText==='string')text+=` = ${row.displayText}`;
    if(row.user===2){const a=model.table.find(r=>r.plabel===row.lhs),b=model.table.find(r=>r.plabel===row.rhs);text=`${a?.label||row.lhs}: g${a?.group} = g${b?.group}`;}
    const width=measure(text,14)+12;annotations.push({x:bounds.x,y:footerY,width,height:26,text,implicit:false,rowId:row.id});covered.add(row.id);footerY+=31;
  }
  for(const row of model.table){
    const lower=typeof row.lower==='number'?row.lower:undefined,upper=typeof row.upper==='number'?row.upper:undefined;
    if(lower!==undefined||upper!==undefined){const text=`${lower!==undefined?lower+' < ':''}${row.label||row.plabel}${upper!==undefined?' < '+upper:''}`;
      annotations.push({x:bounds.x,y:footerY,width:measure(text,14)+12,height:26,text,implicit:false,rowId:row.id});footerY+=31;}
  }
  for(const note of model.displayNotes||[]){annotations.push({x:bounds.x,y:footerY,width:measure(note,12)+12,height:24,text:note,implicit:false});footerY+=29;}
  bounds=union([...nodes.map(n=>nodeBox(n,0)),...edges.flatMap(e=>e.points.map(p=>({...p,width:0,height:0}))),...annotations,...occupied]);
  for(const e of edges.filter(e=>e.kind!=='covariance'))if(nodeHits(e.points,nodes,e.source,e.target))diagnostics.push(`edge-node:${e.id}`);
  for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++)if(overlaps(nodeBox(nodes[i],1),nodeBox(nodes[j],1)))diagnostics.push(`node-node:${nodes[i].id},${nodes[j].id}`);
  const panels=Array.from({length:model.options.groups},(_,i)=>{
    const group=i+1,b=union(nodes.filter(n=>n.group===group).map(n=>nodeBox(n,55)));
    return{...b,group,title:`Group ${group}`};
  });
  if(model.options.groups>1)bounds=union([bounds,...panels.map(p=>({x:p.x,y:p.y-45,width:100,height:22}))]);
  return{nodes,edges,annotations,panels,width:Math.max(500,bounds.width+100),height:Math.max(350,bounds.height+100),
    minX:bounds.x-50,minY:bounds.y-50,coveredRows:[...covered],diagnostics,model};
}
