import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ModelHistory,nextVariableName} from '../src/editing';
import {layoutModel} from '../src/layout';
import {normalizeModel,defaultOptions,defaultDisplay,type CompiledModel} from '../src/model';
import {renderSvg,sceneBody} from '../src/svg';
const fixtures=JSON.parse(await readFile(new URL('./fixtures/editing.json',import.meta.url),'utf8'));
test('an unmeasured latent is drawn as one latent, with no fake indicator or self path',async()=>{
 const model=normalizeModel(fixtures.phantom.model),scene=await layoutModel(model);
 assert.equal(scene.nodes.length,1);assert.equal(scene.nodes[0].kind,'latent');assert.equal(scene.edges.length,0);
 assert.equal(scene.model.observed.length,0);assert.match(renderSvg(scene,defaultDisplay),/No indicators/);assert.equal(scene.coveredRows.length,model.table.length);
});
for(const key of ['mediation','cfa'])test(`model created through visual commands retains complete geometry: ${key}`,async()=>{
 const model=normalizeModel(fixtures[key].model as CompiledModel),scene=await layoutModel(model);
 assert.deepEqual(scene.diagnostics,[]);assert.equal(scene.coveredRows.length,model.table.length);
 const interactive=sceneBody(scene,defaultDisplay,[],true);
 assert.match(interactive,/data-parameter=/);assert.match(interactive,/data-node=/);
 const exported=renderSvg(scene,defaultDisplay);assert.doesNotMatch(exported,/data-parameter=|tabindex=/);
});
test('model history restores syntax, options and positions and discards an abandoned redo branch',()=>{
 const initial={syntax:'X ~~ X',options:defaultOptions,positions:{'g1:X':{x:100,y:200}}};
 const history=new ModelHistory(initial);
 const connected={syntax:'Y ~ X',options:{...defaultOptions,preset:'path' as const},positions:{...initial.positions,'g1:Y':{x:500,y:200}}};
 history.record(connected);history.record({...connected,positions:{...connected.positions,'g1:X':{x:150,y:300}}},true);
 assert.equal(history.peek(-1)?.positions['g1:X'].x,100);history.move(-1);history.move(-1);
 assert.equal(history.current.syntax,initial.syntax);assert.equal(history.current.options.preset,'sem');assert.equal(history.current.positions['g1:Y'],undefined);
 history.move(1);assert.equal(history.current.options.preset,'path');
 history.record({...connected,syntax:'Y ~ a*X'});assert.equal(history.canRedo,false);
 const view=history.current;view.positions['g1:X'].x=-999;assert.equal(history.current.positions['g1:X'].x,100);
});
test('new variable names avoid existing observed and latent names',()=>{
 const model=normalizeModel(fixtures.cfa.model);
 assert.equal(nextVariableName('observed',model),'x4');assert.equal(nextVariableName('latent',model),'F1');
});
