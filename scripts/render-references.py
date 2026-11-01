"""Phase 0 visual studies: lavaan tables + specified fixture positions, no syntax parser.

This is intentionally NOT the production automatic layout algorithm. Drawable rows
are tracked, so a diagram cannot silently lose a model parameter.
"""
import json
import math
from pathlib import Path
from html import escape

ROOT=Path(__file__).resolve().parents[1]
TABLES=json.loads((ROOT/'evidence/native/parameter-tables.json').read_text(encoding='utf-8'))
EN=json.loads((ROOT/'fixtures/reference.en.json').read_text(encoding='utf-8'))
OUT=ROOT/'docs/references'
OUT.mkdir(parents=True,exist_ok=True)
def array(value): return value if isinstance(value,list) else [value]
def parameter(row):
    if not row['free'] and row.get('ustart') is not None: return f"{row['ustart']:g}"
    return row.get('label') or EN['free']

class Diagram:
    def __init__(self,f,width,height):
        self.f=f; self.w=width; self.h=height; self.nodes={}; self.edges=[]; self.labels=[]; self.shapes=[]; self.covered=set()
    def node(self,name,x,y,kind='observed',label=None):
        w,h=(112,56) if kind=='latent' else ((34,34) if kind=='residual' else (86,42))
        self.nodes[name]={'x':x,'y':y,'w':w,'h':h,'kind':kind,'label':label or name}
    def text(self,x,y,text,size=14,color='#1e2930',anchor='middle'):
        self.labels.append(f'<text x="{x:.2f}" y="{y:.2f}" text-anchor="{anchor}" font-size="{size}" fill="{color}" paint-order="stroke" stroke="white" stroke-width="6" stroke-linejoin="round">{escape(str(text))}</text>')
    def edge(self,d,implicit=False,cov=False):
        color='#6c7479' if implicit else '#1a2329'
        dash='stroke-dasharray="6 4"' if implicit else ''
        start='marker-start="url(#back)"' if cov else ''
        self.edges.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="1.7" {dash} {start} marker-end="url(#arrow)"/>')
    def port(self,name,tx,ty):
        n=self.nodes[name]; dx,dy=tx-n['x'],ty-n['y']
        if n['kind'] in ('latent','residual'):
            scale=1/math.sqrt((dx/(n['w']/2))**2+(dy/(n['h']/2))**2)
        else:
            scale=min(n['w']/2/abs(dx) if dx else math.inf,n['h']/2/abs(dy) if dy else math.inf)
        return n['x']+dx*scale,n['y']+dy*scale
    def connect(self,a,b,label='',implicit=False,bend=None,label_pos=None):
        n,m=self.nodes[a],self.nodes[b]
        x1,y1=self.port(a,m['x'],m['y']); x2,y2=self.port(b,n['x'],n['y'])
        if bend is None:
            self.edge(f'M {x1},{y1} L {x2},{y2}',implicit)
            length=math.hypot(x2-x1,y2-y1)
            lx=x1*.45+x2*.55+(y2-y1)/length*12
            ly=y1*.45+y2*.55-abs(x2-x1)/length*12+4
        else:
            bx,by=bend
            x1,y1=self.port(a,bx,by); x2,y2=self.port(b,bx,by)
            self.edge(f'M {x1},{y1} Q {bx},{by} {x2},{y2}',implicit)
            lx,ly=(x1+2*bx+x2)/4,(y1+2*by+y2)/4-10
        if label:self.text(*(label_pos or (lx,ly)),label,color='#626e75' if implicit else '#1e2930')
    def cov(self,a,b,row,lane=0,side='left'):
        n,m=self.nodes[a],self.nodes[b]
        if side=='bottom':
            x1,y1=self.port(a,n['x'],self.h); x2,y2=self.port(b,m['x'],self.h)
            by=lane
            self.edge(f'M {x1},{y1} C {x1},{by} {x2},{by} {x2},{y2}',row['user']==0,True)
            self.text((x1+x2)/2,(y1+6*by+y2)/8-10,parameter(row),color='#626e75' if row['user']==0 else '#1e2930')
        else:
            x1,y1=self.port(a,0,n['y']); x2,y2=self.port(b,0,m['y'])
            self.edge(f'M {x1},{y1} C {lane},{y1} {lane},{y2} {x2},{y2}',row['user']==0,True)
            self.text((x1+6*lane+x2)/8-8,(y1+y2)/2,parameter(row),color='#626e75')
    def finish(self):
        for n in self.nodes.values():
            x,y,w,h=n['x'],n['y'],n['w'],n['h']
            if n['kind']=='observed':
                shape=f'<rect x="{x-w/2}" y="{y-h/2}" width="{w}" height="{h}"/>'
            else:shape=f'<ellipse cx="{x}" cy="{y}" rx="{w/2}" ry="{h/2}"/>'
            dash='stroke-dasharray="4 3"' if n['kind']=='residual' else ''
            self.shapes.append(f'<g fill="white" stroke="#1a2329" stroke-width="1.6" {dash}>{shape}</g><text x="{x}" y="{y+5}" text-anchor="middle" font-size="{13 if n["kind"]=="residual" else 17}">{escape(n["label"])}</text>')
        defs='<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#27343c"/></marker><marker id="back" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 10 0 L 0 5 L 10 10 z" fill="#27343c"/></marker></defs>'
        title=escape(self.f['title'])
        header=f'<text x="36" y="42" font-size="24" font-weight="600">{title}</text><text x="36" y="71" font-size="13" fill="#586a74">{escape(EN["diagramNote"])}</text>'
        footer=f'<text x="36" y="{self.h-30}" font-size="13" fill="#586a74">{escape(EN["legend"])}</text>'
        return f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" height="{self.h}" viewBox="0 0 {self.w} {self.h}" role="img" aria-labelledby="title"><title id="title">{title}</title>{defs}<rect width="100%" height="100%" fill="white"/><g font-family="Arial, Helvetica, sans-serif" fill="#172b36">{header}{"".join(self.edges)}{"".join(self.shapes)}{"".join(self.labels)}{footer}</g></svg>'

