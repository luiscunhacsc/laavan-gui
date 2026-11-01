from pathlib import Path
from html import escape
import base64
import json
ROOT=Path(__file__).resolve().parents[1]
fixtures=json.loads((ROOT/'fixtures/models.json').read_text(encoding='utf-8'))
reports=json.loads((ROOT/'docs/phase-1-diagrams/summary.json').read_text())
cards=[]
for fixture,report in zip(fixtures,reports):
    name=fixture['id']
    cards.append(f'<article><header><h2>{escape(fixture["title"])}</h2><p>{report["nodes"]} nodes · {report["rows"]} parameter rows · automatic layout · no node/edge diagnostics</p></header><img src="phase-1-diagrams/{name}.svg" alt="{escape(fixture["title"])}"><p><a href="phase-1-diagrams/{name}.svg">Vector SVG</a> · <a href="phase-1-diagrams/{name}.png">PNG preview</a></p><details><summary>Lavaan syntax</summary><pre>{escape(fixture["syntax"])}</pre></details></article>')
html='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Forma · Phase 1 diagrams</title><style>body{background:#f2f5ee;color:#294133;font:16px/1.55 system-ui;margin:0}main{max-width:1400px;margin:auto;padding:40px}h1{font-size:36px;letter-spacing:-1px}article{background:white;border:1px solid #dce6d3;border-radius:9px;margin:30px 0;padding:26px}h2{font-size:20px}header p{font-size:12px;color:#7b9070}img{display:block;max-width:100%;max-height:1000px;object-fit:contain;margin:20px auto}a{color:#347252}pre{white-space:pre-wrap;background:#f7faf3;padding:20px}</style><main><h1>Forma · seven automatic diagrams</h1><p>Phase 1 output from the application layout engine, using lavaan parameter tables. No per-fixture node coordinates are supplied. Open the SVG or PNG at its original size to inspect details.</p>'+''.join(cards)+'</main></html>'
(ROOT/'docs/phase-1-gallery.html').write_text(html,encoding='utf-8')
parts=['<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1740" viewBox="0 0 1800 1740"><rect width="100%" height="100%" fill="#f2f5ee"/><g font-family="Arial,sans-serif" fill="#294133"><text x="30" y="44" font-size="30" font-weight="bold">Forma · seven automatic SEM diagrams</text><text x="30" y="76" font-size="17">Phase 1 · positions generated from lavaan parameter tables · full-size files in the gallery</text>']
for i,f in enumerate(fixtures):
    x,y,w,h=(30+(i%3)*590,105+(i//3)*600,565,575) if i<6 else (30,1310,1745,405)
    encoded=base64.b64encode((ROOT/f'docs/phase-1-diagrams/{f["id"]}.png').read_bytes()).decode()
    parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="9" fill="white" stroke="#dce6d3"/><text x="{x+16}" y="{y+30}" font-size="17" font-weight="bold">{i+1}. {escape(f["title"])}</text><image x="{x+8}" y="{y+45}" width="{w-16}" height="{h-55}" href="data:image/png;base64,{encoded}"/>')
parts.append('</g></svg>')
(ROOT/'docs/phase-1-overview.svg').write_text(''.join(parts),encoding='utf-8')
print('Built the Phase 1 gallery and overview.')
