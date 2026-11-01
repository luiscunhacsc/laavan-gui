import {useRef,useEffect,useState} from 'react';
import type {Scene,Display} from './model';
import {downloadBlob,downloadFile} from './project';
import en from './en.json';
export default function ExportDialog({scene,display,onClose}:{scene:Scene;display:Display;onClose:()=>void}){
 const [format,setFormat]=useState<'svg'|'png'|'pdf'|'tikz'>('svg'),[width,setWidth]=useState(6.5),[dpi,setDpi]=useState(300),[busy,setBusy]=useState(false),[error,setError]=useState('');const ref=useRef<HTMLDialogElement>(null),t=en.advanced;
 useEffect(()=>{ref.current?.showModal();},[]);
 const run=async()=>{setBusy(true);setError('');try{const x=await import('./exports'),name=display.title||'model';
  if(format==='svg')downloadFile(await x.portableSvg(scene,display),`${name}.svg`,'image/svg+xml');
  else if(format==='tikz')downloadFile(x.diagramTikz(scene,display),`${name}.tex`,'text/plain;charset=utf-8');
  else downloadBlob(format==='png'?await x.diagramPng(scene,display,width,dpi):await x.diagramPdf(scene,display,width),`${name}.${format}`);
 }catch{setError(t.exportFailed);}finally{setBusy(false);}};
 return <dialog ref={ref} className="export-dialog" onCancel={e=>{if(busy)e.preventDefault();else onClose();}}><header><h2>{t.exportDiagram}</h2><button aria-label={t.close} disabled={busy} onClick={onClose}>×</button></header><p>{t.exportHint}</p><label>{t.format}<select disabled={busy} value={format} onChange={e=>setFormat(e.target.value as typeof format)}>{(['svg','png','pdf','tikz'] as const).map(f=><option key={f} value={f}>{t[f]}</option>)}</select></label>{['png','pdf'].includes(format)&&<label>{t.width}<input disabled={busy} type="number" min="2" max="20" step=".5" value={width} onChange={e=>setWidth(Number(e.target.value))}/></label>}{format==='png'&&<label>{t.dpi}<select disabled={busy} value={dpi} onChange={e=>setDpi(Number(e.target.value))}>{[150,300,600].map(n=><option key={n}>{n}</option>)}</select></label>}{error&&<p role="alert">{error}</p>}<footer><button className="button" disabled={busy} onClick={onClose}>{t.close}</button><button className="button primary" disabled={busy} onClick={()=>void run()}>{busy?t.exporting:t.download}</button></footer></dialog>;
}