def build(f):
    id=f['id']; positions={}; residuals={}; bends={}; covside='bottom'; covlanes={}
    if id.startswith('01'):
        width,height=820,1160
        for k,factor in enumerate(['visual','textual','speed']):
            positions[factor]=(250,270+300*k)
            for j in range(3):
                name=f'x{3*k+j+1}'; positions[name]=(520,180+300*k+90*j); residuals[name]=(690,positions[name][1])
        covside='left'; covlanes={('visual','textual'):100,('visual','speed'):20,('textual','speed'):100}
    elif id.startswith('02'):
        width,height=1880,1160
        positions.update(ind60=(270,270),dem60=(910,390),dem65=(1510,270))
        for j in range(3):positions[f'x{j+1}']=(130+140*j,530)
        for j in range(8):positions[f'y{j+1}']=(680+140*j+(40 if j>=4 else 0),530)
        for name,(x,y) in list(positions.items()):
            if name.startswith(('x','y')):residuals[name]=(x,665)
        residuals.update(dem60=(1050,390),dem65=(1510,150))
        covlanes={('y1','y5'):850,('y2','y4'):770,('y2','y6'):950,('y3','y7'):1030,('y4','y8'):1110,('y6','y8'):770}
    elif id.startswith('03'):
        width,height=1000,700
        positions.update(X=(170,410),M=(490,240),Y=(810,410))
        residuals.update(M=(490,130),Y=(810,540))
    elif id.startswith('04'):
        width,height=1190,1080
        positions['G']=(180,510)
        for k in range(3):
            name=f'F{k+1}'; positions[name]=(510,240+270*k); residuals[name]=(510,positions[name][1]-105)
            for j in range(3):
                item=f'x{3*k+j+1}';positions[item]=(850,150+270*k+90*j);residuals[item]=(1030,positions[item][1])
    elif id.startswith('05'):
        width,height=1500,700
        for g in (1,2):
            offset=(g-1)*730
            positions[f'{g}:F']=(offset+210,330)
            for j in range(3):positions[f'{g}:x{j+1}']=(offset+450,200+130*j);residuals[f'{g}:x{j+1}']=(offset+610,200+130*j)
    elif id.startswith('06'):
        width,height=1130,850
        positions.update(X1=(210,260),X2=(210,590),M=(590,420),Y=(940,420))
        residuals.update(M=(470,420),Y=(940,560))
        covside='left';covlanes={('X1','X2'):40}
    else:
        width,height=4460,860
        for k in range(8):
            factor=f'F{k+1}';cx=340+540*k;positions[factor]=(cx,270)
            if k:residuals[factor]=(cx,150)
            for j in range(5):
                name=f'x{k*5+j+1:02d}';positions[name]=(cx-200+100*j,520);residuals[name]=(positions[name][0],660)
    d=Diagram(f,width,height)
    latent=set(array(f['latent'])); rows=f['table']
    for name,(x,y) in positions.items():
        base=name.split(':')[-1];d.node(name,x,y,'latent' if base in latent else 'observed',base)
    # Derive disturbances from the semantic graph, never by scanning syntax text.
    endogenous={r['rhs'] for r in rows if r['op']=='=~'}|{r['lhs'] for r in rows if r['op'] in ('~','<~')}
    residual_names={}; counters={'e':0,'d':0}
    for name,(x,y) in residuals.items():
        base=name.split(':')[-1]
        assert base in endogenous
        prefix='d' if base in latent else 'e';counters[prefix]+=1
        rn=f'error:{name}';residual_names[name]=rn;d.node(rn,x,y,'residual',f'{prefix}{counters[prefix]}')
        d.connect(rn,name,'1',True)
    covnum=0
    for row in rows:
        op=row['op'];rid=row['id'];g=row['group'];prefix=f'{g}:' if f['groups']>1 and g else ''
        a,b=prefix+row['lhs'],prefix+row['rhs']
        if op in ('=~','~','<~'):
            src,dst=(a,b) if op=='=~' else (b,a)
            # This study identifies default marker loadings for these fixed fixtures.
            implicit=row['user']==0 or (op=='=~' and row['free']==0 and f['groups']==1)
            bend,label_pos=bends.get((src,dst),(None,None))
            d.connect(src,dst,parameter(row),implicit,bend,label_pos)
        elif op=='~~':
            if a==b:
                n=d.nodes[residual_names.get(a,a)]
                target=d.nodes[a]
                vertical=a in residual_names and abs(n['y']-target['y'])>abs(n['x']-target['x'])
                vx,vy=(n['x'],n['y']-36 if n['y']<target['y'] else n['y']+42) if vertical else (n['x'],n['y']-38)
                d.text(vx,vy,f'{EN["variance"]} {parameter(row)}',12,'#626e75')
            else:
                lane=covlanes.get((row['lhs'],row['rhs']),850+covnum*40)
                d.cov(residual_names.get(a,a),residual_names.get(b,b),row,lane,covside);covnum+=1
        elif op=='~1':
            n=d.nodes[a];d.text(n['x'],n['y']+44,f'{EN["mean"]} {parameter(row)}',12)
        elif op==':=':
            d.text(44,height-155+(rid-7)*28,f'{row["lhs"]} := {row["rhs"]}',17,anchor='start')
        elif op=='==':
            assert f['groups']>1
        else:raise ValueError(f'Unsupported reference row: {op}')
        d.covered.add(rid)
    if f['groups']>1:
        for g in (1,2):d.text(30+(g-1)*730,125,f'{EN["group"]} {g}',19,anchor='start')
        d.text(45,height-105,EN['constraints'],16,anchor='start')
    assert d.covered=={r['id'] for r in rows}
    return d

