"""Create a reviewable static artifact from an explicit public fixture whitelist."""
from pathlib import Path
from shutil import copyfile
import json
from html import escape
ROOT=Path(__file__).resolve().parents[1]
dest=ROOT/'dist'
files=['spike/index.html','spike/spike.js','spike/en.json','spike/run.R',
       'fixtures/models.json','docs/gallery.html']
files += [str(p.relative_to(ROOT)) for p in (ROOT/'docs/references').glob('*') if p.suffix in ('.svg','.png','.json')]
for relative in files:
    target=dest/relative;target.parent.mkdir(parents=True,exist_ok=True)
    copyfile(ROOT/relative,target)
title=json.loads((ROOT/'spike/en.json').read_text())['title']
(dest/'index.html').write_text(f'<!doctype html><html lang="en"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=spike/"><title>{escape(title)}</title><a href="spike/">{escape(title)}</a></html>',encoding='utf-8')
print(f'Static research harness packaged: {dest}')
