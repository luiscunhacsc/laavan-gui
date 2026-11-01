import type {AnalysisOptions} from './analysis';
import en from './en.json';
export default function AdvancedOptions({value,onChange,disabled}:{value:AnalysisOptions;onChange:(value:AnalysisOptions)=>void;disabled:boolean}){
 const t=en.advanced,set=(patch:Partial<AnalysisOptions>)=>onChange({...value,...patch});
 return <details className="advanced-options"><summary>{t.options}</summary><div className="advanced-grid">
  <label><input type="checkbox" checked={!!value.modificationIndices} disabled={disabled} onChange={e=>set({modificationIndices:e.target.checked})}/>{t.modifications}</label>
  <label><input type="checkbox" checked={!!value.reliability} disabled={disabled} onChange={e=>set({reliability:e.target.checked})}/>{t.reliability}</label>
  <label><input type="checkbox" checked={!!value.invariance} disabled={disabled} onChange={e=>set({invariance:e.target.checked})}/>{t.invariance}</label>
  <label><input type="checkbox" checked={(value.bootstrap||0)>0} disabled={disabled} onChange={e=>set({bootstrap:e.target.checked?2000:0})}/>{t.bootstrap}</label>
  {(value.bootstrap||0)>0&&<><label>{t.replicates}<input disabled={disabled} type="number" min="100" max="10000" step="100" value={value.bootstrap} onChange={e=>set({bootstrap:Number(e.target.value)})}/></label><label>{t.seed}<input disabled={disabled} type="number" min="1" max="2147483647" value={value.seed??20261101} onChange={e=>set({seed:Number(e.target.value)})}/></label></>}
  <label>{t.confidence}<select disabled={disabled} value={value.confidence??.95} onChange={e=>set({confidence:Number(e.target.value)})}><option value="0.9">90%</option><option value="0.95">95%</option><option value="0.99">99%</option></select></label>
 </div><p>{t.optionsHint}</p>{value.invariance&&<p>{t.invarianceHint}</p>}{(value.bootstrap||0)>0&&<p>{t.bootstrapHint}</p>}</details>;
}
