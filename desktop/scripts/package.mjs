import {packager} from '@electron/packager';
import {downloadArtifact} from '@electron/get';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';

const desktop = fileURLToPath(new URL('..', import.meta.url));
const root = path.resolve(desktop, '..');
const pkg = JSON.parse(await fs.readFile(path.join(desktop, 'package.json'), 'utf8'));
const appPkg = JSON.parse(await fs.readFile(path.join(root, 'app/package.json'), 'utf8'));
if (pkg.version !== appPkg.version) throw new Error('Desktop and web application versions must match');
const options = process.argv.slice(2);
const targetOption = options.find(value => value.startsWith('--target='));
if (options.some(value => value !== '--all' && !value.startsWith('--target='))) throw new Error('Use --all or --target=win32-x64 (also win32-arm64, darwin-x64, darwin-arm64, linux-x64, linux-arm64)');
const supported = ['win32-x64', 'win32-arm64', 'darwin-x64', 'darwin-arm64', 'linux-x64', 'linux-arm64'];
const targets = options.includes('--all') ? supported : [targetOption?.slice(9) || `${process.platform}-${process.arch}`];
for (const target of targets) if (!supported.includes(target)) throw new Error(`Unsupported target: ${target}`);

// Only a built, sealed web distribution is copied into the native app.
const web = path.join(root, 'app/dist');
const build = JSON.parse(await fs.readFile(path.join(web, 'release.json'), 'utf8'));
if (build.version !== pkg.version || build.application !== 'Forma') throw new Error('Build the current app first: cd app && npm run build');
const stageRoot = path.join(desktop, '.stage');
const stage = path.join(stageRoot, 'app');
if (path.dirname(stage) !== stageRoot || !stage.startsWith(root + path.sep)) throw new Error('Unsafe staging path');
await fs.rm(stage, {recursive:true, force:true});
await fs.mkdir(stage, {recursive:true});
for (const file of ['main.cjs', 'preload.cjs', 'server.cjs']) await fs.copyFile(path.join(desktop, file), path.join(stage, file));
await fs.writeFile(path.join(stage, 'package.json'), JSON.stringify({name:pkg.name, productName:pkg.productName, version:pkg.version, description:pkg.description, author:pkg.author, main:pkg.main}, null, 2) + '\n');
await fs.cp(web, path.join(stage, 'web'), {recursive:true});
await fs.copyFile(path.join(root, 'app/public/icon-512.png'), path.join(stage, 'icon.png'));

// Reuse the project's existing vector icon; PNG-backed ICO/ICNS need no native icon tools.
const require = createRequire(path.join(root, 'app/package.json'));
const {Resvg} = require('@resvg/resvg-js');
const svg = await fs.readFile(path.join(root, 'app/public/icon.svg'), 'utf8');
const png256 = new Resvg(svg, {fitTo:{mode:'width', value:256}}).render().asPng();
const png512 = new Resvg(svg, {fitTo:{mode:'width', value:512}}).render().asPng();
const assets = path.join(stageRoot, 'icons');
await fs.mkdir(assets, {recursive:true});
const ico = Buffer.alloc(22); ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4); ico.writeUInt16LE(1, 10); ico.writeUInt16LE(32, 12); ico.writeUInt32LE(png256.length, 14); ico.writeUInt32LE(22, 18);
await fs.writeFile(path.join(assets, 'forma.ico'), Buffer.concat([ico, png256]));
const icns = Buffer.alloc(16); icns.write('icns'); icns.writeUInt32BE(16 + png512.length, 4); icns.write('ic09', 8); icns.writeUInt32BE(8 + png512.length, 12);
await fs.writeFile(path.join(assets, 'forma.icns'), Buffer.concat([icns, png512]));

const out = path.join(root, 'releases/desktop', `Forma-${pkg.version}`);
const cache = path.join(desktop, '.cache/electron');
const work = path.join(desktop, '.work');
await fs.mkdir(work, {recursive:true});
await fs.mkdir(out, {recursive:true});
const results = [];
for (const target of targets) {
  const [platform, arch] = target.split('-');
  console.log(`Packaging ${target} with Electron ${pkg.devDependencies.electron}...`);
  const [folder] = await packager({dir:stage, out, name:'Forma', appBundleId:'org.forma.sem', executableName:'Forma',
    platform, arch, electronVersion:pkg.devDependencies.electron, appVersion:pkg.version, buildVersion:pkg.version,
    icon:platform === 'darwin' ? path.join(assets, 'forma.icns') : platform === 'win32' ? path.join(assets, 'forma.ico') : undefined,
    asar:true, prune:false, overwrite:true, tmpdir:work, download:{cacheRoot:cache},
    ...(platform === 'darwin' && process.platform === 'darwin' && process.env.FORMA_MAC_SIGN_IDENTITY ?
      {osxSign:{identity:process.env.FORMA_MAC_SIGN_IDENTITY, continueOnError:false}} : {})});
  for (const [source, name] of [['desktop/README.md', 'README.md'], ['docs/user-guide.md', 'user-guide.md'],
    ['releases/Forma-' + pkg.version + '/THIRD-PARTY-NOTICES.md', 'THIRD-PARTY-NOTICES.md']]) {
    await fs.copyFile(path.join(root, source), path.join(folder, name));
  }
  await fs.cp(path.join(root, 'releases/Forma-' + pkg.version + '/licenses'), path.join(folder, 'licenses'), {recursive:true});
  if (platform === 'linux') {
    await fs.writeFile(path.join(folder, 'Start-Forma.sh'), '#!/bin/sh\nFORMA_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd) || exit 1\nexec "$FORMA_DIR/Forma" "$@"\n', {mode:0o755});
  }
  const runtimeZip = await downloadArtifact({version:pkg.devDependencies.electron, artifactName:'electron', platform, arch, cacheRoot:cache});
  const reportFile = path.join(out, `${target}.json`);
  execFileSync(process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3'),
    [path.join(desktop, 'scripts/archive.py'), folder, runtimeZip, platform, arch, pkg.version, pkg.devDependencies.electron, build.build, reportFile,
      String(platform === 'darwin' && process.platform === 'darwin' && !!process.env.FORMA_MAC_SIGN_IDENTITY && process.env.FORMA_MAC_SIGN_IDENTITY !== '-')], {stdio:'inherit'});
  const report = JSON.parse(await fs.readFile(reportFile, 'utf8'));
  results.push(report);
}
// Retain previously built targets so platform-specific invocations can be combined.
const reports = [];
for (const name of await fs.readdir(out)) if (/^(win32|darwin|linux)-(x64|arm64)\.json$/.test(name)) {
  const value = JSON.parse(await fs.readFile(path.join(out, name), 'utf8'));
  if (value.build === build.build) reports.push(value);
}
await fs.writeFile(path.join(out, 'downloads.json'), JSON.stringify({application:'Forma', version:pkg.version, build:build.build, targets:reports}, null, 2) + '\n');
await fs.writeFile(path.join(out, 'SHA256SUMS.txt'), reports.map(item => `${item.sha256}  ${item.archive}\n`).join(''));
await fs.copyFile(path.join(desktop, 'README.md'), path.join(out, 'README.md'));
console.log(JSON.stringify({out, targets:results.map(item => item.archive)}));
