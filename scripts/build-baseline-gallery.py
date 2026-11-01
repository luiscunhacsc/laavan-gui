from pathlib import Path
import json
from html import escape
ROOT=Path(__file__).resolve().parents[1]
models=json.loads((ROOT/'fixtures/models.json').read_text(encoding='utf-8'))
parts=['<!doctype html><html lang="en"><meta charset="utf-8"><title>Upstream lavaan layout baseline</title><style>body{font:16px/1.5 system-ui;margin:40px;color:#172b36}img{max-width:100%;max-height:900px;object-fit:contain;object-position:left}article{padding:24px;margin:24px 0;border:1px solid #ddd}pre{white-space:pre-wrap}</style><h1>Upstream lavaan 0.7-3 layout baseline</h1><p>Automatic positions, no fitting, no manual rearrangement. These are upstream outputs, distinct from the specified reference studies. An SVG render succeeding does not establish semantic completeness.</p>']
for mode in ['syntax','table','residuals']:
    statuses=json.loads((ROOT/f'evidence/lavaan-baseline/{mode}/status.json').read_text())
    parts.append(f'<h2>{mode}</h2><p>{sum(s["ok"] for s in statuses.values())} of 7 produced SVG without an R error.</p>')
    for f in models:
        status=statuses[f['id']]
        parts.append(f'<article><h3>{escape(f["title"])}</h3>')
        if status['ok']:
            parts.append(f'<img src="../evidence/lavaan-baseline/{mode}/{f["id"]}.svg" alt="{escape(f["title"])}">')
        else:parts.append(f'<pre>{escape(status["error"])}</pre>')
        parts.append('</article>')
parts.append('</html>')
(ROOT/'docs/lavaan-baseline.html').write_text(''.join(parts),encoding='utf-8')
print('Built upstream baseline gallery.')
