import {useEffect,useMemo,useRef,useState} from 'react';
import Editor from './Editor';
import Diagram from './Diagram';
import DataWorkspace from './DataWorkspace';
import ResultsWorkspace from './ResultsWorkspace';
import AdvancedOptions from './AdvancedOptions';
import ExportDialog from './ExportDialog';
import {notationModel} from './notation';
import {ModelTools,ModelInspector,VariablePalette} from './ModelBuilder';
import {ModelHistory,parameterKey,nextVariableName,editHeadings,type DrawTool,type EditCommand,type EditResult,type ModelSnapshot} from './editing';
import {loadSession,saveSession} from './storage';
import {attachmentState,portableAttachment,type DatasetState} from './dataset-source';
import {analysisKey,annotatedModel,defaultAnalysis,defaultAnnotation,messageText,type Dataset,type AnalysisOptions,type AnalysisSnapshot,type FitResult,type AnnotationOptions} from './analysis';
import {Icon} from './icons';
import {LavaanRuntime} from './runtime';
import {layoutModel,type Measure} from './layout';
import {renderSvg} from './svg';
import {defaultOptions,defaultDisplay,nodeId,type Options,type Display,type Scene,type Box,type Positions,type Position,type SceneNode,type Parameter,type CompiledModel,parameterText} from './model';
import {savedProject,readProject,downloadFile,rScript,SESSION,type Project} from './project';
import fixtures from '../../fixtures/models.json';
import en from './en.json';

