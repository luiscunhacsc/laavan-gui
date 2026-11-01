import json,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'.qa-python'))
import pymupdf as fitz
output=root/'evidence/phase-4/rendered';output.mkdir(exist_ok=True)
checks=[]
for path in (root/'docs/phase-4-diagrams').glob('*.pdf'):
    doc=fitz.open(path);assert len(doc)==1
    page=doc[0];text=page.get_text()
    assert '\ufffd' not in text and '\x00' not in text,(path,'missing glyph')
    scene=json.loads(path.with_suffix('.scene.json').read_text(encoding='utf-8'))
    for n in scene['nodes']:assert n['name'] in text,(path,n['name'])
    for b in page.get_text('dict')['blocks']:
        for line in b.get('lines',[]):
            for span in line['spans']:
                x0,y0,x1,y1=span['bbox']
                assert x0>=-1 and y0>=-1 and x1<=page.rect.width+1 and y1<=page.rect.height+1,(path,'clipped text',span['text'],span['bbox'],page.rect)
    assert len(page.get_drawings())>len(scene['nodes']),'PDF is not a vector drawing'
    page.get_pixmap(matrix=fitz.Matrix(2,2)).save(output/(path.stem+'.png'))
    checks.append({'file':path.name,'nodes':len(scene['nodes']),'textExtracts':True,'vectorPaths':len(page.get_drawings()),'noClippedText':True})
for path in (root/'evidence/phase-4/word-render').glob('*.pdf'):
    doc=fitz.open(path)
    for i,page in enumerate(doc):
        assert '\ufffd' not in page.get_text(),(path,i,'missing glyph')
        page.get_pixmap(matrix=fitz.Matrix(1.4,1.4)).save(output/(path.stem+f'-page-{i+1}.png'))
    checks.append({'file':path.name,'wordPages':len(doc),'rendered':True})
(root/'evidence/phase-4/export-inspection.json').write_text(json.dumps(checks,indent=2)+'\n',encoding='utf-8')
print(json.dumps(checks))
