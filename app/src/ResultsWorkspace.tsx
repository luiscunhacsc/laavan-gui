import {useMemo,useState} from 'react';
import {numberText,parametersCsv,type AnalysisSnapshot,type Estimate} from './analysis';
import {downloadFile} from './project';
import en from './en.json';
const t=en.results;
export default function ResultsWorkspace({snapshot,stale,error,onModel,onNotice}:{snapshot?:AnalysisSnapshot;stale:boolean;error:string;onModel:()=>void;onNotice:(message:string)=>void}){
  const [tab,setTab]=useState<'parameters'|'fitMeasures'|'rSquared'|'script'>('parameters'),[filter,setFilter]=useState(''),[sort,setSort]=useState<{key:keyof Estimate;descending:boolean}>({key:'lhs',descending:false});
  const fit=snapshot?.result;
  const rows=useMemo(()=>{
    const source=fit?.parameters.filter(p=>`${p.lhs} ${p.op} ${p.rhs} ${p.label||''}`.toLowerCase().includes(filter.toLowerCase()))||[];
    return [...source].sort((a,b)=>{const x=a[sort.key],y=b[sort.key];const value=x==null?1:y==null?-1:typeof x==='number'&&typeof y==='number'?x-y:String(x).localeCompare(String(y));return sort.descending?-value:value;});
  },[fit,filter,sort]);
  const sortBy=(key:keyof Estimate)=>setSort(s=>({key,descending:s.key===key?!s.descending:false}));
  if(!fit||!snapshot)return <main className="results-workspace"><div className="results-empty">{error&&<div className="analysis-alert" role="alert">{error}</div>}<span className="data-eyebrow">{t.workspace}</span><h1>{t.title}</h1><p>{t.empty}</p><button className="button primary" onClick={onModel}>{t.toModel}</button></div></main>;
  const metric=(base:string)=>{
    const candidates=fit.estimator==='ML'? [base]:[`${base}.robust`,`${base}.scaled`,base];
    return candidates.map(name=>fit.measures.find(m=>m.name===name&&m.value!==null)).find(Boolean)||fit.measures.find(m=>m.name===base);
  };
  const name=(key:string)=>(t.measureNames as Record<string,string>)[key]||key;
  const headers:[keyof Estimate,string][]=[['lhs',en.lhs],['op',en.operator],['rhs',en.rhs],['group',en.group],['label',en.label],['est',t.estimate],['se',t.se],['z',t.z],['pvalue',t.pvalue],['ci.lower',t.ciLower],['ci.upper',t.ciUpper],['std.all',t.stdAll]];
  return <main className="results-workspace"><header className="workspace-heading"><div><span className="data-eyebrow">{t.workspace}</span><h1>{snapshot.datasetName}</h1><p>{fit.estimator} · {en.workspace[fit.missing as 'listwise'|'fiml'|'pairwise']} · lavaan {fit.versions.lavaan}</p></div><span className={`fit-badge ${!fit.converged||!fit.admissible?'problem':''}`}>{fit.converged?t.converged:t.notConverged}</span></header>
    {stale&&<div className="analysis-alert stale" role="status">{en.workspace.stale}</div>}
    {error&&<div className="analysis-alert" role="alert"><strong>{t.failed}</strong><p>{error}</p></div>}
    {fit.converged&&!fit.admissible&&<div className="analysis-alert" role="alert">{t.inadmissible}</div>}
    {fit.converged&&fit.measures.some(m=>m.name==='df'&&m.value===0)&&<div className="analysis-alert" role="note">{t.zeroDf}</div>}
    {fit.warnings.length>0&&<details className="import-warnings" open={!fit.admissible}><summary>{t.warnings} ({fit.warnings.length})</summary>{fit.warnings.map((w,i)=><p key={i}>{w}</p>)}</details>}
    <div className="results-body"><section className="results-main"><div className="fit-cards">{['chisq','cfi','tli','rmsea','srmr'].map(key=>{const m=metric(key);return <div className="fit-card" key={key}><span>{name(m?.name||key)}</span><b>{numberText(m?.value)}</b>{key==='rmsea'&&<small>{numberText(metric('rmsea.ci.lower')?.value)} – {numberText(metric('rmsea.ci.upper')?.value)}</small>}</div>;})}</div>
      <div className="result-tabs" role="tablist">{(['parameters','fitMeasures','rSquared','script'] as const).map(key=><button role="tab" aria-selected={tab===key} key={key} className={tab===key?'active':''} onClick={()=>setTab(key)}>{t[key]}</button>)}</div>
      <div className="result-content">
        {tab==='parameters'&&<><div className="result-table-tools"><input aria-label={t.search} placeholder={t.search} value={filter} onChange={e=>setFilter(e.target.value)}/><button className="button" onClick={()=>downloadFile(parametersCsv(fit),'parameters.csv','text/csv;charset=utf-8')}>{t.downloadCsv}</button></div><div className="result-table-scroll"><table><thead><tr>{headers.map(([key,label])=><th key={key} aria-sort={sort.key===key?sort.descending?'descending':'ascending':'none'}><button onClick={()=>sortBy(key)}>{label}{sort.key===key?(sort.descending?' ↓':' ↑'):''}</button></th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{headers.map(([key])=><td key={key}>{['lhs','op','rhs','label'].includes(key)?String(r[key]||''):key==='group'?r.group||1:key==='pvalue'&&r.pvalue!==null&&r.pvalue<.001?'< .001':numberText(r[key] as number|null)}</td>)}</tr>)}</tbody></table></div><p className="result-footnote">{t.precision}</p></>}
        {tab==='fitMeasures'&&<><p className="result-footnote">{t.robustHint}</p><div className="result-table-scroll"><table><thead><tr><th>{t.measure}</th><th>{t.value}</th><th>{t.note}</th></tr></thead><tbody>{fit.measures.filter(m=>fit.estimator!=='ML'||!m.name.endsWith('.scaled')&&!m.name.endsWith('.robust')).map(m=><tr key={m.name}><td>{name(m.name)}</td><td>{numberText(m.value)}</td><td>{m.value!==null?'':m.reason==='notConverged'?t.notConvergedReason:m.reason==='notAvailable'?t.notAvailable:m.reason}</td></tr>)}</tbody></table></div></>}
        {tab==='rSquared'&&<div className="result-table-scroll"><table><thead><tr><th>{en.observed} / {en.latent}</th><th>{en.group}</th><th>{en.rSquaredSymbol}</th></tr></thead><tbody>{fit.rsquared.map((r,i)=><tr key={i}><td>{r.name}</td><td>{r.group}</td><td>{numberText(r.value)}</td></tr>)}</tbody></table></div>}
        {tab==='script'&&<><div className="result-table-tools"><button className="button" onClick={()=>{void navigator.clipboard.writeText(fit.script).then(()=>onNotice(en.copied)).catch(()=>onNotice(en.copyFailed));}}>{en.copy}</button><button className="button" onClick={()=>downloadFile(fit.script,'analysis.R','text/plain')}>{t.downloadR}</button></div><pre className="result-script">{fit.script}</pre></>}
      </div>
    </section><aside className="analysis-summary"><span className="data-eyebrow">{t.snapshot}</span><dl><dt>{t.dataset}</dt><dd>{snapshot.datasetName}</dd><dt>{t.input}</dt><dd>{fit.inputCases}</dd><dt>{t.used}</dt><dd>{fit.nobs.join(' + ')}</dd><dt>{t.excluded}</dt><dd>{fit.excluded}</dd><dt>{en.workspace.estimator}</dt><dd>{fit.estimator}</dd><dt>{en.workspace.missing}</dt><dd>{en.workspace[fit.missing as 'listwise'|'fiml'|'pairwise']}</dd><dt>{t.version}</dt><dd>lavaan {fit.versions.lavaan}</dd></dl>{fit.ordered.length>0&&<><h3>{t.ordinalVariables}</h3><p>{fit.ordered.join(', ')}</p></>}<small>{new Date(snapshot.at).toLocaleString()}</small><button className="button" onClick={()=>downloadFile(JSON.stringify(snapshot,null,2),'analysis.json','application/json')}>{t.downloadJson}</button></aside></div>
  </main>;
}
