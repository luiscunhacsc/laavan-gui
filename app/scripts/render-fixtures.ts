import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {Resvg} from '@resvg/resvg-js';
import {layoutModel} from '../src/layout';
import {renderSvg} from '../src/svg';
import {normalizeModel,type CompiledModel,defaultDisplay} from '../src/model';
const fixtures=JSON.parse(await readFile('tests/fixtures/compiled.json','utf8')) as {id:string;title:string;syntax:string;model:CompiledModel}[];
const output='../docs/phase-1-diagrams';await mkdir(output,{recursive:true});
const summary=[];
for(const fixture of fixtures){
  const started=performance.now();
  try{
    const scene=await layoutModel(normalizeModel(fixture.model));
    const svg=renderSvg(scene,{...defaultDisplay,title:fixture.title});
    await writeFile(`${output}/${fixture.id}.svg`,svg);
    await writeFile(`${output}/${fixture.id}.png`,new Resvg(svg,{font:{loadSystemFonts:true}}).render().asPng());
    await writeFile(`${output}/${fixture.id}.scene.json`,JSON.stringify(scene,null,2));
    const report={id:fixture.id,seconds:(performance.now()-started)/1000,nodes:scene.nodes.length,rows:scene.coveredRows.length,width:scene.width,height:scene.height,diagnostics:scene.diagnostics};
    summary.push(report);console.log(report);
  }catch(error){console.error(fixture.id,error);process.exitCode=1;}
}
await writeFile(`${output}/summary.json`,JSON.stringify(summary,null,2));
