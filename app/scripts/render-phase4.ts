import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {Resvg} from '@resvg/resvg-js';
import {jsPDF} from 'jspdf';
import {layoutModel} from '../src/layout';
import {renderSvg} from '../src/svg';
import {diagramPdf,diagramTikz,pngResolution,portableSvg} from '../src/exports';
import {notationModel} from '../src/notation';
import {reportWord} from '../src/report-word';
import {reportLatex} from '../src/report';
import {annotatedModel,type FitResult,type AnalysisSnapshot} from '../src/analysis';
import {normalizeModel,defaultDisplay,type CompiledModel} from '../src/model';
const editing=JSON.parse(await readFile('tests/fixtures/editing.json','utf8'));
const advanced=JSON.parse(await readFile('tests/fixtures/advanced.json','utf8'));
const fits=JSON.parse(await readFile('tests/fixtures/analysis.json','utf8'));
const fixtures=JSON.parse(await readFile('../fixtures/models.json','utf8')) as {id:string;title:string}[];
const fontPaths=['public/fonts/NotoSans-Regular.ttf','public/fonts/NotoSans-Bold.ttf'];
const [regular,bold]=await Promise.all(fontPaths.map(p=>readFile(p).then(x=>x.toString('base64'))));
const metric=new jsPDF({unit:'pt'});metric.addFileToVFS('regular.ttf',regular);metric.addFont('regular.ttf','Forma Sans','normal');metric.setFont('Forma Sans');
const measure=(text:string,size:number)=>{metric.setFontSize(size);return metric.getTextWidth(text);};
const tasks=[...fixtures.map(f=>({...f,model:editing.roundtrips[f.id].model,syntax:editing.roundtrips[f.id].syntax})),
 ...fixtures.slice(0,3).map(f=>({id:f.id+'-fitted',title:f.title+' · standardised estimates',syntax:editing.roundtrips[f.id].syntax,model:annotatedModel(fits.core[f.id],{mode:'standardized',extra:'stars',rsquared:true})})),
 {id:'greek-cfa',title:'Three-factor CFA · parameter notation',syntax:fixtures[0].id,model:notationModel(normalizeModel(editing.roundtrips[fixtures[0].id].model))},
 {id:'ram-cfa',title:'Three-factor CFA ? RAM variance loops',syntax:'',model:{...advanced.single.model,displayVariances:'loops'}},
 {id:'invariance-configural',title:'Two-group CFA · configural estimates',syntax:'',model:annotatedModel(advanced.invariance,{mode:'estimates',extra:'none',rsquared:false})}];
const output='../docs/phase-4-diagrams';await mkdir(output,{recursive:true});const summary=[];
for(const f of tasks){const model=normalizeModel(f.model as CompiledModel),scene=await layoutModel(model,{},measure),display={...defaultDisplay,title:f.title};
 if(scene.diagnostics.length)throw new Error(`${f.id}: ${scene.diagnostics.join(', ')}`);
 const svg=await portableSvg(scene,display,{regular,bold}),png=new Resvg(svg,{font:{fontFiles:fontPaths,loadSystemFonts:false}}).render().asPng();
 await writeFile(`${output}/${f.id}.svg`,svg);await writeFile(`${output}/${f.id}.png`,pngResolution(png,96));
 await writeFile(`${output}/${f.id}.pdf`,new Uint8Array(await (await diagramPdf(scene,display,Math.min(40,Math.max(6.5,Math.ceil(scene.width/96*2)/2)),{regular,bold})).arrayBuffer()));
 await writeFile(`${output}/${f.id}.tex`,diagramTikz(scene,display));await writeFile(`${output}/${f.id}.lavaan`,f.syntax);await writeFile(`${output}/${f.id}.scene.json`,JSON.stringify(scene,null,2));
 summary.push({id:f.id,title:f.title,nodes:scene.nodes.length,width:scene.width,height:scene.height,diagnostics:scene.diagnostics});
}
await writeFile(`${output}/summary.json`,JSON.stringify(summary,null,2));
for(const key of ['single','invariance','bootstrap']){
 const fit=advanced[key] as FitResult,snapshot:AnalysisSnapshot={key,syntax:'',datasetName:key==='bootstrap'?'Labelled mediation':'Holzinger–Swineford',at:'2026-11-01T00:00:00Z',result:fit};
 await writeFile(`../evidence/phase-4/${key}.docx`,new Uint8Array(await (await reportWord(snapshot)).arrayBuffer()));
 await writeFile(`../evidence/phase-4/${key}-tables.tex`,reportLatex(snapshot));
 await writeFile(`../evidence/phase-4/${key}.R`,fit.script);
}
console.log(`Rendered ${tasks.length} SVG/PNG/PDF/TikZ diagrams and three Word/LaTeX reports.`);
