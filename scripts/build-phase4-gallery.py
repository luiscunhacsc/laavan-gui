from pathlib import Path
from xml.sax.saxutils import escape
import base64,json,html
root=Path(__file__).resolve().parents[1];directory=root/'docs/phase-4-diagrams'
items=json.loads((directory/'summary.json').read_text(encoding='utf-8'))
cards=[]
for x in items:
    name=html.escape(x['id']);title=html.escape(x['title'])
    links=' · '.join(f'<a href="phase-4-diagrams/{name}.{suffix}">{label}</a>' for suffix,label in [('svg','SVG'),('png','PNG'),('pdf','PDF'),('tex','TikZ'),('lavaan','Syntax')])
    cards.append(f'<article><h2>{title}</h2><p>{x["nodes"]} nodes · automatic placement with production modules</p><a href="phase-4-diagrams/{name}.svg"><img src="phase-4-diagrams/{name}.png" alt="{title}" loading="lazy"></a><p>{links}</p></article>')
reports=' · '.join(f'<a href="../evidence/phase-4/{key}.docx">{label} (Word)</a> · <a href="../evidence/phase-4/{key}-tables.tex">LaTeX</a>' for key,label in [('single','CFA reliability and MI'),('invariance','Invariance sequence'),('bootstrap','Bootstrap mediation')])
(root/'docs/phase-4-gallery.html').write_text('''<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Forma · Phase 4 review</title><style>body{font-family:Arial,sans-serif;background:#f6f8f1;color:#35533d;margin:40px auto;max-width:1300px;padding:0 25px}h1{font-weight:500}p{font-size:14px;color:#65785b;line-height:1.8}a{color:#3b6835}article{background:white;border:1px solid #dce6d1;border-radius:8px;padding:25px;margin:25px 0}h2{font-size:18px;font-weight:500}img{display:block;max-width:100%;max-height:900px;margin:25px auto;width:auto}nav{display:flex;gap:25px}</style><nav><a href="../app/dist/">Open Forma</a><a href="phase-4.md">Phase 4 notes</a></nav><h1>Forma · Phase 4</h1><p>The seven fixed models, three fitted diagrams, Greek parameter notation, RAM variance loops and a fitted two-group CFA. No fixture-specific positions are supplied. PDF preserves vectors and embeds fonts; the SVG downloads include fonts. Dense models use larger physical pages to keep their text legible. The fitted diagrams use std.all estimates, R² and significance stars; those displays do not change the canonical table.</p><p>Public/synthetic analysis reports: '''+reports+'</p>'+''.join(cards),encoding='utf-8')
parts=[f'<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="{105+((len(items)+1)//2)*420}"><rect width="100%" height="100%" fill="#f6f8f1"/><text x="35" y="60" font-family="Arial" font-size="31" fill="#35533d">Forma · Phase 4 · models and publication exports</text>']
for i,item in enumerate(items):
    x=25+(i%2)*800;y=100+(i//2)*420;title=item['title'].replace('Holzinger–Swineford three-factor CFA','Three-factor CFA')
    png=base64.b64encode((directory/(item['id']+'.png')).read_bytes()).decode()
    parts.append(f'<rect x="{x}" y="{y}" width="760" height="398" rx="9" fill="white" stroke="#d9e3ce"/><text x="{x+18}" y="{y+32}" font-family="Arial" font-size="18" fill="#3e6539">{escape(title)}</text><image x="{x+20}" y="{y+55}" width="720" height="320" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,{png}"/>')
(directory/'overview.svg').write_text(''.join(parts)+'</svg>',encoding='utf-8')
print(f'Wrote gallery with {len(items)} diagrams and three report downloads.')
