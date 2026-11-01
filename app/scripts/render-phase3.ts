import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {Resvg} from '@resvg/resvg-js';
import {layoutModel} from '../src/layout';
import {renderSvg} from '../src/svg';
import {normalizeModel,defaultDisplay,type CompiledModel} from '../src/model';
const evidence=JSON.parse(await readFile('tests/fixtures/editing.json','utf8'));
const fixtures=JSON.parse(await readFile('../fixtures/models.json','utf8')) as {id:string;title:string}[];
const tasks=[...fixtures.map(f=>({...f,model:evidence.roundtrips[f.id].model,syntax:evidence.roundtrips[f.id].syntax,kind:'roundtrip'})),
 ...(['mediation','cfa','formative','phantom'] as const).map(key=>({id:`drawn-${key}`,title:({mediation:'GUI-created labelled mediation',cfa:'GUI-created CFA · unit factor variance',formative:'GUI-created formative composite',phantom:'New latent · no indicators yet'})[key],model:evidence[key].model,syntax:evidence[key].syntax,kind:'drawn'}))];
const output='../docs/phase-3-diagrams';await mkdir(output,{recursive:true});const summary=[];
for(const f of tasks){const model=normalizeModel(f.model as CompiledModel),scene=await layoutModel(model);const svg=renderSvg(scene,{...defaultDisplay,title:f.title});
 if(scene.diagnostics.length)throw new Error(`${f.id}: ${scene.diagnostics.join(', ')}`);
 await writeFile(`${output}/${f.id}.svg`,svg);await writeFile(`${output}/${f.id}.png`,new Resvg(svg,{font:{loadSystemFonts:true}}).render().asPng());await writeFile(`${output}/${f.id}.lavaan`,f.syntax);await writeFile(`${output}/${f.id}.scene.json`,JSON.stringify(scene,null,2));
 summary.push({id:f.id,title:f.title,kind:f.kind,nodes:scene.nodes.length,rows:scene.coveredRows.length,width:scene.width,height:scene.height,diagnostics:scene.diagnostics});}
await writeFile(`${output}/summary.json`,JSON.stringify(summary,null,2));console.log('Rendered all seven regenerated references and four models created through GUI commands.');
