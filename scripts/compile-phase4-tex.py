import json,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[1]
exe=root/'.qa-tools/tectonic/tectonic.exe'
results=[]
for source in list((root/'docs/phase-4-diagrams').glob('*.tex'))+list((root/'evidence/phase-4').glob('*-tables.tex')):
    out=root/'evidence/phase-4'/('tex-tables' if source.name.endswith('-tables.tex') else 'tex-diagrams');out.mkdir(exist_ok=True)
    completed=subprocess.run([str(exe),'--untrusted','--keep-logs','--outdir',str(out),str(source)],cwd=root,capture_output=True,text=True,encoding='utf-8',errors='replace')
    (out/(source.stem+'-command.log')).write_text(completed.stdout+completed.stderr,encoding='utf-8')
    log=(out/(source.stem+'.log')).read_text(encoding='utf-8',errors='replace') if (out/(source.stem+'.log')).exists() else ''
    result={'file':source.name,'passed':completed.returncode==0,'overfull':log.count('Overfull'),'missingCharacters':log.count('Missing character:')}
    results.append(result);print(json.dumps(result),flush=True)
(root/'evidence/phase-4/tex-compilation.json').write_text(json.dumps(results,indent=2)+'\n',encoding='utf-8')
assert all(r['passed'] and not r['overfull'] and not r['missingCharacters'] for r in results),'TeX errors or layout warnings need review'
