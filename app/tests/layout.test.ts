import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {layoutModel} from '../src/layout';
import {normalizeModel,type CompiledModel,type Scene,type Positions} from '../src/model';
import {nodeBox,overlaps,segmentHitsBox} from '../src/geometry';
const fixtures=JSON.parse(await readFile(new URL('./fixtures/compiled.json',import.meta.url),'utf8')) as {id:string;model:CompiledModel}[];
const scenes=new Map<string,Scene>();
for(const fixture of fixtures)test(`semantic coverage and geometry: ${fixture.id}`,async()=>{
  const model=normalizeModel(fixture.model),scene=await layoutModel(model);scenes.set(fixture.id,scene);
  const represented=new Set([...scene.edges.flatMap(e=>e.rowId?[e.rowId]:[]),...scene.annotations.flatMap(a=>a.rowId?[a.rowId]:[])]);
  for(const row of model.table)assert.ok(represented.has(row.id),`Missing parameter ${row.id} ${row.lhs} ${row.op} ${row.rhs}`);
  for(let i=0;i<scene.nodes.length;i++)for(let j=i+1;j<scene.nodes.length;j++)assert.ok(!overlaps(nodeBox(scene.nodes[i],2),nodeBox(scene.nodes[j],2)),`Overlapping nodes ${scene.nodes[i].id}, ${scene.nodes[j].id}`);
  for(const e of scene.edges)for(const n of scene.nodes)if(n.id!==e.source&&n.id!==e.target)assert.ok(!e.points.slice(1).some((p,i)=>segmentHitsBox(e.points[i],p,nodeBox(n,1))),`Edge ${e.id} intersects ${n.id}`);
  const labels=[...scene.edges.flatMap(e=>e.labelBox?[e.labelBox]:[]),...scene.annotations];
  for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++)assert.ok(!overlaps(labels[i],labels[j]),`Labels overlap ${i},${j}`);
  assert.deepEqual(scene.diagnostics,[]);
});
test('implicit marker defaults are distinguished from explicit fixed values',()=>{
  const hs=fixtures[0].model,two=fixtures[4].model;
  assert.equal(hs.table.filter(r=>r.defaultFixed).length,3);
  assert.equal(two.table.filter(r=>r.defaultFixed).length,0);
});
test('layout is deterministic and existing positions survive a syntax edit',async()=>{
  const model=normalizeModel(fixtures[0].model),first=await layoutModel(model),repeat=await layoutModel(model);
  assert.deepEqual(first.nodes.map(n=>[n.id,n.x,n.y]),repeat.nodes.map(n=>[n.id,n.x,n.y]));
  const positions:Positions=Object.fromEntries(first.nodes.map(n=>[n.id,{x:n.x,y:n.y}]));
  positions['g1:visual']={x:positions['g1:visual'].x-37,y:positions['g1:visual'].y+19};
  const modified=structuredClone(model),newId=Math.max(...model.table.map(r=>r.id))+1;
  modified.observed.push('x10');
  modified.table.push({...model.table[1],id:newId,lhs:'visual',rhs:'x10',label:'new_loading',defaultFixed:false,sourceOrder:50},
    {...model.table.find(r=>r.lhs==='x1'&&r.op==='~~')!,id:newId+1,lhs:'x10',rhs:'x10'});
  const next=await layoutModel(modified,positions);
  for(const n of next.nodes)if(positions[n.id])assert.deepEqual({x:n.x,y:n.y},positions[n.id],`Position changed: ${n.id}`);
});
test('feedback is rejected explicitly instead of converted to a DAG',async()=>{
  const model=structuredClone(normalizeModel(fixtures[2].model));
  model.table.push({...model.table[0],id:100,lhs:'X',rhs:'Y'});
  await assert.rejects(layoutModel(model),/layout.feedback/);
});
