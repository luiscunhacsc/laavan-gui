import {useEffect,useMemo,useRef,useState} from 'react';
import type {LavaanRuntime} from './runtime';
import {messageText,numberText,type Dataset,type DataPage,type Variable,type VariableType} from './analysis';
import en from './en.json';
const t=en.data;
const ROW=32,COLUMN=156,HEADER=38,INDEX=52;
function Grid({dataset,runtime,selected,onSelect,blocked}:{dataset:Dataset;runtime:LavaanRuntime;selected:string;onSelect:(name:string)=>void;blocked:boolean}){
  const [search,setSearch]=useState(''),[labels,setLabels]=useState(false),[jump,setJump]=useState('1');
  const [scroll,setScroll]=useState({top:0,left:0,width:900,height:500}),[page,setPage]=useState<DataPage>(),[error,setError]=useState('');
  const viewport=useRef<HTMLDivElement>(null);
  const columns=useMemo(()=>dataset.columns.filter(c=>`${c.name} ${c.label}`.toLowerCase().includes(search.toLowerCase())),[dataset,search]);
  const firstColumn=Math.max(0,Math.floor(scroll.left/COLUMN)-1),lastColumn=Math.min(columns.length,firstColumn+Math.ceil(scroll.width/COLUMN)+3);
  const visible=columns.slice(firstColumn,lastColumn),start=Math.max(0,Math.floor(scroll.top/ROW)-4),count=Math.min(150,Math.ceil(scroll.height/ROW)+10);
  const columnNames=visible.map(c=>c.name).join('\u0000');
  useEffect(()=>{const el=viewport.current;if(!el)return;const resize=new ResizeObserver(()=>setScroll(s=>({...s,width:el.clientWidth,height:el.clientHeight})));resize.observe(el);return()=>resize.disconnect();},[]);
  useEffect(()=>{
    if(blocked)return;let active=true;
    const timer=setTimeout(()=>{void runtime.request<DataPage>({action:'page',id:dataset.id,revision:dataset.revision,start,count,columns:visible.map(c=>c.name)}).then(p=>{if(active){setPage(p);setError('');}}).catch(e=>{if(active)setError(messageText(e.message));});},45);
    return()=>{active=false;clearTimeout(timer);};
  },[dataset.id,dataset.revision,start,count,columnNames,blocked,runtime]);
  useEffect(()=>{if(viewport.current)viewport.current.scrollLeft=0;},[search]);
  const selectedColumn=dataset.columns.find(c=>c.name===selected);
  return <div className="data-grid-section">
    <div className="grid-tools"><input aria-label={t.findVariable} placeholder={t.findVariable} value={search} onChange={e=>setSearch(e.target.value)}/><label><input type="checkbox" checked={labels} onChange={e=>setLabels(e.target.checked)}/>{t.valueLabels}</label><form onSubmit={e=>{e.preventDefault();if(viewport.current)viewport.current.scrollTop=(Math.max(1,Math.min(dataset.rows,Number(jump)||1))-1)*ROW;}}><label>{t.goToCase}<input type="number" min="1" max={dataset.rows||1} value={jump} onChange={e=>setJump(e.target.value)}/></label><button>{t.go}</button></form></div>
    {error&&<div className="analysis-alert" role="alert">{error}</div>}
    <div className="data-grid" ref={viewport} role="grid" aria-label={t.viewer} aria-rowcount={dataset.rows+1} aria-colcount={columns.length+1} tabIndex={0}
      onScroll={e=>{const top=e.currentTarget.scrollTop,left=e.currentTarget.scrollLeft;setScroll(s=>({...s,top,left}));}}
      onKeyDown={e=>{const el=viewport.current;if(!el||e.target!==el)return;const moves:Record<string,[number,number]>={ArrowDown:[0,ROW],ArrowUp:[0,-ROW],ArrowLeft:[-COLUMN,0],ArrowRight:[COLUMN,0],PageDown:[0,el.clientHeight-HEADER],PageUp:[0,-el.clientHeight+HEADER]};if(moves[e.key]){e.preventDefault();el.scrollBy(...moves[e.key]);}else if(e.key==='Home'||e.key==='End'){e.preventDefault();el.scrollTop=e.key==='Home'?0:dataset.rows*ROW;}}}>
      <div className="grid-spacer" style={{height:HEADER+dataset.rows*ROW,width:Math.max(scroll.width,INDEX+columns.length*COLUMN)}}>
        <div className="grid-header" role="row" style={{height:HEADER}}><div className="grid-corner" role="columnheader">#</div>{visible.map((col,i)=><button key={col.name} role="columnheader" aria-colindex={firstColumn+i+2} className={selected===col.name?'selected':''} style={{left:INDEX+(firstColumn+i)*COLUMN,width:COLUMN}} onClick={()=>onSelect(col.name)} title={col.label||col.name}><b>{col.name}</b><span>{col.label||t.types[col.type]}</span></button>)}</div>
        {page?.rows.map((cells,i)=>{const row=page.start+i;if(row<start||row>=start+count)return null;return <div className="grid-row" role="row" aria-rowindex={row+2} key={`${dataset.id}:${row}`} style={{top:HEADER+row*ROW,height:ROW}}><div className="grid-index" role="rowheader">{row+1}</div>{cells.map((cell,j)=>{const name=page.columns[j],index=columns.findIndex(c=>c.name===name);if(index<firstColumn||index>=lastColumn)return null;const raw=cell.value==null?'—':String(cell.value);return <div role="gridcell" aria-colindex={index+2} key={name} className={`grid-cell ${cell.missing?'missing':''} ${name===selected?'selected':''}`} style={{left:INDEX+index*COLUMN,width:COLUMN}} title={`${raw}${cell.label?` · ${cell.label}`:''}${cell.missing?` · ${t.missing}`:''}`} onClick={()=>onSelect(name)}>{labels&&cell.label?cell.label:raw}{cell.missing&&cell.value!==null&&<span className="missing-dot">*</span>}</div>;})}</div>;})}
      </div>
    </div>
    <div className="grid-status"><span>{dataset.rows.toLocaleString()} {t.cases} · {dataset.columns.length} {t.variables}</span><span>{selectedColumn?.name}{selectedColumn?` · ${selectedColumn.missing} ${t.missing.toLowerCase()}`:''}</span><span>{t.readOnly}</span></div>
  </div>;
}
function VariableDetails({column,disabled,onType}:{column?:Variable;disabled:boolean;onType:(type:VariableType)=>void}){
  if(!column)return <aside className="variable-details"><p>{t.selectVariable}</p></aside>;
  return <aside className="variable-details"><span className="data-eyebrow">{t.variableDetails}</span><h2>{column.name}</h2>{column.label&&<p>{column.label}</p>}<label>{t.measurement}<select value={column.type} disabled={disabled} onChange={e=>onType(e.target.value as VariableType)}>{(['continuous','ordered','nominal'] as const).map(type=><option key={type} value={type}>{t.types[type]}</option>)}</select></label><dl><dt>{t.storage}</dt><dd>{t.storageTypes[column.storage]}</dd><dt>{t.valid}</dt><dd>{column.valid.toLocaleString()}</dd><dt>{t.missing}</dt><dd>{column.missing.toLocaleString()}</dd><dt>{t.userMissing}</dt><dd>{column.userMissing}</dd><dt>{t.distinct}</dt><dd>{column.distinct}</dd>{column.storage==='numeric'&&<><dt>{t.minimum}</dt><dd>{numberText(column.min)}</dd><dt>{t.maximum}</dt><dd>{numberText(column.max)}</dd><dt>{t.mean}</dt><dd>{numberText(column.mean)}</dd></>}</dl>{column.categories.length>0&&<><h3>{t.valueLabels}</h3><div className="category-list">{column.categories.map((c,i)=><div key={i}><b>{String(c.value)}</b><span>{c.label}</span></div>)}</div></>}{column.type==='ordered'&&<><h3>{t.levelOrder}</h3><p>{column.levels.join(' → ')}</p><small>{t.orderedHint}</small></>}<small>{t.typeHint}</small></aside>;
}
export default function DataWorkspace({runtime,dataset,onDataset,onExample,analysisBusy}:{runtime:LavaanRuntime;dataset?:Dataset;onDataset:(data:Dataset)=>void;onExample:(example:string)=>void;analysisBusy:boolean}){
  const [showImport,setShowImport]=useState(!dataset),[mode,setMode]=useState<'file'|'covariance'>('file'),[file,setFile]=useState<File>(),[bytes,setBytes]=useState<Uint8Array>(),[sheets,setSheets]=useState<string[]>([]),[sheet,setSheet]=useState('');
  const [delimiter,setDelimiter]=useState(','),[na,setNa]=useState('NA'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[warnings,setWarnings]=useState<string[]>([]),[selected,setSelected]=useState('');
  const [matrix,setMatrix]=useState('X,M,Y\n1,0.6,0.47\n0.6,1,0.57\n0.47,0.57,1'),[sampleSize,setSampleSize]=useState('400'),[means,setMeans]=useState('');
  const upload=useRef<HTMLInputElement>(null),fileSerial=useRef(0);
  const locked=busy||analysisBusy;
  useEffect(()=>{if(dataset&&!dataset.columns.some(c=>c.name===selected))setSelected(dataset.columns[0]?.name||'');},[dataset]);
  const extension=(name:string)=>name.split('.').at(-1)?.toLowerCase()||'';
  const commit=(r:{dataset:Dataset;warnings:string[]})=>{onDataset(r.dataset);setWarnings(r.warnings);setShowImport(false);setError('');};
  const selectFile=async(f:File)=>{
    const serial=++fileSerial.current;setFile(undefined);setBytes(undefined);setSheets([]);setError('');setBusy(true);
    try{if(f.size>50*1024*1024)throw new Error('data.fileSize');const format=extension(f.name);if(!['csv','tsv','xlsx','xls','sav','zsav'].includes(format))throw new Error('data.format');
      const binary=new Uint8Array(await f.arrayBuffer());if(serial!==fileSerial.current)return;
      if(['xlsx','xls'].includes(format)){const r=await runtime.request<{sheets:string[]}>({action:'sheets',format},binary);if(serial!==fileSerial.current)return;setSheets(r.sheets);setSheet(r.sheets[0]||'');}
      setFile(f);setBytes(binary);if(format==='tsv')setDelimiter('\t');
    }catch(e){if(serial===fileSerial.current)setError(messageText((e as Error).message));}finally{if(serial===fileSerial.current)setBusy(false);}
  };
  const importFile=async()=>{if(!file||!bytes)return;setBusy(true);setError('');try{const format=extension(file.name);commit(await runtime.request({action:'import',id:crypto.randomUUID(),name:file.name,format:format==='tsv'?'csv':format,delimiter,na:['',...na.split(',').map(s=>s.trim()).filter(Boolean)],sheet},bytes));setBytes(undefined);setFile(undefined);}catch(e){setError(messageText((e as Error).message));}finally{setBusy(false);}};
  const loadExample=async(example:string)=>{setBusy(true);setError('');try{commit(await runtime.request({action:'example',id:crypto.randomUUID(),name:t.exampleNames[example as keyof typeof t.exampleNames],example}));onExample(example);}catch(e){setError(messageText((e as Error).message));}finally{setBusy(false);}};
  const importMatrix=async()=>{setBusy(true);setError('');try{commit(await runtime.request({action:'covariance',id:crypto.randomUUID(),name:t.covariance,text:matrix,n:Number(sampleSize),means}));}catch(e){setError(messageText((e as Error).message));}finally{setBusy(false);}};
  const changeType=async(type:VariableType)=>{if(!dataset)return;setBusy(true);setError('');try{commit(await runtime.request({action:'type',id:dataset.id,revision:dataset.revision,name:selected,type}));}catch(e){setError(messageText((e as Error).message));}finally{setBusy(false);}};
  return <main className="data-workspace"><header className="workspace-heading"><div><span className="data-eyebrow">{t.workspace}</span><h1>{dataset?.name||t.title}</h1><p>{dataset?t.loadedHint:t.subtitle}</p></div><button className="button" disabled={locked} onClick={()=>setShowImport(s=>!s)}>{showImport?t.closeImport:t.importData}</button></header>
    {error&&<div className="analysis-alert" role="alert">{error}</div>}
    {warnings.length>0&&<details className="import-warnings"><summary>{t.importWarnings} ({warnings.length})</summary>{warnings.map((w,i)=><p key={i}>{w}</p>)}</details>}
    {showImport&&<section className="import-panel"><div className="import-main"><div className="segmented"><button className={mode==='file'?'chosen':''} onClick={()=>setMode('file')}>{t.fromFile}</button><button className={mode==='covariance'?'chosen':''} onClick={()=>setMode('covariance')}>{t.covariance}</button></div>
      {mode==='file'?<><div className="file-drop"><span className="file-mark">↥</span><strong>{file?.name||t.chooseFile}</strong><p>{t.formats}</p><button className="button" disabled={locked} onClick={()=>upload.current?.click()}>{file?t.changeFile:t.browse}</button><input ref={upload} type="file" hidden accept=".csv,.tsv,.xlsx,.xls,.sav,.zsav" onChange={e=>{const f=e.target.files?.[0];if(f)void selectFile(f);e.target.value='';}}/></div><div className="import-options">{sheets.length>0?<label>{t.sheet}<select value={sheet} disabled={locked} onChange={e=>setSheet(e.target.value)}>{sheets.map(s=><option key={s}>{s}</option>)}</select></label>:<label>{t.delimiter}<select value={delimiter} disabled={locked} onChange={e=>setDelimiter(e.target.value)}><option value=",">{t.comma}</option><option value=";">{t.semicolon}</option><option value={'\t'}>{t.tab}</option></select></label>}<label>{t.missingCodes}<input value={na} disabled={locked} onChange={e=>setNa(e.target.value)}/><small>{t.missingHint}</small></label><button className="button primary" disabled={locked||!file} onClick={()=>void importFile()}>{busy?t.importing:t.importData}</button></div></>:<div className="matrix-input"><p>{t.matrixHint}</p><textarea aria-label={t.covariance} value={matrix} disabled={locked} onChange={e=>setMatrix(e.target.value)}/><div className="import-options"><label>{t.sampleSize}<input type="number" min="2" value={sampleSize} disabled={locked} onChange={e=>setSampleSize(e.target.value)}/></label><label>{t.optionalMeans}<input value={means} disabled={locked} onChange={e=>setMeans(e.target.value)}/></label><button className="button primary" disabled={locked} onClick={()=>void importMatrix()}>{t.useMatrix}</button></div></div>}
    </div><aside className="data-examples"><span className="data-eyebrow">{t.examples}</span><h2>{t.tryExample}</h2><p>{t.exampleHint}</p>{(['holzinger','democracy','mediation'] as const).map(e=><button disabled={locked} key={e} onClick={()=>void loadExample(e)}><span>{t.exampleNames[e]}</span><b>↗</b></button>)}<small>{t.exampleSource}</small></aside></section>}
    {dataset?.kind==='raw'&&<div className="data-body"><Grid dataset={dataset} runtime={runtime} selected={selected} onSelect={setSelected} blocked={analysisBusy}/><VariableDetails column={dataset.columns.find(c=>c.name===selected)} disabled={locked} onType={type=>void changeType(type)}/></div>}
    {dataset?.kind==='covariance'&&<section className="matrix-view"><p>{t.matrixCases.replace('{n}',String(dataset.sampleSize))}</p><div className="table-scroll"><table><thead><tr><th/>{dataset.names?.map(n=><th key={n}>{n}</th>)}</tr></thead><tbody>{dataset.matrix?.map((r,i)=><tr key={i}><th>{dataset.names?.[i]}</th>{r.map((v,j)=><td key={j}>{numberText(v,6)}</td>)}</tr>)}</tbody></table></div>{dataset.means&&<p>{t.mean}: {dataset.means.map(v=>numberText(v)).join(', ')}</p>}</section>}
  </main>;
}
