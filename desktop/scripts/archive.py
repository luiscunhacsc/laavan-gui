"""Archive cross-packaged Electron apps, retaining POSIX modes and macOS framework symlinks."""
import hashlib
import json
import os
import posixpath
from pathlib import Path
import stat
import sys
import tarfile
import zipfile

folder, runtime, platform, arch, version, electron, build, report = sys.argv[1:9]
developer_signed = len(sys.argv) > 9 and sys.argv[9] == 'true'
folder, runtime = Path(folder).resolve(), Path(runtime).resolve()
label = {'win32': 'Windows', 'darwin': 'macOS', 'linux': 'Linux'}[platform]
stem = f'Forma-{version}-{label}-{arch}'
archive = folder.parent / (stem + ('.tar.gz' if platform == 'linux' else '.zip'))


def renamed(name):
    parts = name.split('/')
    for i, part in enumerate(parts):
        if part == 'Electron.app':
            parts[i] = 'Forma.app'
        elif part == 'Electron':
            parts[i] = 'Forma'
        elif part.startswith('Electron Helper'):
            parts[i] = 'Forma' + part[len('Electron'):]
    if platform != 'darwin' and name == 'electron':
        return 'Forma'
    if platform == 'win32' and name == 'electron.exe':
        return 'Forma.exe'
    return '/'.join(parts)


# Native extraction on Windows cannot reliably materialize POSIX symlinks or
# executable bits. Restore those from the checksum-verified official runtime.
modes, links = {}, {}
with zipfile.ZipFile(runtime) as source:
    for info in source.infolist():
        name = renamed(info.filename.rstrip('/'))
        mode = info.external_attr >> 16
        modes[name] = mode
        if stat.S_ISLNK(mode):
            links[name] = source.read(info)


def mode_for(path, relative):
    if relative in modes and modes[relative]:
        return modes[relative]
    if path.is_dir():
        return stat.S_IFDIR | 0o755
    executable = relative == 'Start-Forma.sh' or relative == 'Forma'
    return stat.S_IFREG | (0o755 if executable else 0o644)


entries = sorted(folder.rglob('*'))
if platform == 'linux':
    with tarfile.open(archive, 'w:gz', compresslevel=6) as target:
        for path in entries:
            relative = path.relative_to(folder).as_posix()
            if relative in links:
                continue
            info = target.gettarinfo(str(path), arcname=f'{stem}/{relative}')
            info.mode = mode_for(path, relative) & 0o7777
            info.uid = info.gid = 0
            info.uname = info.gname = ''
            if path.is_file():
                with path.open('rb') as content:
                    target.addfile(info, content)
            else:
                target.addfile(info)
        for relative, value in links.items():
            info = tarfile.TarInfo(f'{stem}/{relative}')
            info.type = tarfile.SYMTYPE
            info.linkname = value.decode('utf-8')
            info.mode = 0o777
            target.addfile(info)
else:
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as target:
        for path in entries:
            relative = path.relative_to(folder).as_posix()
            if relative in links or path.is_dir():
                continue
            info = zipfile.ZipInfo.from_file(path, arcname=f'{stem}/{relative}')
            info.create_system = 3
            info.external_attr = mode_for(path, relative) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            target.writestr(info, path.read_bytes())
        for relative, value in links.items():
            info = zipfile.ZipInfo(f'{stem}/{relative}')
            info.create_system = 3
            info.external_attr = (stat.S_IFLNK | 0o777) << 16
            target.writestr(info, value)

digest = hashlib.file_digest(archive.open('rb'), 'sha256').hexdigest()
asar_relative = 'Forma.app/Contents/Resources/app.asar' if platform == 'darwin' else 'resources/app.asar'
exe_relative = 'Forma.app/Contents/MacOS/Forma' if platform == 'darwin' else 'Forma.exe' if platform == 'win32' else 'Forma'
expected_asar = hashlib.file_digest((folder / asar_relative).open('rb'), 'sha256').hexdigest()
if platform == 'linux':
    with tarfile.open(archive, 'r:gz') as checked:
        assert checked.getmember(f'{stem}/{exe_relative}').mode & 0o111
        assert checked.getmember(f'{stem}/Start-Forma.sh').mode & 0o111
        assert hashlib.file_digest(checked.extractfile(f'{stem}/{asar_relative}'), 'sha256').hexdigest() == expected_asar
else:
    with zipfile.ZipFile(archive) as checked:
        assert checked.testzip() is None, 'Archive CRC failed'
        assert hashlib.sha256(checked.read(f'{stem}/{asar_relative}')).hexdigest() == expected_asar
        if platform == 'darwin':
            assert (checked.getinfo(f'{stem}/{exe_relative}').external_attr >> 16) & 0o111
            names = set(checked.namelist())
            def resolve_link(name):
                # Resolve links in directory prefixes as well as in the final component.
                for _ in range(30):
                    parts = name.split('/')
                    for i in range(1, len(parts) + 1):
                        prefix = '/'.join(parts[:i])
                        key = prefix.removeprefix(stem + '/')
                        if key in links:
                            name = posixpath.normpath(posixpath.join(posixpath.dirname(prefix), links[key].decode(), *parts[i:]))
                            break
                    else:
                        return name
                raise ValueError('Symlink cycle: ' + name)
            for relative, value in links.items():
                info = checked.getinfo(f'{stem}/{relative}')
                assert stat.S_ISLNK(info.external_attr >> 16)
                assert checked.read(info) == value
                resolved = resolve_link(f'{stem}/{relative}')
                assert resolved.startswith(stem + '/') and (resolved in names or any(name.startswith(resolved + '/') for name in names)), relative
result = {'platform':platform, 'arch':arch, 'version':version, 'electron':electron, 'build':build,
          'archive':archive.name, 'bytes':archive.stat().st_size, 'sha256':digest,
          'folder':folder.name, 'bundled': ['Chromium', 'Node.js', 'R/WebAssembly', 'lavaan', 'SEM tools', 'Excel/SPSS readers', 'fonts'],
          'requires':[], 'developerSigned':developer_signed, 'notarized':False,
          'runtimeSymlinks':len(links), 'runtimeTested':False, 'asarSha256':expected_asar,
          'archiveChecks':['application archive byte equality', 'executable permissions', 'runtime symlink targets', 'archive checksum']}
Path(report).write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result))