const initial=savedProject();
const pathExampleIndex=fixtures.findIndex(f=>f.id==='06-observed-path');
const examplePreset=(f:typeof fixtures[number]):Options['preset']=>['03-mediation','06-observed-path'].includes(f.id)?'path':f.preset as Options['preset'];
const savedPositions=(scene:Scene):Positions=>Object.fromEntries(scene.nodes.map(n=>[n.id,{x:n.x,y:n.y}]));
const fitBox=(scene:Scene):Box=>({x:scene.minX,y:scene.minY,width:scene.width,height:scene.height});
const errorText=(message:string)=>{const split=message.indexOf(': '),key=split>=0?message.slice(0,split):message;return (en.errors as Record<string,string>)[key]?`${(en.errors as Record<string,string>)[key]}${split>=0?message.slice(split):''}`:message;};
const measureText:Measure=(text,size)=>{const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d')!;ctx.font=`${size}px "Forma Sans", Arial`;return ctx.measureText(text).width;};
function Tool({label,icon,onClick,disabled=false,active=false}:{label:string;icon:string;onClick:()=>void;disabled?:boolean;active?:boolean}){
  return <button className={`tool ${active?'active':''}`} aria-label={label} title={label} onClick={onClick} disabled={disabled}><Icon name={icon}/></button>;
}
export default function App(){
  const [syntax,setSyntax]=useState(initial?.syntax??fixtures[0].syntax),[options,setOptions]=useState<Options>(initial?.options||defaultOptions);
  const [display,setDisplay]=useState<Display>(initial?.display||{...defaultDisplay,title:en.exampleNames[0]});
  const [workspace,setWorkspace]=useState<'data'|'model'|'results'>(initial&&!initial.datasetAttached?'model':'data');
  const [dataset,setDataset]=useState<Dataset>(),[analysis,setAnalysis]=useState<AnalysisOptions>(initial?.analysis||defaultAnalysis);
  const [fit,setFit]=useState<AnalysisSnapshot>(),[fitting,setFitting]=useState(false),[fitError,setFitError]=useState('');
  const [annotation,setAnnotation]=useState<AnnotationOptions>(defaultAnnotation),[fitScene,setFitScene]=useState<{key:string;scene:Scene}>(),[annotationError,setAnnotationError]=useState('');
  const fitSerial=useRef(0);
  const [activeExample,setActiveExample]=useState<string|undefined>(initial?undefined:fixtures[0].id);
  const [scene,setScene]=useState<Scene>(),[viewport,setViewport]=useState<Box>({x:0,y:0,width:800,height:650});
  const [stage,setStage]=useState('initialRuntime'),[working,setWorking]=useState(false),[error,setError]=useState('');
  const [errorKind,setErrorKind]=useState<'syntax'|'runtime'|'layout'>('syntax');
  const [revision,setRevision]=useState(0),[validSyntax,setValidSyntax]=useState(''),[selection,setSelection]=useState<string[]>([]);
  const [settings,setSettings]=useState(false),[inspector,setInspector]=useState<'parameters'|'script'|undefined>(),[filter,setFilter]=useState('');
  const [snap,setSnap]=useState(true),[notice,setNotice]=useState(initial?en.restored:''),[autosaved,setAutosaved]=useState(false),[autosaveFailed,setAutosaveFailed]=useState(false);
  const [tool,setTool]=useState<DrawTool>('select'),[newName,setNewName]=useState(''),[linkSource,setLinkSource]=useState<string>(),[selectedParameter,setSelectedParameter]=useState<string>();
  const [libraryTab,setLibraryTab]=useState<'examples'|'variables'>('examples'),[includeDataset,setIncludeDataset]=useState(true);
  const [sessionReady,setSessionReady]=useState(false),[restoring,setRestoring]=useState(true);
  const history=useRef<ModelHistory>(new ModelHistory({syntax:initial?.syntax??fixtures[0].syntax,options:initial?.options||defaultOptions,positions:initial?.positions||{}}));
  const skipCompile=useRef<string|undefined>(undefined);
  const verificationStarted=useRef(false);
  const [verificationStatus,setVerificationStatus]=useState('');
  const [verifying,setVerifying]=useState(false);
  const [exportDialog,setExportDialog]=useState(false);
  const [,setHistoryRevision]=useState(0);
  const runtime=useRef<LavaanRuntime|null>(null);if(!runtime.current)runtime.current=new LavaanRuntime(s=>setStage(s));
  const positions=useRef<Positions>(initial?.positions||{}),sceneRef=useRef<Scene|undefined>(undefined);
  const serial=useRef(0),geometryRevision=useRef(0),needsFit=useRef(true),file=useRef<HTMLInputElement>(null);
  const committed=useRef<{model:CompiledModel;syntax:string;inputOptions:Options}|undefined>(initial?.canonical?{model:initial.canonical,syntax:initial.validSyntax||initial.syntax,inputOptions:initial.options}:undefined);
  const synced=!!scene&&!error&&!working&&validSyntax===syntax&&JSON.stringify(committed.current?.inputOptions)===JSON.stringify(options);
  const currentKey=analysisKey(syntax,options,analysis,dataset),fresh=fit?.key===currentKey;
  const canAnnotate=!!fit&&fresh&&fit.result.converged&&fit.result.admissible&&synced;
  const projectionKey=JSON.stringify([fit?.at,annotation,display.notation,display.varianceStyle,scene&&savedPositions(scene)]);
  const viewScene=canAnnotate&&fitScene?.key===projectionKey?fitScene.scene:scene;
  const exportReady=synced&&(!canAnnotate||fitScene?.key===projectionKey);
  const notify=(message:string)=>{setNotice(message);window.setTimeout(()=>setNotice(''),3600);};
  const commitScene=(next:Scene)=>{sceneRef.current=next;setScene(next);positions.current=savedPositions(next);
    if(needsFit.current){setViewport(fitBox(next));needsFit.current=false;}};
  const model=committed.current?.model;
  const layOut=(m:CompiledModel,p:Positions)=>layoutModel({...(display.notation?notationModel(m):m),displayVariances:display.varianceStyle||'amos'},p,measureText);
  useEffect(()=>{setRevision(n=>n+1);},[display.notation,display.varianceStyle]);
  const selectedNode=selection.length===1?viewScene?.nodes.find(n=>n.id===selection[0]&&n.kind!=='residual'):undefined;
  const chosenParameter=selectedParameter?(model?.table.find(r=>parameterKey(r)===selectedParameter)||viewScene?.model.table.find(r=>parameterKey(r)===selectedParameter)):undefined;
  const editingDisabled=restoring||fitting||working||!!syntax.trim()&&!synced;
  const parameterSelected=(id:number)=>{const row=viewScene?.model.table.find(r=>r.id===id);setSelectedParameter(row?parameterKey(row):undefined);};
  useEffect(()=>{let active=true;void loadSession().then(async saved=>{if(active&&saved)await loadProject(saved.project,saved.dataset);}).catch(e=>{if(active)notify(errorText(e.message||'storage.failed'));}).finally(()=>{if(active){setSessionReady(true);setRestoring(false);}});return()=>{active=false;};},[]);
  useEffect(()=>{if(dataset)setLibraryTab('variables');},[dataset?.id]);
  useEffect(()=>{const snapshot=initial?.canonical;if(snapshot)void layOut(snapshot,positions.current).then(next=>{if(committed.current?.model===snapshot)commitScene(next);}).catch(()=>{});},[]);
  useEffect(()=>{
    let active=true;setAnnotationError('');
    if(!canAnnotate||!fit){setFitScene(undefined);return;}
    void layOut(annotatedModel(fit.result,annotation),positions.current).then(next=>{if(active){setFitScene({key:projectionKey,scene:next});setViewport(fitBox(next));}}).catch(e=>{if(active)setAnnotationError(`${en.workspace.annotationFailed} ${messageText(e.message)}`);});
    return()=>{active=false;};
  },[canAnnotate,fit,annotation,scene]);
  useEffect(()=>{
    if(!sessionReady||restoring)return;
    setAutosaved(false);
    const expected=JSON.stringify([syntax,options]);if(skipCompile.current===expected){skipCompile.current=undefined;return;}
    const current=++serial.current;setWorking(true);setError('');
    if(!syntax.trim()){committed.current=undefined;sceneRef.current=undefined;setScene(undefined);positions.current={};setValidSyntax('');setWorking(false);history.current.record({syntax,options,positions:{}});setHistoryRevision(n=>n+1);return;}
    const timer=window.setTimeout(async()=>{
      try{
        const result=await runtime.current!.compile(syntax,options);
        if(current!==serial.current)return;
        if(!result.ok){setErrorKind('syntax');setError(errorText(result.message));return;}
        setStage('layingOut');
        const next=await layOut(result,positions.current);
        if(current!==serial.current)return;
        committed.current={model:result,syntax,inputOptions:options};commitScene(next);setValidSyntax(syntax);setStage('ready');history.current.record({syntax,options,positions:savedPositions(next)});setHistoryRevision(n=>n+1);
      }catch(e){if(current===serial.current){const message=String((e as Error).message||e);setErrorKind(message.startsWith('layout.')?'layout':'runtime');setError(errorText(message));setStage('ready');}}
      finally{if(current===serial.current)setWorking(false);}
    },500);
    return()=>window.clearTimeout(timer);
  },[syntax,options,revision,sessionReady,restoring]);
  useEffect(()=>{
    if(!sessionReady||restoring||verificationStarted.current)return;
    if(import.meta.env.DEV&&new URLSearchParams(location.search).has('verify')){
      verificationStarted.current=true;
      setVerificationStatus(en.verificationRunning);setVerifying(true);
      const done=(label:string,total:number)=>(count:number)=>{setVerifying(false);const message=`${label}: ${count}/${total}`;setVerificationStatus(message);notify(message);};
      const failed=(error:unknown)=>{setVerifying(false);setVerificationStatus(String(error));notify(String(error));};
      if(new URLSearchParams(location.search).get('verify')==='advanced')void import('./verify-advanced').then(({verifyAdvanced})=>verifyAdvanced(runtime.current!,measureText,n=>setVerificationStatus(`${en.advanced.verification}: ${n}/12`))).then(done(en.advanced.verification,12)).catch(failed);
      else if(new URLSearchParams(location.search).get('verify')==='editing')void import('./verify-editing').then(({verifyEditing})=>verifyEditing(runtime.current!,measureText)).then(done(en.editingVerification,15)).catch(failed);
      else if(new URLSearchParams(location.search).get('verify')==='analysis')void import('./verify-analysis').then(({verifyAnalysis})=>verifyAnalysis(runtime.current!,measureText)).then(done(en.analysisVerification,3)).catch(failed);
      else void import('./verify').then(({verifyBrowser})=>verifyBrowser(runtime.current!,measureText)).then(done(en.verification,7)).catch(failed);
    }
  },[sessionReady,restoring]);
  useEffect(()=>{
    if(!sessionReady||restoring)return;
    const project:Project={format:'forma-sem',version:2,syntax,options,analysis,datasetAttached:!!dataset,positions:positions.current,display,canonical:committed.current?.model,validSyntax:committed.current?.syntax};
    const source=dataset?runtime.current!.snapshotDataset():undefined;
    if(dataset&&source?.query.id!==dataset.id)return;
    let active=true;const timer=window.setTimeout(()=>{void saveSession(project,source).then(()=>{if(active){setAutosaved(true);setAutosaveFailed(false);}try{localStorage.setItem(SESSION,JSON.stringify(project));}catch{/* IndexedDB is the primary store. */}}).catch(()=>{if(active){setAutosaved(false);setAutosaveFailed(true);}});},800);
    return()=>{active=false;clearTimeout(timer);};
  },[syntax,options,analysis,dataset,display,scene,sessionReady,restoring]);
  const showExample=(i:number)=>{const f=fixtures[i];positions.current={};needsFit.current=true;
    committed.current=undefined;sceneRef.current=undefined;setScene(undefined);setValidSyntax('');
    setSelection([]);setSelectedParameter(undefined);setLinkSource(undefined);setTool('select');setActiveExample(f.id);setSyntax(f.syntax);setOptions({...defaultOptions,preset:examplePreset(f),groups:f.groups,meanstructure:f.groups>1});setDisplay(d=>({...d,title:en.exampleNames[i]}));};
  const changeSyntax=(text:string)=>{serial.current++;setSyntax(text);setAutosaved(false);};
  const applyPositions=async(next:Positions,record=true)=>{
    if(!committed.current)return;
    const model=committed.current.model,request=++geometryRevision.current;
    setWorking(true);
    try{const result=await layOut(model,next);if(request!==geometryRevision.current||committed.current?.model!==model)return;
      commitScene(result);
      if(record){history.current.record({syntax:committed.current.syntax,options:committed.current.inputOptions,positions:savedPositions(result)},true);setHistoryRevision(n=>n+1);}
    }catch(e){notify(errorText((e as Error).message));}finally{if(request===geometryRevision.current)setWorking(false);}
  };
  const acceptModel=(text:string,opts:Options,canonical:CompiledModel|undefined,next:Scene|undefined)=>{
    skipCompile.current=JSON.stringify([text,opts]);setSyntax(text);setOptions(opts);setValidSyntax(text);setError('');setAnnotationError('');setStage('ready');
    committed.current=canonical?{model:canonical,syntax:text,inputOptions:opts}:undefined;sceneRef.current=next;setScene(next);positions.current=next?savedPositions(next):{};
    if(next&&needsFit.current){setViewport(fitBox(next));needsFit.current=false;}if(!next)setViewport({x:0,y:0,width:800,height:650});
    setSelectedParameter(undefined);setSelection([]);setLinkSource(undefined);setActiveExample(undefined);setAutosaved(false);
  };
  const undo=async(delta:number)=>{
    if(fitting||restoring||delta>0&&working)return;const head=history.current.current,dirty=syntax!==head.syntax||JSON.stringify(options)!==JSON.stringify(head.options),step=delta<0&&(dirty||working)?0:delta,target=step===0?head:history.current.peek(step);if(!target)return;
    const request=++serial.current;setWorking(true);
    try{let canonical:CompiledModel|undefined,next:Scene|undefined;if(target.syntax.trim()){const result=await runtime.current!.compile(target.syntax,target.options);if(!result.ok)throw new Error(result.message);canonical=result;next=await layOut(result,target.positions);}
      if(request!==serial.current)return;history.current.move(step);acceptModel(target.syntax,target.options,canonical,next);setHistoryRevision(n=>n+1);
    }catch(e){notify(errorText((e as Error).message));}finally{if(request===serial.current)setWorking(false);}
  };
  const applyEdit=async(command:EditCommand,point?:Position)=>{
    if(editingDisabled){notify(en.builder.wait);return;}const request=++serial.current;setWorking(true);
    try{const result=await runtime.current!.request<EditResult>({action:'edit',text:syntax,options,command,headings:editHeadings()});if(request!==serial.current)return;
      const previous=structuredClone(positions.current);
      if(command.kind==='rename')for(let g=1;g<=options.groups;g++)for(const prefix of ['','res:']){const old=prefix+nodeId(g,command.name),key=prefix+nodeId(g,command.newName);if(previous[old]){previous[key]=previous[old];delete previous[old];}}
      if(point&&(command.kind==='observed'||command.kind==='latent'))previous[nodeId(1,command.name)]={x:snap?Math.round(point.x/10)*10:point.x,y:snap?Math.round(point.y/10)*10:point.y};
      const next=result.model?await layOut(result.model,previous):undefined;if(request!==serial.current)return;
      if(command.kind==='format'&&fresh&&fit)setFit({...fit,key:analysisKey(result.syntax,options,analysis,dataset),syntax:result.syntax});
      acceptModel(result.syntax,options,result.model||undefined,next);history.current.record({syntax:result.syntax,options,positions:next?savedPositions(next):{}});setHistoryRevision(n=>n+1);
      if(command.kind==='observed'||command.kind==='latent'){setNewName('');setSelection([nodeId(1,command.name)]);}
      if(command.kind==='format')notify(en.builder.formatComplete);
    }catch(e){notify(errorText((e as Error).message));}finally{if(request===serial.current)setWorking(false);}
  };
  const placeVariable=(kind:'observed'|'latent',point?:Position,name?:string)=>{
    const chosen=name||newName.trim()||nextVariableName(kind,model);
    if(model?.observed.includes(chosen)||model?.latent.includes(chosen)){setSelection([nodeId(1,chosen)]);setSelectedParameter(undefined);notify(en.builder.nameExists);return;}
    void applyEdit({kind,name:chosen},point||{x:viewport.x+viewport.width/2,y:viewport.y+viewport.height/2});
  };
  const endpoint=(n:SceneNode)=>{
    if(editingDisabled)return;if(n.kind==='residual'&&tool!=='covariance'){notify(en.builder.residualCovarianceOnly);return;}const node=n.owner?scene?.nodes.find(v=>v.id===n.owner):n;if(!node)return;
    const start=scene?.nodes.find(v=>v.id===linkSource);
    if(!start){setLinkSource(node.id);return;}if(start.id===node.id){setLinkSource(undefined);return;}
    if(start.group!==node.group){notify(en.builder.crossGroup);return;}
    if(['regression','loading','covariance','formative'].includes(tool))void applyEdit({kind:'connect',from:start.name,to:node.name,relation:tool as 'regression'|'loading'|'covariance'|'formative'});
    setLinkSource(undefined);
  };
  const deleteSelection=()=>{if(chosenParameter&&!editingDisabled){const target=model?.table.find(r=>parameterKey(r)===parameterKey(chosenParameter));if(target)void applyEdit({kind:'removeParameter',id:target.id});}else if(selectedNode)void applyEdit({kind:'removeVariable',name:selectedNode.name});};
  const reflow=()=>{needsFit.current=true;void applyPositions({});};
  const align=(axis:'x'|'y',distribute=false)=>{
    const selected=scene?.nodes.filter(n=>selection.includes(n.id));if(!selected||selected.length<2)return;
    const next=structuredClone(positions.current),ordered=[...selected].sort((a,b)=>a[axis]-b[axis]),min=ordered[0][axis],max=ordered.at(-1)![axis];
    ordered.forEach((n,i)=>{const value=distribute?min+(max-min)*i/(ordered.length-1):(min+max)/2,delta=value-n[axis];next[n.id][axis]=value;
      scene?.nodes.filter(e=>e.owner===n.id&&!selection.includes(e.id)).forEach(e=>next[e.id][axis]+=delta);});void applyPositions(next);
  };
  const project=():Project=>({format:'forma-sem',version:2,syntax,options,analysis,datasetAttached:!!dataset,positions:positions.current,display,canonical:committed.current?.model,validSyntax:committed.current?.syntax});
  const save=()=>{try{const p=project(),source=dataset&&includeDataset?runtime.current?.snapshotDataset():undefined;if(dataset&&includeDataset&&source?.query.id!==dataset.id)throw new Error('storage.missing');if(source)p.dataset=portableAttachment(source);downloadFile(JSON.stringify(p,null,2),`${display.title||'model'}.forma.json`,'application/json');notify(source?en.projectData.saved:en.saved);}catch(e){notify(errorText((e as Error).message));}};
  const loadProject=async(p:Project,source?:DatasetState)=>{
    serial.current++;geometryRevision.current++;fitSerial.current++;setRestoring(true);
    try{const valid=p.validSyntax??p.syntax;let canonical:CompiledModel|undefined,next:Scene|undefined;
      if(valid.trim()){const result=await runtime.current!.compile(valid,p.options);if(!result.ok)throw new Error(result.message);canonical=result;next=await layOut(result,p.positions);}
      const attachment=source||(p.dataset?attachmentState(p.dataset):undefined);let restored:Dataset|undefined;
      if(attachment)restored=(await runtime.current!.restoreDataset(attachment)).dataset;else await runtime.current!.discardDataset();
      needsFit.current=true;acceptModel(valid,p.options,canonical,next);if(p.syntax!==valid){skipCompile.current=undefined;setSyntax(p.syntax);}
      history.current.reset({syntax:valid,options:p.options,positions:next?savedPositions(next):{}});setHistoryRevision(n=>n+1);
      setAnalysis(p.analysis||defaultAnalysis);setDataset(restored);setFit(undefined);setFitError('');setAnnotation(defaultAnnotation);setTool('select');setDisplay(p.display);setWorkspace(restored?'model':p.datasetAttached?'data':'model');setIncludeDataset(true);setRevision(n=>n+1);
      if(p.datasetAttached&&!restored)notify(en.workspace.reattach);else if(restored)notify(en.projectData.restored);
    }finally{setRestoring(false);}
  };
  const open=async(file:File)=>{try{if(file.size>80*1024*1024)throw new Error('badProject');const p=readProject(JSON.parse(await file.text()));await loadProject(p);}catch(e){notify(errorText((e as Error).message||'badProject'));}};
  const exportSvg=()=>{if(!viewScene||!exportReady||viewScene.diagnostics.length)return;downloadFile(renderSvg(viewScene,display),`${display.title||'model'}.svg`,'image/svg+xml');notify(en.exported);};
  const zoom=(factor:number)=>setViewport(v=>({x:v.x+v.width*(1-factor)/2,y:v.y+v.height*(1-factor)/2,width:v.width*factor,height:v.height*factor}));
  const names=useMemo(()=>[...new Set([...(scene?[...scene.model.observed,...scene.model.latent]:[]),...(dataset?.columns.map(c=>c.name)||[])])],[scene?.model,dataset]);
  const rows=viewScene?.model.table.filter(r=>!filter||`${r.lhs} ${r.op} ${r.rhs} ${r.label}`.toLowerCase().includes(filter.toLowerCase()))||[];
  const inspectedScript=canAnnotate&&viewScene?.model.analysisDisplay?fit!.result.script:rScript(committed.current?.syntax||syntax,viewScene?.model.options||options);
  const runAnalysis=async()=>{if(!dataset||!synced||fitting||restoring)return;const request=++fitSerial.current,key=currentKey,data=dataset;setFitting(true);setFitError('');
    try{const result=await runtime.current!.request<FitResult>({action:'fit',id:data.id,revision:data.revision,text:syntax,options,analysis});if(request!==fitSerial.current)return;
      setFit({key,datasetName:data.name,syntax,result,at:new Date().toISOString()});setAnnotation(v=>({...v,mode:'estimates'}));setWorkspace('results');
    }catch(e){if(request===fitSerial.current){setFitError(messageText((e as Error).message));setWorkspace('results');}}finally{if(request===fitSerial.current)setFitting(false);}
  };
  const stopAnalysis=async()=>{fitSerial.current++;setFitting(false);await runtime.current?.restart();setRevision(n=>n+1);notify(en.workspace.cancelled);};
  const stageText=(en as Record<string,unknown>)[stage] as string||en.ready;
  const parameterType=(row:{origin:string})=>row.origin==='implicit'?en.implicitOrigin:row.origin==='constraint'?en.constraintOrigin:en.explicitOrigin;
  const canUndo=history.current.canUndo||syntax!==history.current.current.syntax||JSON.stringify(options)!==JSON.stringify(history.current.current.options);
  const canRedo=history.current.canRedo&&syntax===history.current.current.syntax&&JSON.stringify(options)===JSON.stringify(history.current.current.options);
  const resetModel=()=>{if(working||restoring||fitting)return;serial.current++;needsFit.current=true;acceptModel('',defaultOptions,undefined,undefined);history.current.record({syntax:'',options:defaultOptions,positions:{}});setHistoryRevision(n=>n+1);setTool('select');setDisplay({...defaultDisplay});};
  useEffect(()=>{const handle=(e:KeyboardEvent)=>{if(!(e.ctrlKey||e.metaKey)||(e.target as Element)?.closest?.('input,textarea,select,.cm-editor'))return;const key=e.key.toLowerCase();if(key==='z'||key==='y'){e.preventDefault();void undo(key==='y'||e.shiftKey?1:-1);}};document.addEventListener('keydown',handle);return()=>document.removeEventListener('keydown',handle);});
  return <><div className="app-shell" inert={verifying||undefined}>
    <header className="topbar">
      <a className="brand" href="#" onClick={e=>e.preventDefault()} aria-label={`${en.brand} ${en.tagline}`}><span className="brand-mark"><i/><b/></span><span>{en.brand}<small>{en.tagline}</small></span></a>
      <div className="document-name"><span className="document-dot"/><input aria-label={en.defaultTitle} value={display.title} onChange={e=>setDisplay(d=>({...d,title:e.target.value.slice(0,250)}))}/><span className="document-divider"/><span className="phase-label">{en.phase}</span></div>
      <div className="header-actions"><span className="private-badge"><Icon name="lock" size={13}/>{en.local}</span><button className="button subtle" disabled={working||fitting||restoring} onClick={()=>file.current?.click()}><Icon name="open"/>{en.open}</button><button className="button subtle" disabled={restoring||fitting} onClick={save} title={en.saveHint}><Icon name="save"/>{en.save}</button><button className="button primary" disabled={restoring||!exportReady||!!viewScene?.diagnostics.length} onClick={()=>setExportDialog(true)}><Icon name="download"/>{en.export}</button></div>
    </header>
    <div className="workspace-bar"><nav aria-label={en.workspaceNavigation}>{(['data','model','results'] as const).map(tab=><button key={tab} className={workspace===tab?'active':''} aria-current={workspace===tab?'page':undefined} onClick={()=>setWorkspace(tab)}>{en.workspace[tab]}{tab==='results'&&fit&&<i className={fresh?'fresh':'stale'}/>}</button>)}</nav><button className={`dataset-chip ${dataset?'attached':''}`} onClick={()=>setWorkspace('data')} title={dataset?.name||en.workspace.attachData}><Icon name="table" size={15}/><span>{dataset?.name||en.workspace.attachData}</span>{dataset&&<small>{dataset.kind==='raw'?`${dataset.rows} × ${dataset.columns.length}`:`N = ${dataset.sampleSize}`}</small>}</button>{fitting?<button className="button stop-analysis" onClick={()=>void stopAnalysis()}>{en.workspace.cancel}</button>:<button className="button primary run-analysis" disabled={!dataset||!synced} title={!dataset||!synced?en.workspace.needsModel:undefined} onClick={()=>void runAnalysis()}><Icon name="arrow" size={16}/>{en.workspace.run}</button>}</div>
    {dataset&&<div className="analysis-controls"><label>{en.workspace.estimator}<select disabled={fitting} value={analysis.estimator} onChange={e=>setAnalysis(a=>({...a,estimator:e.target.value as AnalysisOptions['estimator']}))}>{['ML','MLR','WLSMV'].map(value=><option key={value}>{value}</option>)}</select></label><label>{en.workspace.missing}<select disabled={fitting} value={analysis.missing} onChange={e=>setAnalysis(a=>({...a,missing:e.target.value as AnalysisOptions['missing']}))}>{(['listwise','fiml','pairwise'] as const).map(value=><option key={value} value={value}>{en.workspace[value]}</option>)}</select></label>{options.groups>1&&dataset.kind==='raw'&&<label>{en.workspace.group}<select disabled={fitting} value={analysis.group} onChange={e=>setAnalysis(a=>({...a,group:e.target.value}))}><option value="">{en.workspace.selectGroup}</option>{dataset.columns.map(c=><option key={c.name}>{c.name}</option>)}</select></label>}<span className={fitting?'fitting-status':''}>{fitting?en.workspace.running:canAnnotate?en.workspace.fitted:en.noEstimates}</span></div>}
    {dataset&&<AdvancedOptions value={analysis} disabled={fitting||restoring} onChange={value=>{setAnalysis(value);if(value.invariance&&!analysis.invariance)setOptions(o=>({...o,meanstructure:true}));}}/>}
    {restoring&&<div className="project-loading" role="status">{en.projectData.restoring}</div>}
    {workspace==='data'&&<><div className="reattach-notice" hidden={!initial?.datasetAttached||!!dataset||restoring}>{en.workspace.reattach}</div><DataWorkspace runtime={runtime.current} dataset={dataset} onDataset={d=>{setDataset(d);setFitError('');setAutosaved(false);}} analysisBusy={fitting||restoring} onExample={example=>{showExample(example==='holzinger'?0:example==='democracy'?1:2);setAnalysis(defaultAnalysis);}}/></>}
    {workspace==='results'&&<ResultsWorkspace snapshot={fit} stale={!!fit&&!fresh} error={fitError} onModel={()=>setWorkspace('model')} onNotice={notify} disabled={editingDisabled} onModification={row=>{if(!fresh)return;void applyEdit({kind:'modification',lhs:row.lhs,op:row.op,rhs:row.rhs,group:row.group||1});setWorkspace('model');}}/>}
    {workspace==='model'&&fit&&!fresh&&<div className="analysis-alert stale" role="status">{en.workspace.stale}</div>}
    <main className="workbench" hidden={workspace!=='model'}>
      <aside className="library">
        <div className="library-heading">{en.project}<span>07</span></div>
        <button className="new-model" disabled={working||restoring||fitting} onClick={resetModel}><Icon name="plus"/>{en.newModel}</button>
        <div className="library-tabs"><button className={libraryTab==='examples'?'active':''} onClick={()=>setLibraryTab('examples')}>{en.builder.examples}</button><button className={libraryTab==='variables'?'active':''} onClick={()=>setLibraryTab('variables')}>{en.builder.variables}</button></div>
        {libraryTab==='examples'?<nav aria-label={en.examples}>{fixtures.map((f,i)=><button key={f.id} disabled={working||restoring||fitting} className={`example ${activeExample===f.id?'selected':''}`} onClick={()=>showExample(i)}><span className="example-index">{String(i+1).padStart(2,'0')}</span><span className="example-copy">{en.exampleNames[i]}<small>{f.groups>1?`${f.groups} ${en.groups.toLowerCase()}`:en[examplePreset(f)]}</small></span><Icon name="chevron" size={13}/></button>)}</nav>:<VariablePalette dataset={dataset} model={model} onAdd={name=>placeVariable('observed',undefined,name)}/>}
        <div className="library-bottom"><span className="small-orbit">↗</span><strong>{en.analysisTitle}</strong><p>{en.analysisHint}</p><div className="privacy-line"><span/>{en.privacy}</div></div>
      </aside>
      <section className="editor-pane" aria-label={en.syntax}>
        <div className="pane-heading"><div><span className="pane-eyebrow"><Icon name="code" size={16}/>{en.syntax}</span><p>{en.syntaxHint}</p></div><button className={`tool ${settings?'active':''}`} title={en.modelOptions} aria-label={en.modelOptions} onClick={()=>setSettings(s=>!s)}><Icon name="settings"/></button></div>
        <div className="editor-settings"><div className="segmented" role="group" aria-label={en.preset}>{(['sem','cfa','path'] as const).map(p=><button key={p} className={options.preset===p?'chosen':''} aria-pressed={options.preset===p} onClick={()=>setOptions(o=>({...o,preset:p}))}>{en[p]}</button>)}</div><label>{en.groups}<select value={options.groups} onChange={e=>{needsFit.current=true;setOptions(o=>({...o,groups:Number(e.target.value)}));}}>{Array.from({length:16},(_,i)=><option key={i} value={i+1}>{i+1}</option>)}</select></label></div>
        {options.preset==='path'&&<div className="preset-hint"><p>{en.pathHint}</p><button onClick={()=>showExample(pathExampleIndex)}>{en.pathExample}<Icon name="chevron" size={12}/></button></div>}
        {settings&&<div className="settings-panel"><label><input type="checkbox" checked={options.meanstructure} onChange={e=>setOptions(o=>({...o,meanstructure:e.target.checked}))}/>{en.meanstructure}</label><label><input type="checkbox" checked={options.fixedX} onChange={e=>setOptions(o=>({...o,fixedX:e.target.checked}))}/>{en.fixedX}</label><label><input type="checkbox" checked={includeDataset} onChange={e=>setIncludeDataset(e.target.checked)}/>{en.projectData.include}</label><label><input type="checkbox" checked={!!display.notation} onChange={e=>setDisplay(d=>({...d,notation:e.target.checked}))}/>{en.advanced.notation}</label><label>{en.advanced.varianceStyle}<select value={display.varianceStyle||'amos'} onChange={e=>setDisplay(d=>({...d,varianceStyle:e.target.value as 'amos'|'loops'}))}>{(['amos','loops'] as const).map(v=><option key={v} value={v}>{en.advanced[v]}</option>)}</select></label></div>}
        <Editor value={syntax} onChange={changeSyntax} onConvert={()=>setRevision(n=>n+1)} onUndo={()=>void undo(-1)} onRedo={()=>void undo(1)} error={errorKind==='syntax'?error:''} names={names} readOnly={restoring}/>
        {error&&<div className="syntax-error" role="alert"><div><Icon name="info" size={15}/><strong>{errorKind==='runtime'?en.runtimeFailed:errorKind==='layout'?en.layoutFailed:en.invalid}</strong></div><pre>{error}</pre>{scene&&<p>{en.lastValid}</p>}{errorKind==='runtime'&&<button className="button" onClick={async()=>{await runtime.current?.restart();setRevision(n=>n+1);}}>{en.retry}</button>}</div>}
        <div className="editor-footer"><div className={`sync-state ${error?'error':working?'waiting':''}`}><span/>{error?en.invalid:working?stage==='ready'?en.compiling:stageText:en.synced}</div><button className="button convert" onClick={()=>setRevision(n=>n+1)}>{en.convert}<kbd>{en.shortcut}</kbd></button></div>
      </section>
      <section className="canvas-pane" aria-label={en.canvas}>
        <div className="canvas-toolbar"><div className="canvas-caption">{en.canvas}<span>{viewScene?.model.analysisDisplay?en.workspace[annotation.mode]:en.noEstimates}</span></div><div className="canvas-actions"><label className="toggle-label" title={en.implicitHelp}><input type="checkbox" checked={display.implicit} onChange={e=>setDisplay(d=>({...d,implicit:e.target.checked}))}/><span className="switch"/>{en.implicit}</label><div className="segmented themes"><button className={display.theme==='journal'?'chosen':''} onClick={()=>setDisplay(d=>({...d,theme:'journal'}))}>{en.journal}</button><button className={display.theme==='presentation'?'chosen':''} onClick={()=>setDisplay(d=>({...d,theme:'presentation'}))}>{en.presentation}</button></div></div></div>
        {canAnnotate&&<div className="annotation-controls"><label>{en.workspace.annotation}<select value={annotation.mode} onChange={e=>setAnnotation(a=>({...a,mode:e.target.value as AnnotationOptions['mode']}))}>{(['specification','estimates','standardized'] as const).map(value=><option key={value} value={value}>{en.workspace[value]}</option>)}</select></label>{annotation.mode!=='specification'&&<label>{en.workspace.extra}<select value={annotation.extra} onChange={e=>setAnnotation(a=>({...a,extra:e.target.value as AnnotationOptions['extra']}))}>{(['none','se','pvalue','stars'] as const).map(value=><option key={value} value={value}>{value==='stars'?en.advanced.stars:en.workspace[value]}</option>)}</select></label>}<label><input type="checkbox" checked={annotation.rsquared} onChange={e=>setAnnotation(a=>({...a,rsquared:e.target.checked}))}/>{en.workspace.rsquared}</label></div>}
        {annotationError&&<div className="analysis-alert" role="alert">{annotationError}</div>}
        <ModelTools tool={tool} setTool={value=>{setTool(value);setLinkSource(undefined);}} name={newName} setName={setNewName} disabled={editingDisabled} onFormat={()=>void applyEdit({kind:'format'})} source={scene?.nodes.find(n=>n.id===linkSource)?.name}/>
        <div className="diagram-workspace"><div className="diagram-area">
          <Diagram scene={viewScene} display={display} selection={selection} setSelection={setSelection} onPositions={p=>void applyPositions(p)} snap={snap} viewport={viewport} setViewport={setViewport} tool={tool} pending={linkSource} selectedParameter={chosenParameter?viewScene?.model.table.find(r=>parameterKey(r)===parameterKey(chosenParameter))?.id:undefined} disabled={editingDisabled} onPlace={placeVariable} onEndpoint={endpoint} onParameter={parameterSelected} onDelete={deleteSelection} onEscape={()=>{setTool('select');setLinkSource(undefined);setSelectedParameter(undefined);setSelection([]);}}/>
          {!viewScene&&tool==='select'&&<div className="empty-state builder-empty"><div className={`empty-symbol ${working?'loading':''}`}><i/><b/><span/></div><h2>{working?stageText:en.emptyTitle}</h2><p>{working?en.startupHint:en.builder.emptyHint}</p></div>}
          {scene&&<>
            <div className="canvas-top-tools"><Tool label={en.builder.undo} icon="undo" disabled={!canUndo||working||restoring||fitting} onClick={()=>void undo(-1)}/><Tool label={en.builder.redo} icon="redo" disabled={!canRedo||working||restoring||fitting} onClick={()=>void undo(1)}/><span/><button className="reflow" onClick={reflow}><Icon name="refresh" size={15}/>{en.reflow}</button></div>
            <div className="zoom-tools"><button aria-label={en.zoomOut} onClick={()=>zoom(1.2)}>−</button><span>{Math.round((viewScene||scene).width/viewport.width*100)}%</span><button aria-label={en.zoomIn} onClick={()=>zoom(1/1.2)}>+</button><i/><Tool label={en.fit} icon="fit" onClick={()=>setViewport(fitBox(viewScene||scene))}/></div>
            <div className="canvas-legend"><span><i className="legend-box"/>{en.legendObserved}</span><span><i className="legend-ellipse"/>{en.legendLatent}</span><span><i className="legend-dash"/>{en.legendImplicit}</span></div>
            {selection.length>0&&<div className="selection-tools"><span>{selection.length} {en.selected}</span><button disabled={selection.length<2} title={en.alignX} onClick={()=>align('x')}>↕</button><button disabled={selection.length<2} title={en.alignY} onClick={()=>align('y')}>↔</button><button disabled={selection.length<3} title={en.distributeX} onClick={()=>align('x',true)}>┤├</button><button disabled={selection.length<3} title={en.distributeY} onClick={()=>align('y',true)}>⊟</button><Tool label={en.clearSelection} icon="close" onClick={()=>setSelection([])}/></div>}
          </>}
          {!scene&&(canUndo||canRedo)&&<div className="canvas-top-tools"><Tool label={en.builder.undo} icon="undo" disabled={!canUndo||working||restoring||fitting} onClick={()=>void undo(-1)}/><Tool label={en.builder.redo} icon="redo" disabled={!canRedo||working||restoring||fitting} onClick={()=>void undo(1)}/></div>}
        </div>{model&&(selectedNode||chosenParameter)&&<ModelInspector model={model} node={chosenParameter?undefined:selectedNode} parameter={chosenParameter} disabled={editingDisabled} readOnly={!!chosenParameter&&!model.table.some(r=>parameterKey(r)===parameterKey(chosenParameter))} onCommand={command=>void applyEdit(command)} onParameter={row=>{setSelectedParameter(parameterKey(row));setSelection([]);}} onClose={()=>{setSelectedParameter(undefined);setSelection([]);}}/>}</div>
        {viewScene?.diagnostics.length?<div className="layout-warning"><Icon name="info" size={15}/>{en.layoutNotice}</div>:null}
        <div className="canvas-footer"><div className="model-stats">{viewScene&&<><span><b>{viewScene.model.observed.length}</b>{en.observed}</span><span><b>{viewScene.model.latent.length}</b>{en.latent}</span><span><b>{viewScene.model.table.length}</b>{en.parameterCount}</span></>}</div><button className={`inspector-button ${inspector?'active':''}`} onClick={()=>setInspector(s=>s?undefined:'parameters')}><Icon name="table" size={15}/>{inspector?en.hideDetails:en.showDetails}<span>{inspector?'⌄':'⌃'}</span></button></div>
        {inspector&&viewScene&&<div className="inspector"><div className="inspector-tabs"><button className={inspector==='parameters'?'active':''} onClick={()=>setInspector('parameters')}>{en.parameters}<span>{viewScene.model.table.length}</span></button><button className={inspector==='script'?'active':''} onClick={()=>setInspector('script')}>{en.script}</button>{inspector==='parameters'?<input placeholder={en.searchParameters} value={filter} onChange={e=>setFilter(e.target.value)}/>:<button className="copy-button" onClick={()=>{void navigator.clipboard.writeText(inspectedScript).then(()=>notify(en.copied)).catch(()=>notify(en.copyFailed));}}><Icon name="copy" size={14}/>{en.copy}</button>}</div>
          {inspector==='parameters'?<div className="table-scroll"><table><thead><tr>{[en.lhs,en.operator,en.rhs,en.label,en.rowGroup,en.origin].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.lhs}</td><td className="relation">{r.op}</td><td>{r.rhs}</td><td>{parameterText(r)||en.free}</td><td>{r.group||'—'}</td><td><span className={`origin ${r.origin}`}>{parameterType(r)}</span></td></tr>)}</tbody></table></div>:<pre className="r-script">{inspectedScript}</pre>}
          {viewScene.model.warnings.length>0&&<details className="warnings"><summary>{en.warnings} ({viewScene.model.warnings.length})</summary>{viewScene.model.warnings.map((w,i)=><p key={i}>{w}</p>)}</details>}
        </div>}
      </section>
    </main>
    <footer className="statusbar"><span className={`r-status ${working?'busy':''}`}><i/>{scene?`lavaan ${scene.model.versions.lavaan}`:stageText}</span><span>{scene?en.dragHint:en.startupHint}</span><label><input type="checkbox" checked={snap} onChange={e=>setSnap(e.target.checked)}/>{en.snap}</label><span className="autosave" title={autosaveFailed?en.projectData.autosaveFailed:undefined}>{autosaveFailed?en.projectData.autosaveFailed:autosaved?<><Icon name="check" size={12}/>{en.autosave}</>:en.pending}</span></footer>
    {exportDialog&&viewScene&&<ExportDialog scene={viewScene} display={display} onClose={()=>setExportDialog(false)}/>}
    <input ref={file} hidden type="file" accept=".json,application/json" onChange={e=>{const f=e.target.files?.[0];if(f)void open(f);e.target.value='';}}/>
    {notice&&<div className="toast" role="status"><Icon name="check" size={16}/>{notice}</div>}
    {import.meta.env.DEV&&new URLSearchParams(location.search).has('verify')&&<div className="verification-status" role="status">{verificationStatus||en.verificationRunning}</div>}
  </div>{verifying&&<div className="verification-overlay" role="status"><strong>{verificationStatus}</strong><p>{en.advanced.verifying}</p></div>}</>;
}
