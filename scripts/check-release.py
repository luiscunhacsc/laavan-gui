"""Verify the portable archive and its actual loopback HTTP launcher."""
import hashlib
import json
from pathlib import Path
import subprocess
import socket
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
import zipfile

root=Path(__file__).resolve().parents[1]
version=json.loads((root/'app/package.json').read_text(encoding='utf-8'))['version']
folder=root/'releases'/f'Forma-{version}'
archive=folder.parent/(folder.name+'.zip')
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    prefix=folder.name+'/'
    names=z.namelist()
    assert all(name.startswith(prefix) and '..' not in Path(name).parts for name in names)
    checks=z.read(prefix+'SHA256SUMS.txt').decode('utf-8').splitlines()
    for line in checks:
        digest,name=line.split('  ',1)
        content=z.read(prefix+name)
        assert hashlib.sha256(content).hexdigest()==digest,name
        assert (folder/name).read_bytes()==content,name
    assert len(names)==len(checks)+1
    for name in ['serve.py','Start-Forma.cmd','Start-Forma.command','Start-Forma.sh','README.txt',
                 'user-guide.md','VALIDATION.json','THIRD-PARTY-NOTICES.md',
                 'licenses/webR-and-R-GPL-3.md','web/engine/library.data']:
        assert prefix+name in names,name
    for name in ['Start-Forma.command','Start-Forma.sh']:
        info=z.getinfo(prefix+name)
        assert info.create_system==3 and ((info.external_attr>>16)&0o111)==0o111,name
        assert b'\r' not in z.read(prefix+name),name
digest=hashlib.sha256(archive.read_bytes()).hexdigest()
assert archive.with_suffix('.zip.sha256').read_text(encoding='utf-8').split()[0]==digest
manifest=json.loads((folder/'web/assets-manifest.json').read_text(encoding='utf-8'))
with socket.socket() as probe:
    probe.bind(('127.0.0.1',0))
    port=probe.getsockname()[1]
base=f'http://127.0.0.1:{port}/'
with (root/'evidence/release/portable-server.log').open('wb') as log:
    server=subprocess.Popen([sys.executable,str(folder/'serve.py'),'--no-open','--port',str(port)],stdout=log,stderr=log,
                            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform=='win32' else 0)
    try:
        def fetch(path):
            with urlopen(base+path,timeout=20) as response:
                assert response.status==200,path
                assert response.headers['Cache-Control']=='no-cache'
                assert response.headers['X-Content-Type-Options']=='nosniff'
                return response.read(),response.headers
        for attempt in range(50):
            assert server.poll() is None,'Portable server exited; inspect portable-server.log'
            try:
                body,_=fetch('release.json')
                break
            except URLError:
                time.sleep(.1)
        else:
            raise AssertionError('Portable server did not start')
        release=json.loads(body)
        assert release['version']==version and release['build']==manifest['key']
        for file in manifest['files']:
            content,headers=fetch(file['path'])
            assert len(content)==file['bytes'] and hashlib.sha256(content).hexdigest()==file['sha256'],file['path']
            if file['path'].endswith('.wasm'):
                assert headers.get_content_type()=='application/wasm'
            if file['path'].endswith(('.mjs','.js')):
                assert headers.get_content_type()=='text/javascript'
        for path in ['__qa','__qa-advanced','__fixtures/labelled.sav']:
            try:
                fetch(path)
                raise AssertionError('Development endpoint present: '+path)
            except HTTPError as e:
                assert e.code==404
        try:
            urlopen(Request(base,data=b'private dataset',method='POST'),timeout=10)
            raise AssertionError('Portable server accepts POST')
        except HTTPError as e:
            assert e.code==501
        content,_=fetch('sw.js')
        assert manifest['key'].encode() in content
    finally:
        server.terminate()
        server.wait(timeout=10)
result={'passed':True,'archive':str(archive.relative_to(root)),'archiveBytes':archive.stat().st_size,
        'build':manifest['key'],
        'sha256':digest,'files':len(checks)+1,'httpAssets':len(manifest['files']),
        'checks':['ZIP CRC','every file checksum and expanded-byte equality','archive checksum',
                  'Windows, Linux and macOS launchers, guide and license notices',
                  'executable Unix launchers with LF line endings','actual Python loopback server',
                  'all application asset bytes over HTTP','WebAssembly/module MIME types',
                  'no POST or development QA endpoints'],'browserAutomation':False}
(root/'evidence/release/portable-check.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result))
