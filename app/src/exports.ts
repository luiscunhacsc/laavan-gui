import type {Scene,Display,Position} from './model';
import {renderSvg} from './svg';
import {distance} from './geometry';
import {texEscape} from './report';
import en from './en.json';
export const exportDimensions=(scene:Scene,inches:number,dpi:number)=>{
 if(!Number.isFinite(inches)||inches<2||inches>20||![150,300,600].includes(dpi))throw new Error(en.advanced.exportFailed);
 const width=Math.round(inches*dpi),height=Math.round(width*(scene.height+46)/scene.width);
 if(width>16384||height>16384||width*height>64000000)throw new Error(en.advanced.exportFailed);
 return {width,height};
};
let fonts:Promise<{regular:string;bold:string}>|undefined;
const base64=(bytes:Uint8Array)=>{let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);};
export function exportFonts(){return fonts??=Promise.all(['Regular','Bold'].map(async weight=>{
 const response=await fetch(`${import.meta.env.BASE_URL}fonts/NotoSans-${weight}.ttf`);if(!response.ok)throw new Error(en.advanced.exportFailed);
 return base64(new Uint8Array(await response.arrayBuffer()));
})).then(([regular,bold])=>({regular,bold})).catch(e=>{fonts=undefined;throw e;});}
export async function portableSvg(scene:Scene,display:Display){
 const f=await exportFonts();
 const css=`<style>@font-face{font-family:'Forma Sans';src:url(data:font/ttf;base64,${f.regular}) format('truetype');font-weight:400}@font-face{font-family:'Forma Sans';src:url(data:font/ttf;base64,${f.bold}) format('truetype');font-weight:600}</style>`;
 return renderSvg(scene,display).replace('<defs>','<defs>'+css);
}
// Insert a physical-resolution chunk; canvas PNGs otherwise advertise 96 DPI.
export function pngResolution(bytes:Uint8Array,dpi:number){
 const ppm=Math.round(dpi/0.0254),chunk=new Uint8Array(21),v=new DataView(chunk.buffer);v.setUint32(0,9);chunk.set([112,72,89,115],4);v.setUint32(8,ppm);v.setUint32(12,ppm);chunk[16]=1;
 let crc=0xffffffff;for(const byte of chunk.subarray(4,17)){crc^=byte;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}v.setUint32(17,(crc^0xffffffff)>>>0);
 const chunks:Uint8Array[]=[bytes.subarray(0,33),chunk];let at=33;
 while(at+12<=bytes.length){const length=new DataView(bytes.buffer,bytes.byteOffset+at,4).getUint32(0),end=at+12+length;if(end>bytes.length)throw new Error(en.advanced.exportFailed);if(String.fromCharCode(...bytes.subarray(at+4,at+8))!=='pHYs')chunks.push(bytes.subarray(at,end));at=end;}
 const output=new Uint8Array(chunks.reduce((s,c)=>s+c.length,0));let offset=0;for(const c of chunks){output.set(c,offset);offset+=c.length;}return output;
}
export async function diagramPng(scene:Scene,display:Display,inches:number,dpi:number):Promise<Blob>{
 const {width,height}=exportDimensions(scene,inches,dpi),svg=await portableSvg(scene,display),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
 try {const img=new Image();await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=reject;img.src=url;});
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');if(!ctx)throw new Error(en.advanced.exportFailed);ctx.fillStyle='white';ctx.fillRect(0,0,width,height);ctx.drawImage(img,0,0,width,height);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error(en.advanced.exportFailed)),'image/png'));
  return new Blob([pngResolution(new Uint8Array(await blob.arrayBuffer()),dpi)],{type:'image/png'});
 } finally {URL.revokeObjectURL(url);}
}
export async function diagramPdf(scene:Scene,display:Display,inches:number,fontData?:{regular:string;bold:string}):Promise<Blob>{
 if(!Number.isFinite(inches)||inches<2||inches>20)throw new Error(en.advanced.exportFailed);
 const [{jsPDF},f]=await Promise.all([import('jspdf'),fontData?Promise.resolve(fontData):exportFonts()]);
 const width=inches*72,height=width*(scene.height+46)/scene.width;
 if(height>14000)throw new Error(en.advanced.exportFailed);
 const pdf=new jsPDF({orientation:width>height?'landscape':'portrait',unit:'pt',format:[width,height],compress:true});
 for(const [name,data,style] of [['regular.ttf',f.regular,'normal'],['bold.ttf',f.bold,'bold']] as const){pdf.addFileToVFS(name,data);pdf.addFont(name,'Forma Sans',style);}
 pdf.setFont('Forma Sans');
 const scale=width/scene.width,x=(v:number)=>(v-scene.minX)*scale,y=(v:number)=>(v-scene.minY+46)*scale;
 const ink=display.theme==='presentation'?'#17635d':'#222a30',muted=display.theme==='presentation'?'#7b9b96':'#788187';
 const text=(px:number,py:number,value:string,size:number,color=ink,bold=false)=>{pdf.setFont('Forma Sans',bold?'bold':'normal');pdf.setFontSize(size*scale);pdf.setTextColor(color);pdf.text(value,x(px),y(py),{align:'center',baseline:'middle'});};
 pdf.setFillColor('#ffffff');pdf.rect(0,0,width,height,'F');
 pdf.setFont('Forma Sans','bold');pdf.setTextColor(ink);pdf.setFontSize(20*scale);pdf.text(display.title||en.defaultTitle,x(scene.minX+30),y(scene.minY-8));
 const nodes=scene.nodes.filter(n=>display.implicit||!n.implicit),ids=new Set(nodes.map(n=>n.id));
 for(const p of scene.panels)if(scene.model.options.groups>1)text(p.x+25,p.y-28,`${en.group} ${p.group}`,15);
 for(const e of scene.edges){
  if(e.implicit&&!display.implicit||!ids.has(e.source)||!ids.has(e.target)||e.points.length<2)continue;
  const implicit=e.implicit||!!e.defaultFixed&&display.implicit,color=implicit?muted:ink;
  pdf.setDrawColor(color);pdf.setFillColor(color);pdf.setLineWidth(1.65*scale);pdf.setLineDashPattern(implicit?[5*scale,4*scale]:[],0);
  const ops:{op:string;c:number[]}[]=[{op:'m',c:[x(e.points[0].x),y(e.points[0].y)]}];
  const points=e.points;
  if(e.kind==='covariance'&&points.length>=3&&points.length<20){
   for(let i=1;i<points.length-1;i++){const a=points[i-1],b=points[i],c=points[i+1],r=Math.min(14,distance(a,b)/3,distance(b,c)/3),p={x:b.x+(a.x-b.x)*r/distance(a,b),y:b.y+(a.y-b.y)*r/distance(a,b)},q={x:b.x+(c.x-b.x)*r/distance(b,c),y:b.y+(c.y-b.y)*r/distance(b,c)};
    ops.push({op:'l',c:[x(p.x),y(p.y)]},{op:'c',c:[x(p.x+(b.x-p.x)*2/3),y(p.y+(b.y-p.y)*2/3),x(q.x+(b.x-q.x)*2/3),y(q.y+(b.y-q.y)*2/3),x(q.x),y(q.y)]});}
   const end=points.at(-1)!;ops.push({op:'l',c:[x(end.x),y(end.y)]});
  }else for(const p of points.slice(1))ops.push({op:'l',c:[x(p.x),y(p.y)]});
  pdf.path(ops).stroke();pdf.setLineDashPattern([],0);
  const arrow=(tip:Position,other:Position)=>{const length=distance(tip,other)||1,dx=(tip.x-other.x)/length,dy=(tip.y-other.y)/length,k=1.155;
   pdf.triangle(x(tip.x+dx*k),y(tip.y+dy*k),x(tip.x-9*dx*k+4*dy*k),y(tip.y-9*dy*k-4*dx*k),x(tip.x-9*dx*k-4*dy*k),y(tip.y-9*dy*k+4*dx*k),'F');};
  arrow(points.at(-1)!,points.at(-2)!);if(e.kind==='covariance')arrow(points[0],points[1]);
 }
 for(const n of nodes){pdf.setDrawColor(n.implicit?muted:ink);pdf.setFillColor(display.theme==='presentation'&&(n.kind==='latent'||n.kind==='composite')?'#e8f2ef':'#ffffff');pdf.setLineWidth(1.65*scale);pdf.setLineDashPattern(n.implicit?[4*scale,3*scale]:[],0);
  if(n.kind==='observed')pdf.rect(x(n.x-n.width/2),y(n.y-n.height/2),n.width*scale,n.height*scale,'FD');else pdf.ellipse(x(n.x),y(n.y),n.width/2*scale,n.height/2*scale,'FD');
  text(n.x,n.y,n.name,n.kind==='residual'?12:16,n.implicit?muted:ink);
 }
 pdf.setLineDashPattern([],0);
 for(const e of scene.edges)if(e.labelBox&&!(e.implicit&&!display.implicit)){const row=scene.model.table.find(r=>r.id===e.rowId),value=e.defaultFixed&&!display.implicit&&typeof row?.displayText!=='string'?row?.label||'':e.label;if(value)text(e.labelBox.x+e.labelBox.width/2,e.labelBox.y+e.labelBox.height/2,value,13,e.implicit||e.defaultFixed&&display.implicit?muted:ink);}
 for(const a of scene.annotations)if(display.implicit||!a.implicit)text(a.x+a.width/2,a.y+a.height/2,a.text,a.rowId&&scene.model.table.find(r=>r.id===a.rowId)?.op===':='?14:12,a.implicit?muted:ink);
 pdf.setProperties({title:display.title||en.defaultTitle,creator:'Forma',subject:en.exportDescription});
 return pdf.output('blob');
}
const xy=(p:Position)=>`(${p.x.toFixed(3)},${p.y.toFixed(3)})`;
function tikzPath(points:Position[],rounded:boolean){
 if(!points.length)return '';
 if(!rounded||points.length<3)return points.map(xy).join(' -- ');
 let path=xy(points[0]);for(let i=1;i<points.length-1;i++){
  const a=points[i-1],b=points[i],c=points[i+1],r=Math.min(14,distance(a,b)/3,distance(b,c)/3),p={x:b.x+(a.x-b.x)*r/distance(a,b),y:b.y+(a.y-b.y)*r/distance(a,b)},q={x:b.x+(c.x-b.x)*r/distance(b,c),y:b.y+(c.y-b.y)*r/distance(b,c)};
  const cp={x:p.x+(b.x-p.x)*2/3,y:p.y+(b.y-p.y)*2/3},cq={x:q.x+(b.x-q.x)*2/3,y:q.y+(b.y-q.y)*2/3};path+=` -- ${xy(p)} .. controls ${xy(cp)} and ${xy(cq)} .. ${xy(q)}`;
 }return path+' -- '+xy(points.at(-1)!);
}
export function diagramTikz(scene:Scene,display:Display){
 const normal=display.theme==='presentation'?'17635D':'222A30',muted=display.theme==='presentation'?'7B9B96':'788187',nodes=scene.nodes.filter(n=>display.implicit||!n.implicit),ids=new Set(nodes.map(n=>n.id));
 const text=(x:number,y:number,value:string,size:number,color='ink')=>`\\node[text=${color},font=\\sffamily\\fontsize{${size*.75}}{${size*.95}}\\selectfont,inner sep=0pt] at ${xy({x,y})} {${texEscape(value)}};`;
 const lines=[`% Generated from the same scene as Forma's SVG. Compile with LuaLaTeX or XeLaTeX.`, '\\documentclass[border=4pt]{standalone}','\\usepackage{fontspec,tikz}','\\usetikzlibrary{arrows.meta}','\\setsansfont{TeX Gyre Heros}',`\\definecolor{ink}{HTML}{${normal}}`,`\\definecolor{muted}{HTML}{${muted}}`,'\\definecolor{latentfill}{HTML}{E8F2EF}','\\begin{document}','\\begin{tikzpicture}[x=0.75pt,y=-0.75pt,line width=1.2375pt,>={Latex[length=5.25pt,width=4pt]}]',
  `\\path[use as bounding box] ${xy({x:scene.minX,y:scene.minY-46})} rectangle ${xy({x:scene.minX+scene.width,y:scene.minY+scene.height})};`,text(scene.minX+scene.width/2,scene.minY-15,display.title||en.defaultTitle,20)];
 for(const p of scene.panels)if(scene.model.options.groups>1)lines.push(text(p.x+25,p.y-28,`${en.group} ${p.group}`,15));
 for(const e of scene.edges){if(e.implicit&&!display.implicit||!ids.has(e.source)||!ids.has(e.target))continue;const implicit=e.implicit||!!e.defaultFixed&&display.implicit;
  lines.push(`\\draw[${e.kind==='covariance'?'<->':'->'},${implicit?'muted,dash pattern=on 3.75pt off 3pt':'ink'}] ${tikzPath(e.points,e.kind==='covariance'&&e.points.length<20)};`);
 }
 for(const n of nodes){const fill=display.theme==='presentation'&&(n.kind==='latent'||n.kind==='composite')?'latentfill':'white',stroke=n.implicit?'muted,dashed':'ink';
  lines.push(n.kind==='observed'?`\\draw[${stroke},fill=${fill}] ${xy({x:n.x-n.width/2,y:n.y-n.height/2})} rectangle ${xy({x:n.x+n.width/2,y:n.y+n.height/2})};`:`\\draw[${stroke},fill=${fill}] ${xy(n)} ellipse [x radius=${n.width/2},y radius=${n.height/2}];`);lines.push(text(n.x,n.y,n.name,n.kind==='residual'?12:16,n.implicit?'muted':'ink'));
 }
 for(const e of scene.edges)if(e.labelBox&&!(e.implicit&&!display.implicit)){const row=scene.model.table.find(r=>r.id===e.rowId),value=e.defaultFixed&&!display.implicit&&typeof row?.displayText!=='string'?row?.label||'':e.label;if(value)lines.push(text(e.labelBox.x+e.labelBox.width/2,e.labelBox.y+e.labelBox.height/2,value,13,e.implicit||e.defaultFixed&&display.implicit?'muted':'ink'));}
 for(const a of scene.annotations)if(display.implicit||!a.implicit)lines.push(text(a.x+a.width/2,a.y+a.height/2,a.text,a.rowId&&scene.model.table.find(r=>r.id===a.rowId)?.op===':='?14:12,a.implicit?'muted':'ink'));
 return lines.concat('\\end{tikzpicture}','\\end{document}','').join('\n');
}
