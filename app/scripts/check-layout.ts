import {readFile,writeFile} from 'node:fs/promises';
import {layoutModel} from '../src/layout';
import {normalizeModel} from '../src/model';
import {polyLength,segmentsCross} from '../src/geometry';
const fixtures=JSON.parse(await readFile('tests/fixtures/compiled.json','utf8'));
const result=[];
for(const f of fixtures){
 const start=performance.now(),scene=await layoutModel(normalizeModel(f.model));
 let crossings=0,covarianceCrossings=0;
 for(let i=0;i<scene.edges.length;i++)for(let j=i+1;j<scene.edges.length;j++){
  const a=scene.edges[i],b=scene.edges[j];
  if(a.points.slice(1).some((p,k)=>b.points.slice(1).some((q,l)=>segmentsCross(a.points[k],p,b.points[l],q)))){crossings++;if(a.kind==='covariance'||b.kind==='covariance')covarianceCrossings++;}
 }
 result.push({id:f.id,crossings,covarianceCrossings,covarianceLength:Math.round(scene.edges.filter(e=>e.kind==='covariance').reduce((n,e)=>n+polyLength(e.points),0)),width:Math.round(scene.width),height:Math.round(scene.height),milliseconds:Math.round(performance.now()-start)});
}
await writeFile(process.argv[2]||'../evidence/release/layout.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
