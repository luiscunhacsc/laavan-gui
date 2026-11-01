import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {Resvg} from '@resvg/resvg-js';
import {layoutModel} from '../src/layout';
import {renderSvg} from '../src/svg';
import {normalizeModel,defaultDisplay,type CompiledModel} from '../src/model';
import {annotatedModel,type FitResult} from '../src/analysis';
const fixtures=JSON.parse(await readFile('tests/fixtures/compiled.json','utf8')) as {id:string;title:string;model:CompiledModel}[];
const fits=JSON.parse(await readFile('tests/fixtures/analysis.json','utf8')).core as Record<string,FitResult>;
const output='../docs/phase-2-diagrams';await mkdir(output,{recursive:true});
const tasks=[...fixtures.map(f=>({...f,fitted:false})),...fixtures.slice(0,3).map(f=>({id:`${f.id}-fitted`,title:`${f.title} · std.all, SE and R²`,model:annotatedModel({...fits[f.id],model:normalizeModel(fits[f.id].model)},{mode:'standardized',extra:'se',rsquared:true}),fitted:true}))];
const summary=[];
for(const f of tasks){
 const scene=await layoutModel(normalizeModel(f.model));
 const svg=renderSvg(scene,{...defaultDisplay,title:f.title});
 await writeFile(`${output}/${f.id}.svg`,svg);await writeFile(`${output}/${f.id}.png`,new Resvg(svg,{font:{loadSystemFonts:true}}).render().asPng());
 await writeFile(`${output}/${f.id}.scene.json`,JSON.stringify(scene,null,2));
 summary.push({id:f.id,title:f.title,fitted:f.fitted,nodes:scene.nodes.length,rows:scene.coveredRows.length,width:scene.width,height:scene.height,diagnostics:scene.diagnostics});
}
await writeFile(`${output}/summary.json`,JSON.stringify(summary,null,2));console.log('Rendered all seven fixed models and three fitted diagrams.');
