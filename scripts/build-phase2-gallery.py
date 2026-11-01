from pathlib import Path
import json,html
from xml.sax.saxutils import escape
import base64
root=Path(__file__).resolve().parents[1]
directory=root/'docs/phase-2-diagrams'
items=json.loads((directory/'summary.json').read_text(encoding='utf-8'))
cards='\n'.join(f'<article id="{x["id"]}"><h2>{html.escape(x["title"])}</h2><p>{x["nodes"]} nodes · {x["rows"]} parameter rows · {"fitted with lavaan, std.all + SE + R²" if x["fitted"] else "model specification"}</p><a href="phase-2-diagrams/{x["id"]}.svg"><img src="phase-2-diagrams/{x["id"]}.png" alt="{html.escape(x["title"])}"></a><p><a href="phase-2-diagrams/{x["id"]}.svg">SVG</a> · <a href="phase-2-diagrams/{x["id"]}.png">PNG</a></p></article>' for x in items)
(root/'docs/phase-2-gallery.html').write_text(f'''<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Forma · Phase 2 review</title><style>body{{font-family:Arial,sans-serif;background:#f6f8f1;color:#35533d;margin:40px auto;max-width:1300px;padding:0 25px}}h1{{font-weight:500}}p{{font-size:13px;color:#819373;line-height:1.8}}a{{color:#4c7640}}article{{background:white;border:1px solid #dce6d1;border-radius:8px;padding:25px;margin:25px 0}}h2{{font-size:18px;font-weight:500}}img{{display:block;max-width:100%;max-height:850px;margin:25px auto;width:auto}}nav{{display:flex;gap:25px}}</style><nav><a href="../app/dist/">Open Forma</a><a href="phase-2.md">Phase 2 notes</a></nav><h1>Forma · Phase 2</h1><p>All seven fixed models, followed by three fitted diagrams. These images come from the production layout/SVG modules with no per-fixture positions. Fitted values and standard errors come from the native R reference run; the same adapter was checked in webR/WASM. Click a figure for its full-size SVG.</p>{cards}''',encoding='utf-8')
# An overview of newly generated scientific figures, not a product screenshot.
width=1600;cell_w=760;cell_h=420
parts=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{110+5*cell_h}" viewBox="0 0 {width} {110+5*cell_h}"><rect width="100%" height="100%" fill="#f6f8f1"/><text x="40" y="60" font-family="Arial" font-size="33" fill="#35533d">Forma · Phase 2 · seven models + three fitted analyses</text>']
for i,item in enumerate(items):
    x=30+(i%2)*800;y=105+(i//2)*cell_h
    parts.append(f'<rect x="{x}" y="{y}" width="{cell_w}" height="{cell_h-22}" rx="10" fill="white" stroke="#dae5d0"/>')
    title=item['title'].replace('Holzinger–Swineford three-factor CFA','Three-factor CFA').replace('Eight factors and forty indicators','8 factors · 40 indicators')
    parts.append(f'<text x="{x+18}" y="{y+32}" font-family="Arial" font-size="{17 if len(title)>65 else 21}" fill="#4d693e">{escape(title)}</text>')
    png=base64.b64encode((directory/(item['id']+'.png')).read_bytes()).decode()
    parts.append(f'<image x="{x+20}" y="{y+59}" width="{cell_w-40}" height="{cell_h-93}" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,{png}"/>')
(directory/'overview.svg').write_text(''.join(parts)+'</svg>',encoding='utf-8')
print('Wrote Phase 2 gallery and ten-figure SVG overview.')
