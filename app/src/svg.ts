import type {Scene,Display,SceneNode} from './model';
import {pathData} from './geometry';
import en from './en.json';
const escape=(s:unknown)=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
export function sceneBody(scene:Scene,display:Display,selected:string[]=[],interactive=false,selectedParameter?:number){
  const color=interactive?'var(--diagram-ink)':display.theme==='presentation'?'#17635d':'#222a30';
  const muted=interactive?'var(--diagram-muted)':display.theme==='presentation'?'#7b9b96':'#788187';
  const accent=interactive?'var(--focus)':'#248267';
  const visibleNode=(n:SceneNode)=>display.implicit||!n.implicit;
  const nodes=scene.nodes.filter(visibleNode),ids=new Set(nodes.map(n=>n.id));
  let body='<defs>'+[['',color],['-implicit',muted]].map(([suffix,fill])=>`<marker id="arrow${suffix}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 1 L 10 5 L 0 9 Z" fill="${fill}"/></marker><marker id="arrow-back${suffix}" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 10 1 L 0 5 L 10 9 Z" fill="${fill}"/></marker>`).join('')+'</defs>';
  body+=`<g font-family="Forma Sans, Arial, Helvetica, sans-serif" fill="${color}">`;
  if(scene.model.options.groups>1)for(const p of scene.panels)body+=`<text x="${p.x}" y="${p.y-28}" font-size="15" font-weight="600">${escape(en.group)} ${p.group}</text>`;
  for(const e of scene.edges){
    if((e.implicit&&!display.implicit)||!ids.has(e.source)||!ids.has(e.target))continue;
    const implicit=e.implicit||!!e.defaultFixed&&display.implicit;
    const path=pathData(e.points,e.kind==='covariance'&&e.points.length<20),active=interactive&&selectedParameter!==undefined&&e.rowId===selectedParameter;
    body+=`<path d="${path}" fill="none" stroke="${active?accent:implicit?muted:color}" stroke-width="${active?2.8:1.65}" ${implicit?'stroke-dasharray="5 4"':''} marker-end="url(#arrow${implicit?'-implicit':''})" ${e.kind==='covariance'?`marker-start="url(#arrow-back${implicit?'-implicit':''})"`:''}/>`;
    if(interactive&&e.rowId){const row=scene.model.table.find(r=>r.id===e.rowId);body+=`<path data-parameter="${e.rowId}" d="${path}" fill="none" stroke="transparent" stroke-width="15" style="cursor:pointer" tabindex="0" role="button" aria-label="${escape(row?`${row.lhs} ${row.op} ${row.rhs}`:'')}"/>`;}
  }
  for(const n of nodes){
    const isLatent=n.kind==='latent'||n.kind==='composite';
    const fill=interactive?(display.theme==='presentation'&&isLatent?'var(--diagram-latent)':'var(--diagram-fill)'):display.theme==='presentation'?(isLatent?'#e8f2ef':'#ffffff'):'#ffffff';
    const stroke=n.implicit?muted:color;
    body+=`<g data-node="${escape(n.id)}" ${interactive?`tabindex="0" role="button" aria-label="${escape(n.name)}" style="cursor:grab"`:''}>`;
    if(selected.includes(n.id))body+=`<rect x="${n.x-n.width/2-7}" y="${n.y-n.height/2-7}" width="${n.width+14}" height="${n.height+14}" rx="10" fill="${accent}" fill-opacity=".09" stroke="${accent}" stroke-dasharray="3 3"/>`;
    if(n.kind==='observed')body+=`<rect x="${n.x-n.width/2}" y="${n.y-n.height/2}" width="${n.width}" height="${n.height}" fill="${fill}" stroke="${stroke}" stroke-width="1.65"/>`;
    else body+=`<ellipse cx="${n.x}" cy="${n.y}" rx="${n.width/2}" ry="${n.height/2}" fill="${fill}" stroke="${stroke}" stroke-width="1.65" ${n.implicit?'stroke-dasharray="4 3"':''}/>`;
    body+=`<text x="${n.x}" y="${n.y}" text-anchor="middle" dominant-baseline="central" font-size="${n.kind==='residual'?12:16}">${escape(n.name)}</text></g>`;
  }
  const text=(box:{x:number;y:number;width:number;height:number},value:string,size:number,implicit:boolean,rowId?:number)=>`<text ${interactive&&rowId?`data-parameter="${rowId}" tabindex="0" role="button" style="cursor:pointer"`:''} x="${box.x+box.width/2}" y="${box.y+box.height/2}" text-anchor="middle" dominant-baseline="central" font-size="${size}" fill="${implicit?muted:color}">${escape(value)}</text>`;
  for(const e of scene.edges)if(e.labelBox&&!(e.implicit&&!display.implicit)){
    const row=scene.model.table.find(r=>r.id===e.rowId),explicitLabel=row?.label||'';
    const value=e.defaultFixed&&!display.implicit&&typeof row?.displayText!=='string'?explicitLabel:e.label;
    if(value)body+=text(e.labelBox,value,13,e.implicit||!!e.defaultFixed&&display.implicit,e.rowId);
  }
  for(const a of scene.annotations)if(display.implicit||!a.implicit)body+=text(a,a.text, a.rowId&&scene.model.table.find(r=>r.id===a.rowId)?.op===':='?14:12,a.implicit,a.rowId);
  return body+'</g>';
}
export function renderSvg(scene:Scene,display:Display){
  const title=display.title||en.defaultTitle,header=46;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(scene.width)}" height="${Math.ceil(scene.height+header)}" viewBox="${scene.minX} ${scene.minY-header} ${scene.width} ${scene.height+header}" role="img" aria-labelledby="title desc"><title id="title">${escape(title)}</title><desc id="desc">${escape(scene.model.analysisDisplay?en.fittedExportDescription:en.exportDescription)}</desc><rect x="${scene.minX}" y="${scene.minY-header}" width="${scene.width}" height="${scene.height+header}" fill="white"/><text x="${scene.minX+30}" y="${scene.minY-8}" font-family="Forma Sans,Arial,Helvetica,sans-serif" font-size="20" font-weight="600" fill="#222a30">${escape(title)}</text>${sceneBody(scene,display)}<metadata>${escape(JSON.stringify({application:'Forma',schema:1,lavaan:scene.model.versions.lavaan,options:scene.model.options,analysis:scene.model.analysisDisplay}))}</metadata></svg>`;
}
