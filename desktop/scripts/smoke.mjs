import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';

const root = fileURLToPath(new URL('../..', import.meta.url));
const pkg = JSON.parse(await fs.readFile(path.join(root, 'desktop/package.json'), 'utf8'));
const out = path.join(root, 'releases/desktop', `Forma-${pkg.version}`);
const folder = path.join(out, `Forma-${process.platform}-${process.arch}`);
const binary = path.join(folder, ...(process.platform === 'darwin' ? ['Forma.app', 'Contents', 'MacOS', 'Forma'] : [process.platform === 'win32' ? 'Forma.exe' : 'Forma']));
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'Forma standalone smoke '));
const report = path.join(temporary, 'smoke.json');
const environment = {...process.env, FORMA_SMOKE_REPORT:report, FORMA_SMOKE_PROFILE:path.join(temporary, 'profile')};
// Developer terminals hosted by Electron can export this; it would launch Node instead of the desktop app.
delete environment.ELECTRON_RUN_AS_NODE;
delete environment.ELECTRON_NO_ASAR;
delete environment.NODE_OPTIONS;
const child = spawn(binary, [], {windowsHide:true, env:environment, stdio:['ignore', 'pipe', 'pipe']});
let log = '';
child.stdout.on('data', data => { log += data; });
child.stderr.on('data', data => { log += data; });
const timer = setTimeout(() => child.kill(), 180000);
try {
  const exit = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
  const value = JSON.parse(await fs.readFile(report, 'utf8').catch(() => { throw new Error(`No smoke report. Exit ${exit}: ${log}`); }));
  const appArchive = path.join(folder, ...(process.platform === 'darwin' ? ['Forma.app', 'Contents', 'Resources'] : ['resources']), 'app.asar');
  value.asarSha256 = createHash('sha256').update(await fs.readFile(appArchive)).digest('hex');
  value.build = JSON.parse(await fs.readFile(path.join(root, 'app/dist/release.json'), 'utf8')).build;
  await fs.mkdir(path.join(root, 'evidence/desktop'), {recursive:true});
  await fs.writeFile(path.join(root, 'evidence/desktop', `smoke-${process.platform}-${process.arch}.json`), JSON.stringify({...value, log}, null, 2) + '\n');
  if (!value.passed || exit !== 0) throw new Error(JSON.stringify(value));
  const manifestPath = path.join(out, 'downloads.json');
  const downloads = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const targetFile = path.join(out, `${process.platform}-${process.arch}.json`);
  const target = JSON.parse(await fs.readFile(targetFile, 'utf8'));
  if (target.asarSha256 === value.asarSha256) {
    target.runtimeTested = true;
    await fs.writeFile(targetFile, JSON.stringify(target, null, 2) + '\n');
    downloads.targets = downloads.targets.filter(item => item.platform !== target.platform || item.arch !== target.arch).concat(target);
  }
  await fs.writeFile(manifestPath, JSON.stringify(downloads, null, 2) + '\n');
  console.log(JSON.stringify(value));
} finally {
  clearTimeout(timer);
  // This profile was created solely for this test; real user data is never touched.
  await fs.rm(temporary, {recursive:true, force:true, maxRetries:5, retryDelay:200});
}
