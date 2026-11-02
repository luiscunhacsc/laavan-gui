import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderToStaticMarkup} from 'react-dom/server';
import {InvarianceResults,ReliabilityResults,ModificationResults,BootstrapResults} from '../src/AdvancedResults';
import {reportTables,reportLatex,texEscape} from '../src/report';
import {diagramPdf,diagramTikz,exportDimensions,pngResolution} from '../src/exports';
import {notationModel} from '../src/notation';
import {layoutModel} from '../src/layout';
import {segmentHitsBox,nodeBox} from '../src/geometry';
import {annotatedModel,type FitResult,type AnalysisSnapshot} from '../src/analysis';
import {defaultDisplay,normalizeModel} from '../src/model';
import {readProject} from '../src/project';
const evidence=JSON.parse(await readFile(new URL('./fixtures/advanced.json',import.meta.url),'utf8'));
const fit=evidence.single as FitResult;
const snapshot:AnalysisSnapshot={key:'test',datasetName:'A & B_1',syntax:'',result:fit,at:'2026-11-01T00:00:00Z'};
test('advanced screens expose named groups, robust differences, omega, validity and bootstrap counts',()=>{
 const invariance=renderToStaticMarkup(<InvarianceResults fit={evidence.invariance}/>);
 assert.match(invariance,/Strict/);assert.match(invariance,/cfi.robust/);assert.match(invariance,/satorra.bentler.2001/);
 const reliability=renderToStaticMarkup(<ReliabilityResults fit={evidence.invariance}/>);
 assert.match(reliability,/Grant-White/);assert.match(reliability,/HTMT2/);assert.match(reliability,/Fornell/);
 const mi=renderToStaticMarkup(<ModificationResults fit={fit} disabled={true} onAdd={()=>{}}/>);
 assert.match(mi,/Standardised EPC/);assert.match(mi,/<button[^>]*disabled=""[^>]*>Add to model/);
 const bootstrap=renderToStaticMarkup(<BootstrapResults fit={evidence.bootstrap}/>);
 assert.match(bootstrap,/12345/);assert.match(bootstrap,/100/);assert.match(bootstrap,/Percentile/);
});
test('APA reports include every requested table, uncertainty, confidence level and stale-state notice',()=>{
 const tables=reportTables(snapshot);assert.equal(tables.length,6);
 assert.equal(tables[0].rows.length,fit.parameters.length);assert.equal(tables.find(t=>t.title==='Modification indices')!.rows.length,fit.modifications!.rows.length);
 assert.match(reportLatex(snapshot,true),/out of date|changed since/);assert.match(reportLatex(snapshot),/A \\& B\\_1/);
 const ninety=reportTables({...snapshot,result:{...fit,confidence:.9}});assert.ok(ninety[0].headers.includes('90% CI lower'));assert.ok(!ninety[0].headers.some(s=>s.includes('95%')));
 assert.match(texEscape('λ₁₁ & x_2'),/\\lambda_\{11\}/);assert.match(texEscape('λ₁₁ & x_2'),/\\& x\\_2/);
 assert.match(texEscape('λ₁₀,₂'),/\\lambda_\{10,2\}/);
});
test('Greek projection preserves canonical labels, fixed values and all parameters',()=>{
 const before=JSON.stringify(fit.model),projected=notationModel(normalizeModel(fit.model));
 assert.equal(projected.table.length,fit.model.table.length);assert.ok(projected.table.some(r=>String(r.displayText).includes('λ')));
 for(const row of projected.table)if(row.free===0||row.label)assert.equal(row.displayText,fit.model.table.find(r=>r.id===row.id)!.displayText);
 assert.equal(JSON.stringify(fit.model),before);
 const stars=annotatedModel(evidence.bootstrap,{mode:'estimates',extra:'stars',rsquared:false});assert.match(String(stars.table.find(r=>r.op===':=')?.displayText),/\*/);
});
test('global multigroup defined effects are not attributed to the first group',()=>{
 const report=reportTables({...snapshot,result:{...fit,groupLabels:['First','Second'],parameters:[{...fit.parameters[0],lhs:'difference',op:':=',group:0}]}});
 assert.equal(report[0].rows[0][0],'Across groups');
});
test('RAM variance loops avoid nodes, preserve canonical coverage and export their geometry',async()=>{
 const model={...normalizeModel(fit.model),displayVariances:'loops' as const};const scene=await layoutModel(model);
 assert.deepEqual(scene.diagnostics,[]);assert.equal(scene.coveredRows.length,model.table.length);
 const loops=scene.edges.filter(e=>e.source===e.target);assert.equal(loops.length,12);
 for(const edge of loops)for(const n of scene.nodes)if(n.id!==edge.source)assert.ok(!edge.points.slice(1).some((p,i)=>segmentHitsBox(edge.points[i],p,nodeBox(n))));
 assert.match(diagramTikz(scene,defaultDisplay),/\\draw\[<->/);
});
test('PNG export respects physical size, bounded memory and a valid resolution chunk',async()=>{
 const scene=await layoutModel(normalizeModel(fit.model));assert.equal(exportDimensions(scene,6.5,300).width,1950);assert.throws(()=>exportDimensions(scene,Infinity,300));assert.throws(()=>exportDimensions({...scene,height:1e8},20,600));
 const {Resvg}=await import('@resvg/resvg-js');const png=new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="white"/></svg>').render().asPng();
 const result=pngResolution(png,300),view=new DataView(result.buffer);assert.equal(String.fromCharCode(...result.subarray(37,41)),'pHYs');assert.equal(view.getUint32(41),11811);assert.equal(result[49],1);
});
test('PDF export runs independently of a browser DOM and embeds Unicode-capable fonts',async()=>{
 const scene=await layoutModel(notationModel(normalizeModel(fit.model)));
 const [regular,bold]=await Promise.all(['Regular','Bold'].map(w=>readFile(new URL(`../public/fonts/NotoSans-${w}.ttf`,import.meta.url)).then(b=>b.toString('base64'))));
 const blob=await diagramPdf(scene,{...defaultDisplay,title:'CFA · λ₁₁'},6.5,{regular,bold}),bytes=new Uint8Array(await blob.arrayBuffer());
 assert.equal(new TextDecoder().decode(bytes.subarray(0,5)),'%PDF-');assert.ok(bytes.length>10000);
});
test('projects validate and retain advanced inference and display options',()=>{
 const p={format:'forma-sem',version:2,syntax:'Y ~ X',analysis:{estimator:'ML',missing:'listwise',group:'school',bootstrap:2000,confidence:.9,seed:123,invariance:false,reliability:true,modificationIndices:true},display:{...defaultDisplay,notation:true,varianceStyle:'loops'}};
 assert.equal(readProject(p).analysis?.bootstrap,2000);assert.equal(readProject(p).display.varianceStyle,'loops');
 for(const patch of [{bootstrap:12},{seed:0},{confidence:2},{invariance:'yes'}])assert.throws(()=>readProject({...p,analysis:{...p.analysis,...patch}}));
 assert.throws(()=>readProject({...p,display:{...p.display,varianceStyle:'random'}}));
});
