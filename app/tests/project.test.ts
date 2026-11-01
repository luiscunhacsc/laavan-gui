import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readProject,rScript} from '../src/project';
import {defaultOptions,defaultDisplay} from '../src/model';
test('project retains the canonical table, draft text and saved positions',async()=>{
  const fixtures=JSON.parse(await readFile(new URL('./fixtures/compiled.json',import.meta.url),'utf8'));
  const p={format:'forma-sem',version:1,syntax:'incomplete draft',validSyntax:fixtures[0].syntax,options:defaultOptions,display:defaultDisplay,positions:{'g1:visual':{x:320,y:240}},canonical:fixtures[0].model};
  const result=readProject(JSON.parse(JSON.stringify(p)));
  assert.deepEqual(result.canonical?.table,fixtures[0].model.table);
  assert.equal(result.syntax,p.syntax);assert.equal(result.validSyntax,p.validSyntax);assert.deepEqual(result.positions,p.positions);
});
test('future schema and nonfinite positions cannot be silently applied',()=>{
  assert.throws(()=>readProject({format:'forma-sem',version:9,syntax:'y ~ x'}),/badProject/);
  const p=readProject({format:'forma-sem',version:1,syntax:'y ~ x',positions:{a:{x:Infinity,y:3}}});
  assert.deepEqual(p.positions,{});
});

test('path preset survives saving and reproduces the SEM parameter defaults in R',()=>{
  const options={...defaultOptions,preset:'path' as const};
  const project={format:'forma-sem',version:1,syntax:'M ~ a*X\nY ~ b*M + cp*X\nind := a*b',options};
  const restored=readProject(JSON.parse(JSON.stringify(project)));
  assert.equal(restored.options.preset,'path');
  assert.equal(rScript(restored.syntax,restored.options),rScript(restored.syntax,defaultOptions));
  assert.match(rScript(restored.syntax,restored.options),/model_type = "sem"/);
});