cards=[];manifest=[]
for f in TABLES.values():
    diagram=build(f);svg=diagram.finish();path=OUT/f'{f["id"]}.svg';path.write_text(svg,encoding='utf-8')
    manifest.append({'id':f['id'],'parameterRows':len(f['table']),'coveredRows':len(diagram.covered),
        'nodes':len(diagram.nodes),'width':diagram.w,'height':diagram.h,'placement':'specified reference positions'})
    cards.append(f'<article id="{f["id"]}"><h2>{escape(f["title"])}</h2><div class="figure"><img src="references/{f["id"]}.svg" alt="{escape(f["title"])}"></div><p><a href="references/{f["id"]}.svg">{EN["openSVG"]}</a> · <a href="references/{f["id"]}.png">{EN["openPNG"]}</a></p><details><summary>{EN["syntax"]}</summary><pre>{escape(f["syntax"])}</pre></details></article>')
html=f'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{EN["galleryTitle"]}</title><style>body{{margin:0;background:#f2f5f7;color:#172b36;font:16px/1.55 system-ui,sans-serif}}main{{max-width:1200px;padding:40px;margin:auto}}h1{{font-size:36px;letter-spacing:-1px}}article{{margin:32px 0;padding:28px;background:white;border:1px solid #dce3e7;border-radius:10px}}h2{{font-size:22px}}.figure{{overflow:auto;border:1px solid #edf0f2}}img{{display:block;max-width:100%;height:auto}}a{{color:#08776c}}pre{{white-space:pre-wrap;background:#f4f7f8;padding:20px}}p{{max-width:90ch}}</style><main><h1>{EN["galleryTitle"]}</h1><p>{EN["galleryIntro"]}</p><p>{EN["detail"]}</p>{"".join(cards)}</main></html>'
(ROOT/'docs/gallery.html').write_text(html,encoding='utf-8')
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(f'Rendered {len(manifest)} SVG studies; all parameter rows accounted for.')
