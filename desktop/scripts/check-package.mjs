import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {extractFile, listPackage} from '@electron/asar';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../..', import.meta.url));
const pkg = JSON.parse(await fs.readFile(path.join(root, 'desktop/package.json'), 'utf8'));
const out = path.join(root, 'releases/desktop', `Forma-${pkg.version}`);
const downloads = JSON.parse(await fs.readFile(path.join(out, 'downloads.json'), 'utf8'));
const checks = [];
const runtimeChecks = [];
for (const target of downloads.targets) {
  const digest = createHash('sha256').update(await fs.readFile(path.join(out, target.archive))).digest('hex');
  assert.equal(digest, target.sha256, target.archive);
  const folder = path.join(out, target.folder);
  const app = path.join(folder, ...(target.platform === 'darwin' ? ['Forma.app', 'Contents', 'Resources'] : ['resources']), 'app.asar');
  const files = listPackage(app).map(name => name.replaceAll('\\', '/'));
  for (const name of ['/main.cjs', '/preload.cjs', '/server.cjs', '/web/index.html', '/web/engine/library.data']) assert.ok(files.includes(name), name);
  assert.ok(!files.some(file => file.includes('node_modules') || file.includes('tests/')));
  const manifest = JSON.parse(extractFile(app, path.join('web', 'assets-manifest.json')).toString());
  assert.equal(manifest.key, downloads.build);
  for (const asset of manifest.files) {
    const content = extractFile(app, path.join('web', asset.path));
    assert.equal(content.length, asset.bytes, asset.path);
    assert.equal(createHash('sha256').update(content).digest('hex'), asset.sha256, asset.path);
    if (asset.path.endsWith('.css')) assert.doesNotMatch(content.toString(), /@import\s+url\(['"]?https?:/);
  }
  const binary = await fs.readFile(path.join(folder, ...(target.platform === 'darwin' ? ['Forma.app', 'Contents', 'MacOS', 'Forma'] : [target.platform === 'win32' ? 'Forma.exe' : 'Forma'])));
  if (target.platform === 'win32') {
    assert.equal(binary.toString('ascii', 0, 2), 'MZ');
    assert.equal(binary.readUInt16LE(binary.readUInt32LE(0x3c) + 4), target.arch === 'x64' ? 0x8664 : 0xaa64);
  } else if (target.platform === 'linux') {
    assert.equal(binary.toString('ascii', 1, 4), 'ELF');
    assert.equal(binary.readUInt16LE(18), target.arch === 'x64' ? 62 : 183);
  } else {
    assert.equal(binary.readUInt32LE(0), 0xfeedfacf);
    assert.equal(binary.readUInt32LE(4), target.arch === 'x64' ? 0x01000007 : 0x0100000c);
    assert.ok(target.runtimeSymlinks > 0);
  }
  checks.push({target:`${target.platform}-${target.arch}`, assets:manifest.files.length, arch:target.arch, archiveHash:true});
  const runtimeReport = await fs.readFile(path.join(root, 'evidence/desktop', `smoke-${target.platform}-${target.arch}.json`), 'utf8').then(JSON.parse).catch(() => undefined);
  if (runtimeReport?.passed && runtimeReport.asarSha256 === target.asarSha256) runtimeChecks.push({target:`${target.platform}-${target.arch}`, checks:runtimeReport.checks});
}
await fs.mkdir(path.join(root, 'evidence/desktop'), {recursive:true});
const report = {passed:true, build:downloads.build, checks, runtimeChecks,
  pendingNativeRuntime:downloads.targets.map(target => `${target.platform}-${target.arch}`).filter(target => !runtimeChecks.some(checked => checked.target === target)),
  developerSigned:false, notarized:false,
  scope:'All packages: archive checksums, contents, asset hashes, executable architectures. Actual native execution is verified only for the targets listed in runtimeChecks.'};
await fs.writeFile(path.join(root, 'evidence/desktop/package-check.json'), JSON.stringify(report, null, 2) + '\n');
await fs.writeFile(path.join(out, 'VALIDATION.json'), JSON.stringify(report, null, 2) + '\n');
await fs.copyFile(path.join(root, 'desktop/README.md'), path.join(out, 'README.md'));
console.log(JSON.stringify(report));
