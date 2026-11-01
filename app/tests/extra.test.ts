import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {layoutModel} from '../src/layout';
import {renderSvg} from '../src/svg';
import {defaultDisplay,normalizeModel,type CompiledModel} from '../src/model';
const fixtures=JSON.parse(await readFile(new URL('./fixtures/extra-compiled.json',import.meta.url),'utf8')) as {id:string;model:CompiledModel}[];
for(const fixture of fixtures)test(`additional syntax: ${fixture.id}`,async()=>{
  const model=normalizeModel(fixture.model),scene=await layoutModel(model);
  const represented=new Set([...scene.edges.flatMap(e=>e.rowId?[e.rowId]:[]),...scene.annotations.flatMap(a=>a.rowId?[a.rowId]:[])]);
  for(const row of model.table)assert.ok(represented.has(row.id),`${fixture.id}: missing ${row.lhs} ${row.op} ${row.rhs}`);
  assert.deepEqual(scene.diagnostics,[],`${fixture.id}: edge-node collision`);
});
test('formative arrows point into the composite, not out to its inputs',async()=>{
  const scene=await layoutModel(normalizeModel(fixtures[0].model));
  const formative=scene.model.table.filter(r=>r.op==='<~');
  assert.equal(formative[0].defaultFixed,true,'default-fixed composite weight was not distinguished');
  for(const row of formative){const edge=scene.edges.find(e=>e.rowId===row.id)!;assert.equal(edge.target,'g1:F');assert.equal(edge.source,`g1:${row.rhs}`);}
});
test('SVG escapes names and title; implicit toggle does not change canonical model',async()=>{
  const model=normalizeModel(fixtures[2].model),scene=await layoutModel(model),before=JSON.stringify(model);
  const svg=renderSvg(scene,{...defaultDisplay,title:'<script> & "quoted"'});
  assert.ok(!svg.includes('<script>'));assert.ok(svg.includes('&lt;script&gt;'));
  const hidden=renderSvg(scene,{...defaultDisplay,implicit:false});
  assert.ok(hidden.length<svg.length);assert.equal(JSON.stringify(model),before);
  assert.ok(hidden.includes('data-node="g1:x1"'),'explicit loading indicator was hidden');
});
test('hiding implicit marker values retains an explicitly supplied parameter label',async()=>{
  const model=structuredClone(normalizeModel(fixtures[2].model));
  const row=model.table.find(r=>r.op==='=~')!;row.free=0;row.ustart=1;row.label='marker';row.defaultFixed=true;
  const scene=await layoutModel(model),visible=renderSvg(scene,defaultDisplay),hidden=renderSvg(scene,{...defaultDisplay,implicit:false});
  assert.ok(visible.includes('marker = 1'));assert.ok(hidden.includes('>marker</text>'));
});
