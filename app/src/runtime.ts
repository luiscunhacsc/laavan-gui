import compilerSource from './r/compile.R?raw';
import analysisSource from './r/analysis.R?raw';
import editSource from './r/edit.R?raw';
import advancedSource from './r/advanced.R?raw';
import {normalizeModel,type CompileResult,type Options} from './model';
import en from './en.json';
import {sourceQuery,cleanTypes,type DatasetState} from './dataset-source';
import type {Dataset} from './analysis';
import {openEngine} from './engine';
type RuntimeStage='runtime'|'lavaan'|'readers'|'ready';
export class LavaanRuntime {
  private runtime:any;
  private opening?:Promise<void>;
  private generation=0;
  private queue:Promise<unknown>=Promise.resolve();
  private readers=new Set<string>();
  private datasetSnapshot?:DatasetState;
  constructor(private report:(stage:RuntimeStage)=>void){}
  async init(){
    if(this.opening)return this.opening;
    this.opening=this.open();
    return this.opening;
  }
  private async open(){
    const generation=this.generation;
    this.report('runtime');
    const r=await openEngine();
    if(generation!==this.generation){await r.close();throw new Error('Runtime restarted');}
    this.runtime=r;
    await r.evalRVoid('options(useFancyQuotes = FALSE)');
    // Consume console events so worker output does not accumulate.
    (async()=>{for await(const _ of r.stream()){/* diagnostics are returned by the adapter */}})().catch(()=>{});
    this.report('lavaan');
    const version=await r.evalRString('as.character(packageVersion("lavaan"))');
    if(version!=='0.7.3')throw new Error(en.runtimeVersion.replace('{version}',version));
    await r.evalRVoid(compilerSource);
    await r.evalRVoid(editSource);
    await r.evalRVoid(analysisSource);
    await r.evalRVoid(advancedSource);
    if(this.datasetSnapshot){
      const snapshot=this.datasetSnapshot;
      await this.installReader(snapshot.query);
      const restored=await this.execute({action:'restore',source:snapshot.query,types:snapshot.types},snapshot.binary);
      if(!restored.ok)throw new Error(restored.message);
    }
    if(generation!==this.generation)throw new Error('Runtime restarted');
    this.report('ready');
  }
  compile(text:string,options:Options):Promise<CompileResult>{
    const generation=this.generation;
    const run=async()=>{
      await this.init();
      if(generation!==this.generation)throw new Error('Runtime restarted');
      // Values enter through a file read by trusted R code, never string interpolation.
      const input=JSON.stringify({text,options});
      await this.runtime.FS.writeFile('/home/web_user/sem-input.json',new TextEncoder().encode(input));
      const json=await this.runtime.evalRString(`local({
        input <- jsonlite::fromJSON('/home/web_user/sem-input.json')
        sem_compile_json(input$text, jsonlite::toJSON(input$options, auto_unbox=TRUE))
      })`);
      const result=JSON.parse(json) as CompileResult;
      return result.ok?normalizeModel(result):result;
    };
    const result=this.queue.then(run,run);
    this.queue=result.catch(()=>{});
    return result;
  }
  private async installReader(query:Record<string,unknown>){
    if(query.action==='fit'&&(query.analysis as {reliability?:boolean})?.reliability&&!this.readers.has('semTools')){
      this.report('readers');
      if(await this.runtime.evalRString('as.character(packageVersion("semTools"))')!=='0.5.10')throw new Error(en.errors['advanced.semToolsVersion']);
      this.readers.add('semTools');this.report('ready');
    }
    const source=query.action==='restore'?query.source as Record<string,unknown>:query;
    const pkg=source.action==='sheets'||['xls','xlsx'].includes(String(source.format))?'readxl':['sav','zsav'].includes(String(source.format))?'haven':undefined;
    if(pkg&&!this.readers.has(pkg)){this.readers.add(pkg);}
  }
  private async execute(query:Record<string,unknown>,binary?:Uint8Array){
    const input={...query},runtime=this.runtime;
    const source=query.action==='restore'?query.source as Record<string,unknown>:query;
    const path=`/home/web_user/import.${String(source.format||'xlsx')}`;
    if(binary){if(query.action==='restore')input.source={...source,path};else input.path=path;await runtime.FS.writeFile(path,binary);}
    await runtime.FS.writeFile('/home/web_user/analysis-input.json',new TextEncoder().encode(JSON.stringify(input)));
    try{
      const json=await runtime.evalRString("forma_request_json(jsonlite::fromJSON('/home/web_user/analysis-input.json', simplifyVector=FALSE))");
      return JSON.parse(json);
    }finally{if(binary)try{await runtime.FS.unlink(path);}catch{/* The worker may have been stopped. */}}
  }
  request<T>(query:Record<string,unknown>,binary?:Uint8Array):Promise<T>{
    const generation=this.generation;
    const run=async()=>{
      await this.init();if(generation!==this.generation)throw new Error('Runtime restarted');
      await this.installReader(query);
      const result=await this.execute(query,binary);
      if(generation!==this.generation)throw new Error('Runtime restarted');
      if(!result.ok)throw new Error(result.message);
      if(['import','example','covariance'].includes(String(query.action)))this.datasetSnapshot={query:{...query},binary,types:[]};
      if(query.action==='type')this.datasetSnapshot?.types.push({...query});
      if(query.action==='restore')this.datasetSnapshot={query:{...query.source as Record<string,unknown>},binary,types:[...query.types as Record<string,unknown>[]]};
      if(query.action==='clear')this.datasetSnapshot=undefined;
      if(result.model)result.model=normalizeModel(result.model);
      return result as T;
    };
    const result=this.queue.then(run,run);this.queue=result.catch(()=>{});return result;
  }
  snapshotDataset():DatasetState|undefined{const s=this.datasetSnapshot;return s?{query:{...s.query},binary:s.binary,types:s.types.map(t=>({...t}))}:undefined;}
  restoreDataset(state:DatasetState):Promise<{dataset:Dataset;warnings:string[]}>{
    const source=sourceQuery(state.query),types=cleanTypes(state.types);
    if(source.action==='import'&&!state.binary?.length)throw new Error('badDatasetAttachment');
    return this.request({action:'restore',source,types},state.binary);
  }
  async discardDataset(){this.datasetSnapshot=undefined;if(this.runtime)await this.request({action:'clear'});}
  async restart(){this.generation++;await this.runtime?.close();this.runtime=undefined;this.opening=undefined;this.queue=Promise.resolve();this.readers.clear();}
}
