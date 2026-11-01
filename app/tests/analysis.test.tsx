import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderToStaticMarkup} from 'react-dom/server';
import {analysisKey,annotatedModel,parametersCsv,type FitResult,type Dataset} from '../src/analysis';
import {defaultOptions,defaultDisplay,normalizeModel,parameterText} from '../src/model';
import {defaultAnalysis} from '../src/analysis';
import {layoutModel} from '../src/layout';
import {nodeBox,overlaps,segmentHitsBox} from '../src/geometry';
import {renderSvg} from '../src/svg';
import ResultsWorkspace from '../src/ResultsWorkspace';
import DataWorkspace from '../src/DataWorkspace';
import {readProject} from '../src/project';
const evidence=JSON.parse(await readFile(new URL('./fixtures/analysis.json',import.meta.url),'utf8'));
for(const [id,raw] of Object.entries(evidence.core))test(`fitted geometry, estimates, SEs and R²: ${id}`,async()=>{
  const fit=raw as FitResult;fit.model=normalizeModel(fit.model);
  const original=JSON.stringify(fit.model);
  for(const mode of ['estimates','standardized'] as const){
    const projected=annotatedModel(fit,{mode,extra:'se',rsquared:true});
    const scene=await layoutModel(projected);
    assert.deepEqual(scene.diagnostics,[]);
    for(const edge of scene.edges)for(const node of scene.nodes){if([edge.source,edge.target].includes(node.id))continue;assert.ok(!edge.points.slice(1).some((p,i)=>segmentHitsBox(edge.points[i],p,nodeBox(node,0))),`${edge.id} crosses ${node.id}`);}
    const labels=[...scene.annotations,...scene.edges.flatMap(e=>e.labelBox?[e.labelBox]:[])];
    for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++)assert.ok(!overlaps(labels[i],labels[j]),'fitted labels overlap');
    const svg=renderSvg(scene,defaultDisplay);assert.match(svg,/R² =/);assert.match(svg,/fitted lavaan parameter table/);
    assert.equal(scene.coveredRows.length,fit.model.table.length);
  }
  assert.equal(JSON.stringify(fit.model),original,'display projection mutated the canonical fitted table');
});
test('dataset revisions, model text and estimation options invalidate a result snapshot',()=>{
 const dataset=evidence.imports.spss as Dataset;
 const key=analysisKey('Y ~ X',defaultOptions,defaultAnalysis,dataset);
 assert.notEqual(key,analysisKey('Y ~ X',defaultOptions,defaultAnalysis,{...dataset,revision:dataset.revision+1}));
 assert.notEqual(key,analysisKey('Y ~ a*X',defaultOptions,defaultAnalysis,dataset));
 assert.notEqual(key,analysisKey('Y ~ X',{...defaultOptions,fixedX:true},defaultAnalysis,dataset));
 assert.notEqual(key,analysisKey('Y ~ X',defaultOptions,{...defaultAnalysis,estimator:'MLR'},dataset));
});
test('fitted defined effects and standardized marker values retain their numerical display',()=>{
 const fit=evidence.core['03-mediation'] as FitResult;
 const projected=annotatedModel(fit,{mode:'estimates',extra:'none',rsquared:false});
 const effect=projected.table.find(r=>r.op===':='&&r.lhs==='ind')!;
 const actual=fit.parameters.find(p=>p.op===':='&&p.lhs==='ind')!;
 assert.equal(parameterText(effect),actual.est!.toFixed(3));
 const text=parametersCsv({...fit,parameters:[{...actual,label:'a "quoted" effect'}]});
 assert.ok(text.includes('"a ""quoted"" effect"'));assert.ok(text.includes(String(actual.est)));
});
test('data and results screens expose imported metadata and robust-fit labels',()=>{
 const html=renderToStaticMarkup(<DataWorkspace runtime={{} as never} dataset={evidence.imports.spss} onDataset={()=>{}} onExample={()=>{}} analysisBusy={false}/>);
 assert.match(html,/labelled\.sav/);assert.match(html,/aria-rowcount="6"/);assert.match(html,/Course satisfaction/);
 const fit=evidence.missing as FitResult;
 const result=renderToStaticMarkup(<ResultsWorkspace snapshot={{key:'k',datasetName:'Missing data',syntax:'Y ~ X',result:fit,at:'2026-11-01T18:00:00Z'}} stale={true} error="" onModel={()=>{}} onNotice={()=>{}}/>);
 assert.match(result,/out of date/);assert.match(result,/Scaled CFI/);assert.match(result,/Robust RMSEA/);assert.match(result,/400/);
 assert.match(result,/zero degrees of freedom/);
});
test('saved analysis settings remain explicit and unknown estimators are rejected',()=>{
 const project={format:'forma-sem',version:1,syntax:'Y ~ X',analysis:{estimator:'MLR',missing:'fiml',group:'school'},datasetAttached:true};
 assert.deepEqual(readProject(project).analysis,project.analysis);assert.equal(readProject(project).datasetAttached,true);
 assert.throws(()=>readProject({...project,analysis:{...project.analysis,estimator:'unknown'}}),/badProject/);
});
