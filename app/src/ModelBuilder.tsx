import {useEffect,useState} from 'react';
import {Icon} from './icons';
import {isUnmeasured,parameterText,type CompiledModel,type Parameter,type SceneNode} from './model';
import {parameterKey,type DrawTool,type EditCommand} from './editing';
import type {Dataset} from './analysis';
import en from './en.json';
const t=en.builder;
export function ModelTools({tool,setTool,name,setName,disabled,onFormat,source}:{tool:DrawTool;setTool:(t:DrawTool)=>void;name:string;setName:(n:string)=>void;disabled:boolean;onFormat:()=>void;source?:string}){
 const icons:Record<DrawTool,string>={select:'cursor',observed:'observed',latent:'latent',regression:'arrow',loading:'loading',covariance:'covariance',formative:'formative'};
 return <><div className="drawing-tools" role="toolbar" aria-label={t.tools}>{(['select','observed','latent','regression','loading','covariance','formative'] as const).map(value=><button key={value} className={tool===value?'active':''} disabled={disabled} aria-pressed={tool===value} title={t[value]} onClick={()=>setTool(value)}><Icon name={icons[value]} size={17}/><span>{t[value]}</span></button>)}<span className="drawing-divider"/>{(tool==='observed'||tool==='latent')&&<input aria-label={t.variableName} placeholder={t.variableName} value={name} disabled={disabled} onChange={e=>setName(e.target.value.slice(0,100))}/>}<button className="format-syntax" disabled={disabled} title={t.formatHint} onClick={onFormat}><Icon name="code" size={15}/><span>{t.format}</span></button></div><div className="drawing-hint" role="status">{tool==='select'?t.selectHint:tool==='observed'||tool==='latent'?t.createHint:source?t.targetHint.replace('{name}',source):t.sourceHint}</div></>;
}
export function VariablePalette({dataset,model,onAdd}:{dataset?:Dataset;model?:CompiledModel;onAdd:(name:string)=>void}){
 const [filter,setFilter]=useState('');
 const columns=dataset?.columns.filter(c=>`${c.name} ${c.label}`.toLowerCase().includes(filter.toLowerCase()))||[];
 return <div className="variable-palette"><p>{dataset?t.dragHint:t.noDataset}</p>{dataset&&<input aria-label={t.find} placeholder={t.find} value={filter} onChange={e=>setFilter(e.target.value)}/>}<div className="palette-list">{columns.map(col=>{const exists=model?.observed.includes(col.name)||model?.latent.includes(col.name);return <button key={col.name} draggable={!exists} title={`${col.label||col.name}${exists?` · ${t.inModel}`:''}`} className={exists?'in-model':''} onDragStart={e=>{e.dataTransfer.setData('application/x-forma-variable',col.name);e.dataTransfer.effectAllowed='copy';}} onClick={()=>onAdd(col.name)}><span className="variable-symbol">{col.storage==='numeric'?'#':'a'}</span><span>{col.name}<small>{col.label||en.data.types[col.type]}</small></span><Icon name={exists?'check':'plus'} size={13}/></button>;})}</div></div>;
}
export function ModelInspector({node,parameter,model,disabled,readOnly,onCommand,onParameter,onClose}:{node?:SceneNode;parameter?:Parameter;model:CompiledModel;disabled:boolean;readOnly:boolean;onCommand:(c:EditCommand)=>void;onParameter:(p:Parameter)=>void;onClose:()=>void}){
 const [name,setName]=useState(node?.name||''),[mode,setMode]=useState<'free'|'fixed'|'default'>('free'),[value,setValue]=useState('1'),[label,setLabel]=useState(''),[allGroups,setAllGroups]=useState(false);
 useEffect(()=>{setName(node?.name||'');},[node?.id]);
 useEffect(()=>{if(parameter){setMode(parameter.defaultFixed?'default':parameter.free>0?'free':'fixed');setValue(String(parameter.ustart??0));setLabel(parameter.label||'');setAllGroups(model.options.groups===1||parameter.defaultFixed);}},[parameter&&parameterKey(parameter)]);
 const dataFixed=!!parameter&&parameter.exo===1&&parameter.free===0&&parameter.ustart===null;
 const editable=!!parameter&&['=~','<~','~','~~','~1','|','~*~'].includes(parameter.op)&&!isUnmeasured(parameter)&&!readOnly&&!dataFixed;
 const related=node?model.table.filter(r=>r.group===node.group&&(r.lhs===node.name||r.rhs===node.name)&&!isUnmeasured(r)):[];
 return <aside className="builder-inspector" aria-label={parameter?t.parameter:t.variable}><header><span>{parameter?t.parameter:t.variable}</span><button className="tool" aria-label={t.close} onClick={onClose}><Icon name="close" size={15}/></button></header>
   {parameter?<><h2 className="parameter-title">{parameter.lhs} <span>{parameter.op}</span> {parameter.rhs}</h2><div className="parameter-context">{parameter.group?`${en.group} ${parameter.group}`:t.globalParameter} · {parameter.origin==='implicit'?en.implicitOrigin:parameter.origin==='constraint'?en.constraintOrigin:en.explicitOrigin}</div>
     {editable?<form onSubmit={e=>{e.preventDefault();onCommand({kind:'parameter',id:parameter.id,mode,label,allGroups,value:mode==='fixed'?Number(value):undefined});}}>
       {parameter.origin==='implicit'&&<p className="builder-explanation">{t.implicitHint}</p>}
       <label>{t.mode}<select disabled={disabled} value={mode} onChange={e=>setMode(e.target.value as typeof mode)}><option value="free">{t.free}</option><option value="fixed">{t.fixed}</option><option value="default" disabled={model.options.groups>1&&!allGroups}>{t.default}</option></select></label>
       {mode==='fixed'&&<label>{t.value}<input required type="number" step="any" value={value} disabled={disabled} onChange={e=>setValue(e.target.value)}/></label>}
       <label>{t.label}<input value={label} maxLength={100} disabled={disabled} onChange={e=>setLabel(e.target.value)}/></label>
       {model.options.groups>1&&<label className="builder-check"><input type="checkbox" checked={allGroups} disabled={disabled} onChange={e=>{setAllGroups(e.target.checked);if(!e.target.checked&&mode==='default')setMode(parameter.free>0?'free':'fixed');}}/>{t.allGroups}</label>}
       <button className="button primary" disabled={disabled||mode==='fixed'&&(value.trim()===''||!Number.isFinite(Number(value)))}>{t.apply}</button>
       {['=~','<~','~','~~'].includes(parameter.op)&&<button type="button" className="button builder-delete" disabled={disabled} onClick={()=>onCommand({kind:'removeParameter',id:parameter.id})}>{parameter.op==='~~'?parameter.lhs===parameter.rhs?t.zeroVariance:t.zeroCovariance:t.removePath}</button>}
     </form>:<p className="builder-explanation">{dataFixed?en.errors['edit.fixedX']:readOnly?t.dataGenerated:t.editInSyntax}</p>}
   </>:node&&<><h2>{node.name}</h2><div className="parameter-context">{node.kind==='observed'?en.observed:en.latent} · {en.group} {node.group}</div><form onSubmit={e=>{e.preventDefault();if(name!==node.name)onCommand({kind:'rename',name:node.name,newName:name});}}><label>{t.name}<input required value={name} maxLength={100} disabled={disabled} onChange={e=>setName(e.target.value)}/></label>{node.kind==='observed'&&<p className="builder-explanation">{t.renameDataHint}</p>}<button className="button" disabled={disabled||name===node.name}>{t.rename}</button><button type="button" className="button builder-delete" disabled={disabled} onClick={()=>onCommand({kind:'removeVariable',name:node.name})}>{t.removeVariable}</button></form><h3>{t.related}</h3><div className="related-parameters">{related.map(r=><button key={r.id} onClick={()=>onParameter(r)}><span>{r.lhs} <i>{r.op}</i> {r.rhs}</span><small>{parameterText(r)||en.free}</small></button>)}</div></>}
   {model.options.groups>1&&<p className="builder-explanation">{t.groupHint}</p>}
 </aside>;
}
