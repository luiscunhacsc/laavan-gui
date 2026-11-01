import {useRef,useState,type PointerEvent as ReactPointerEvent,type WheelEvent as ReactWheelEvent} from 'react';
import type {Scene,SceneNode,Display,Positions,Position,Box} from './model';
import type {DrawTool} from './editing';
import {sceneBody} from './svg';
import en from './en.json';
interface Props {scene?:Scene;display:Display;selection:string[];setSelection:(ids:string[])=>void;onPositions:(positions:Positions)=>void;snap:boolean;viewport:Box;setViewport:(view:Box)=>void;tool:DrawTool;pending?:string;selectedParameter?:number;disabled:boolean;onPlace:(kind:'observed'|'latent',point:Position,name?:string)=>void;onEndpoint:(node:SceneNode)=>void;onParameter:(id:number)=>void;onDelete:()=>void;onEscape:()=>void}
export default function Diagram({scene,display,selection,setSelection,onPositions,snap,viewport,setViewport,tool,pending,selectedParameter,disabled,onPlace,onEndpoint,onParameter,onDelete,onEscape}:Props){
 const ref=useRef<SVGSVGElement>(null),drag=useRef<{point:Position;node?:string;original:Positions;viewport:Box;moved:boolean;matrix:DOMMatrix;latest?:Positions}|undefined>(undefined);
 const [preview,setPreview]=useState<Scene>(),[cursor,setCursor]=useState<Position>();
 const world=(x:number,y:number)=>{const matrix=ref.current?.getScreenCTM();return matrix?new DOMPoint(x,y).matrixTransform(matrix.inverse()):{x,y};};
 const down=(event:ReactPointerEvent<SVGSVGElement>)=>{
   if(event.button!==0||disabled)return;
   const element=event.target as Element,id=element.closest('[data-node]')?.getAttribute('data-node')||undefined,node=scene?.nodes.find(n=>n.id===id),parameter=element.closest('[data-parameter]')?.getAttribute('data-parameter');
   if(tool==='observed'||tool==='latent'){if(!node){event.preventDefault();onPlace(tool,world(event.clientX,event.clientY));}return;}
   if(tool!=='select'){if(node)onEndpoint(node);return;}
   if(parameter&&!node){setSelection([]);onParameter(Number(parameter));return;}
   onParameter(0);
   if(node){setSelection(event.shiftKey?selection.includes(node.id)?selection.filter(x=>x!==node.id):[...selection,node.id]:selection.includes(node.id)?selection:[node.id]);if(node.kind==='residual'&&node.variance)onParameter(node.variance.id);}else if(!event.shiftKey)setSelection([]);
   drag.current={point:world(event.clientX,event.clientY),node:id,original:Object.fromEntries((scene?.nodes||[]).map(n=>[n.id,{x:n.x,y:n.y}])),viewport:{...viewport},moved:false,matrix:event.currentTarget.getScreenCTM()!.inverse()};event.currentTarget.setPointerCapture(event.pointerId);
 };
 const move=(event:ReactPointerEvent<SVGSVGElement>)=>{
   if(tool!=='select')setCursor(world(event.clientX,event.clientY));
   const d=drag.current;if(!d||!scene)return;const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(d.matrix),dx=p.x-d.point.x,dy=p.y-d.point.y;
   if(Math.abs(dx)+Math.abs(dy)<2&&!d.moved)return;d.moved=true;
   if(!d.node){setViewport({...d.viewport,x:d.viewport.x-dx,y:d.viewport.y-dy});return;}
   const ids=selection.includes(d.node)?selection:[d.node];
   const nodes=scene.nodes.map(n=>{if(!ids.includes(n.id)&&!(n.owner&&ids.includes(n.owner)))return n;const x=d.original[n.id].x+dx,y=d.original[n.id].y+dy;return{...n,x:snap?Math.round(x/10)*10:x,y:snap?Math.round(y/10)*10:y};});
   d.latest=Object.fromEntries(nodes.map(n=>[n.id,{x:n.x,y:n.y}]));setPreview({...scene,nodes});
 };
 const up=()=>{const d=drag.current;if(d?.moved&&d.node&&d.latest)onPositions(d.latest);drag.current=undefined;setPreview(undefined);};
 const wheel=(event:ReactWheelEvent<SVGSVGElement>)=>{
   const p=world(event.clientX,event.clientY),factor=Math.exp(Math.max(-100,Math.min(100,event.deltaY))*.002),width=Math.max(100,Math.min(50000,viewport.width*factor)),scale=width/viewport.width;
   setViewport({x:p.x+(viewport.x-p.x)*scale,y:p.y+(viewport.y-p.y)*scale,width,height:viewport.height*scale});
 };
 const active=preview||scene,source=active?.nodes.find(n=>n.id===pending);
 const rubber=source&&cursor?`<path d="M ${source.x} ${source.y} L ${cursor.x} ${cursor.y}" stroke="#3c8a6d" stroke-width="2" stroke-dasharray="7 5" fill="none" pointer-events="none"/>`:'';
 return <svg ref={ref} className={`diagram-svg tool-${tool}`} viewBox={`${viewport.x} ${viewport.y} ${viewport.width} ${viewport.height}`} role="group" aria-label={en.canvas} tabIndex={0}
   onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onWheel={wheel}
   onDragOver={e=>{if(!disabled&&e.dataTransfer.types.includes('application/x-forma-variable')){e.preventDefault();e.dataTransfer.dropEffect='copy';}}}
   onDrop={e=>{if(disabled)return;const name=e.dataTransfer.getData('application/x-forma-variable');if(name){e.preventDefault();onPlace('observed',world(e.clientX,e.clientY),name);}}}
   onKeyDown={e=>{if(e.key==='Escape'){onEscape();return;}if(disabled)return;const element=e.target as Element,id=element.closest('[data-node]')?.getAttribute('data-node'),parameter=element.closest('[data-parameter]')?.getAttribute('data-parameter');
     if((e.key==='Enter'||e.key===' ')&&parameter){e.preventDefault();setSelection([]);onParameter(Number(parameter));return;}
     if((e.key==='Enter'||e.key===' ')&&id){e.preventDefault();const n=scene?.nodes.find(n=>n.id===id);if(n&&tool!=='select')onEndpoint(n);else setSelection([id]);return;}
     if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();onDelete();return;}
     const delta:Record<string,Position>={ArrowLeft:{x:-10,y:0},ArrowRight:{x:10,y:0},ArrowUp:{x:0,y:-10},ArrowDown:{x:0,y:10}},d=delta[e.key];
     if(id&&d&&scene){e.preventDefault();onPositions(Object.fromEntries(scene.nodes.map(n=>[n.id,{x:n.x+(n.id===id||n.owner===id?d.x:0),y:n.y+(n.id===id||n.owner===id?d.y:0)}])));}}}
   dangerouslySetInnerHTML={{__html:(active?sceneBody(active,display,source?[...selection,source.id]:selection,true,selectedParameter):'')+rubber}}/>;
}
