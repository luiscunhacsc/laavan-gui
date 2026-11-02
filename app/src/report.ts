import {numberText,type AnalysisSnapshot} from './analysis';
import en from './en.json';
export interface ReportTable {title:string;headers:string[];rows:string[][];note?:string}
export const pText=(value:number|null|undefined)=>value==null?'—':value<.001?'< .001':numberText(value).replace(/^0\./,'.');
export function reportTables(snapshot:AnalysisSnapshot):ReportTable[]{
 const f=snapshot.result,t=en.results,a=en.advanced,group=(n:number)=>n===0?a.global:f.groupLabels?.[n-1]||String(n);
 const tables:ReportTable[]=[{title:t.parameters,headers:[en.group,en.lhs,en.operator,en.rhs,en.label,t.estimate,t.se,t.z,t.pvalue,`${Math.round((f.confidence??.95)*100)}% ${a.ciLower}`,`${Math.round((f.confidence??.95)*100)}% ${a.ciUpper}`,t.stdAll],rows:f.parameters.map(p=>[group(p.group??1),p.lhs,p.op,p.rhs,p.label||'',numberText(p.est),numberText(p.se),numberText(p.z),pText(p.pvalue),numberText(p['ci.lower']),numberText(p['ci.upper']),numberText(p['std.all'])]),note:`${a.reportNote} ${Math.round((f.confidence??.95)*100)}% CI. ${f.bootstrap?a.bootstrapNote:''}`},
 {title:t.fitMeasures,headers:[t.measure,t.value],rows:f.measures.map(m=>[(t.measureNames as Record<string,string>)[m.name]||m.name,m.name.startsWith('pvalue')?pText(m.value):numberText(m.value)]),note:t.robustHint},
 {title:t.rSquared,headers:[en.group,en.lhs,en.rSquaredSymbol],rows:f.rsquared.map(r=>[group(r.group),r.name,numberText(r.value)])}];
 if(f.invariance)tables.push({title:a.invariance,headers:[a.stage,'χ²','df','p','CFI','RMSEA','SRMR',a.deltaCfi,a.deltaRmsea,a.difference,a.differenceDf,a.differenceP,a.cfiType,a.rmseaType],rows:f.invariance.map(r=>[a[r.stage],numberText(r.chisq),numberText(r.df,0),pText(r.pvalue),numberText(r.cfi),numberText(r.rmsea),numberText(r.srmr),numberText(r.deltaCfi),numberText(r.deltaRmsea),numberText(r.difference?.chisq),numberText(r.difference?.df,0),pText(r.difference?.pvalue),r.cfiType,r.rmseaType]),note:[a.invarianceNote,...f.invariance.flatMap(r=>r.difference?.method||[]),...f.invariance.flatMap(r=>r.differenceError?[r.differenceError]:[])].join(' ')});
 if(f.modifications?.status==='ok')tables.push({title:a.modifications,headers:[en.group,en.lhs,en.operator,en.rhs,a.mi,a.epc,a.sepc],rows:f.modifications.rows.map(r=>[group(r.group||1),r.lhs,r.op,r.rhs,numberText(r.mi),numberText(r.epc),numberText(r['sepc.all'])]),note:a.modificationNote+(f.modifications.truncated?' '+a.truncated:'')});
 if(f.reliability?.status==='ok'){
  tables.push({title:a.reliability,headers:[en.group,a.factor,a.omega,a.ave],rows:f.reliability.scales.map(r=>[group(r.group),r.factor,numberText(r.omega),numberText(r.ave)]),note:`${a.reliabilityNote} semTools ${f.reliability.version}.`});
  tables.push({title:a.pairs,headers:[en.group,a.first,a.second,a.htmt,a.correlation,a.sqrtAveFirst,a.sqrtAveSecond,a.fornell],rows:f.reliability.pairs.map(r=>[group(r.group),r.first,r.second,numberText(r.htmt2),numberText(r.correlation),numberText(r.sqrtAveFirst),numberText(r.sqrtAveSecond),r.fornellLarcker==null?'—':r.fornellLarcker?a.yes:a.no]),note:a.fornellNote});
 }
 if(f.bootstrap)tables.push({title:a.bootstrapSummary,headers:[a.requested,a.completed,a.failed,a.nonadmissible,a.seed,a.confidence],rows:[[f.bootstrap.requested,f.bootstrap.completed,f.bootstrap.failed,f.bootstrap.nonadmissible,f.bootstrap.seed,`${f.bootstrap.confidence*100}%`].map(String)],note:a.bootstrapNote});
 return tables.filter(t=>t.rows.length);
}
export function reportNotes(snapshot:AnalysisSnapshot,stale=false){const f=snapshot.result;return [stale?en.advanced.staleReport:'',`${snapshot.datasetName} · ${f.estimator} · ${f.missing} · N = ${f.nobs.join(' + ')} · lavaan ${f.versions.lavaan}`,!f.converged?en.results.notConverged:!f.admissible?en.results.inadmissible:'',...f.warnings,f.reliability&&f.reliability.status!=='ok'?(en.advanced as Record<string,string>)[f.reliability.status]||en.advanced.unavailable:'',f.modifications&&f.modifications.status!=='ok'?f.modifications.message||en.advanced.unavailable:''].filter(Boolean);}
export function texEscape(text:string){
 const greek:Record<string,string>={λ:'lambda',β:'beta',γ:'gamma',ψ:'psi',θ:'theta',φ:'phi',μ:'mu',α:'alpha',τ:'tau',χ:'chi',ω:'omega',Δ:'Delta',ρ:'rho'};
 return text.replace(/[\\{}$&#_%~^]/g,c=>({'\\':'\\textbackslash{}','{':'\\{','}':'\\}','$':'\\$','&':'\\&','#':'\\#','_':'\\_','%':'\\%','~':'\\textasciitilde{}','^':'\\textasciicircum{}'}[c]!))
  .replace(/([λβγψθφματχωΔρ])([₀₁₂₃₄₅₆₇₈₉]*(?:,[₀₁₂₃₄₅₆₇₈₉]+)?)/g,(_,c:string,s:string)=>`$\\${greek[c]}${s?'_{'+[...s].map(d=>d===','?',':'₀₁₂₃₄₅₆₇₈₉'.indexOf(d)).join('')+'}':''}$`)
  .replace(/[₀₁₂₃₄₅₆₇₈₉]+/g,s=>`$_{${[...s].map(d=>'₀₁₂₃₄₅₆₇₈₉'.indexOf(d)).join('')}}$`).replaceAll('²','$^{2}$').replaceAll('√','$\\surd$');
}
export function reportLatex(snapshot:AnalysisSnapshot,stale=false){
 const tables=reportTables(snapshot);
 return `% Compile with LuaLaTeX or XeLaTeX.\n\\documentclass[11pt]{article}\n\\usepackage[margin=1in]{geometry}\n\\usepackage{fontspec,booktabs,longtable,pdflscape}\n\\setmainfont{texgyretermes-regular.otf}[BoldFont=texgyretermes-bold.otf,ItalicFont=texgyretermes-italic.otf]\n\\begin{document}\n\\section*{${texEscape(en.advanced.report)}}\n${reportNotes(snapshot,stale).map(n=>texEscape(n)+'\\par\n').join('')}\n`+
 tables.map((t,i)=>`${t.headers.length>7?'\\begin{landscape}\n':''}\\small\n\\begin{longtable}{${t.headers.map((_,j)=>j<Math.min(4,t.headers.length-1)?'l':'r').join('')}}\n\\caption{${texEscape(t.title)}}\\\\\n\\toprule\n${t.headers.map(texEscape).join(' & ')} \\\\\n\\midrule\n\\endfirsthead\n\\multicolumn{${t.headers.length}}{l}{${texEscape(en.advanced.table)} ${i+1} (${texEscape(t.title)})} \\\\\n\\toprule\n${t.headers.map(texEscape).join(' & ')} \\\\\n\\midrule\n\\endhead\n${t.rows.map(r=>r.map(texEscape).join(' & ')+' \\\\').join('\n')}\n\\bottomrule\n\\end{longtable}\n${t.note?'\\noindent '+texEscape(en.advanced.note+' '+t.note)+'\\par\n':''}${t.headers.length>7?'\\end{landscape}\n':''}`).join('\n')+'\\end{document}\n';
}
