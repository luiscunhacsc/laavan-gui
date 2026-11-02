"""Create the local portable release from an already verified application build."""
import hashlib
import json
from pathlib import Path
import shutil
import zipfile

root = Path(__file__).resolve().parents[1]
version = json.loads((root/'app/package.json').read_text(encoding='utf-8'))['version']
target = root/'releases'/f'Forma-{version}'
target.mkdir(parents=True, exist_ok=True)
shutil.copytree(root/'app/dist', target/'web', dirs_exist_ok=True)
for source, name in [('scripts/release-serve.py','serve.py'),
                     ('scripts/release-start.cmd','Start-Forma.cmd'),
                     ('scripts/release-start.command','Start-Forma.command'),
                     ('docs/release-readme.txt','README.txt'),
                     ('docs/user-guide.md','user-guide.md'),
                     ('evidence/release/validation.json','VALIDATION.json')]:
    shutil.copy2(root/source, target/name)
licenses = target/'licenses'
licenses.mkdir(exist_ok=True)
shutil.copy2(root/'app/public/engine/LICENSE-webR.md', licenses/'webR-and-R-GPL-3.md')
shutil.copy2(root/'scripts/patch-webr-windows.mjs', licenses/'webR-Windows-Node-patch.mjs')
font_license = root/'app/public/fonts/OFL.txt'
if font_license.exists():
    shutil.copy2(font_license, licenses/'Noto-Sans-OFL.txt')

# Preserve the original package descriptions and license files from the exact
# immutable R library image used by the application.
engine = root/'app/public/engine'
metadata = json.loads((engine/'library.metadata.json').read_text(encoding='utf-8'))
binary = (engine/'library.data').read_bytes()
descriptions = {}
for f in metadata['files']:
    path = Path(f['filename'].lstrip('/'))
    if path.name=='DESCRIPTION' or path.name.upper().startswith(('LICENSE','LICENCE','COPYING','NOTICE')):
        destination = licenses/'R-packages'/path
        destination.parent.mkdir(parents=True, exist_ok=True)
        contents = binary[f['start']:f['end']]
        destination.write_bytes(contents)
        if path.name=='DESCRIPTION' and len(path.parts)==2:
            descriptions[path.parts[0]] = contents.decode('utf-8', errors='replace')

lines = ['# Bundled software notices', '',
         'These notices describe third-party software. They do not assign a license to Forma.', '',
         '## R/WebAssembly runtime', '',
         'webR 0.6.0, including R 4.6.0, is distributed under GNU GPL version 3.',
         'The original runtime licensing text is in licenses/webR-and-R-GPL-3.md.',
         'Sources: https://github.com/r-wasm/webr/tree/v0.6.0 and https://cran.r-project.org/src/base/R-4/.',
         'The bundled Node compatibility change is reproduced in licenses/webR-Windows-Node-patch.mjs.',
         'It corrects Windows file-URL imports; it does not change browser execution or statistical calculations.', '',
         '## R packages', '',
         'Original DESCRIPTION and available license files are in licenses/R-packages/.',
         'The exact installed versions and binary hashes are in web/engine/manifest.json.', '',
         '| Package | Version | License as declared by the package |',
         '| --- | --- | --- |']
manifest = json.loads((engine/'manifest.json').read_text(encoding='utf-8'))
for name, version_ in sorted(manifest['packages'].items()):
    fields = {}
    for line in descriptions.get(name,'').splitlines():
        if ':' in line and not line.startswith((' ', '\t')):
            k,v = line.split(':',1)
            fields[k] = v.strip()
    lines.append(f"| {name} | {version_} | {fields.get('License','See original DESCRIPTION').replace('|','/')} |")
lines.extend(['', 'Package source archives: https://cran.r-project.org/src/contrib/ and its Archive/ subdirectory.', '',
              '## JavaScript dependencies', '',
              'The following production dependency versions come from app/package-lock.json.',
              'Available original license/notice files are included under licenses/JavaScript/.', '',
              '| Package | Version | License |', '| --- | --- | --- |'])
lock = json.loads((root/'app/package-lock.json').read_text(encoding='utf-8'))
for location, info in sorted(lock['packages'].items()):
    if not location or info.get('dev'):
        continue
    source = root/'app'/location
    package = json.loads((source/'package.json').read_text(encoding='utf-8'))
    name = package['name']
    license_ = package.get('license', info.get('license','See original package'))
    lines.append(f"| {name} | {info['version']} | {str(license_).replace('|','/')} |")
    for item in source.iterdir():
        if item.is_file() and item.name.upper().startswith(('LICENSE','LICENCE','COPYING','NOTICE')):
            destination = licenses/'JavaScript'/name/info['version']/item.name
            destination.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(item,destination)
lines.extend(['', '## Fonts', '',
              'Noto Sans: SIL Open Font License 1.1. Original license in web/fonts/OFL.txt.',
              'Sources: https://github.com/notofonts/latin-greek-cyrillic.', ''])
(target/'THIRD-PARTY-NOTICES.md').write_text('\n'.join(lines),encoding='utf-8')

entries = sorted(p for p in target.rglob('*') if p.is_file() and p.name!='SHA256SUMS.txt')
(target/'SHA256SUMS.txt').write_text(''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(target).as_posix()}\n' for p in entries), encoding='utf-8')
archive = target.parent/(target.name+'.zip')
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=7) as output:
    for p in sorted(target.rglob('*')):
        if p.is_file():
            name=(Path(target.name)/p.relative_to(target)).as_posix()
            if p.suffix=='.command':
                info=zipfile.ZipInfo.from_file(p,name)
                info.create_system=3
                info.external_attr=(0o100755<<16)
                info.compress_type=zipfile.ZIP_DEFLATED
                output.writestr(info,p.read_bytes(),compresslevel=7)
            else:
                output.write(p,name)
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
archive.with_suffix('.zip.sha256').write_text(f'{digest}  {archive.name}\n',encoding='utf-8')
print(json.dumps({'archive':str(archive.relative_to(root)),'bytes':archive.stat().st_size,'sha256':digest,'files':len(entries)+1}))
