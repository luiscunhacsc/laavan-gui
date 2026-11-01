from pathlib import Path
import base64
import json
from html import escape
ROOT=Path(__file__).resolve().parents[1]
en=json.loads((ROOT/'fixtures/reference.en.json').read_text(encoding='utf-8'))
models=json.loads((ROOT/'fixtures/models.json').read_text(encoding='utf-8'))
manifest=json.loads((ROOT/'docs/references/manifest.json').read_text())
parts=[f'<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1740" viewBox="0 0 1800 1740"><rect width="100%" height="100%" fill="#f2f5f7"/><g font-family="Arial,sans-serif" fill="#172b36"><text x="30" y="44" font-size="30" font-weight="bold">{escape(en["overviewTitle"])}</text><text x="30" y="76" font-size="17">{escape(en["overviewNote"])}</text>']
for i,(f,m) in enumerate(zip(models,manifest)):
    x,y,w,h=(30+(i%3)*590,105+(i//3)*600,565,575) if i<6 else (30,1310,1745,405)
    encoded=base64.b64encode((ROOT/f'docs/references/{f["id"]}.png').read_bytes()).decode()
    parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="9" fill="white" stroke="#dce3e7"/><text x="{x+16}" y="{y+30}" font-size="17" font-weight="bold">{i+1}. {escape(f["title"])}</text><image x="{x+8}" y="{y+45}" width="{w-16}" height="{h-55}" href="data:image/png;base64,{encoded}"/>')
parts.append('</g></svg>')
(ROOT/'docs/references-overview.svg').write_text(''.join(parts),encoding='utf-8')
print('Built seven-model overview.')
