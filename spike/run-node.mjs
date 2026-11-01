// This is a Node.js WASM check, never a browser benchmark.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {WebR, ChannelType} from 'webr';

const evidence = {environment:'Node.js (NOT a browser)', node:process.version,
  platform:process.platform, date:new Date().toISOString(), webR:'0.6.0',
  channel:'PostMessage', timingsMs:{}, events:[]};
await mkdir('evidence/node', {recursive:true});
const started = performance.now();
async function stage(key, fn) {
  const t = performance.now(); const value = await fn();
  evidence.timingsMs[key] = performance.now() - t;
  console.log(`${key}: ${evidence.timingsMs[key].toFixed(1)} ms`); return value;
}
const webR = new WebR({channelType:ChannelType.PostMessage, interactive:false});
try {
  await stage('runtimeInit', () => webR.init());
  (async () => {for await (const event of webR.stream()) {
    if (['stdout','stderr'].includes(event.type)) {evidence.events.push(event); console.log(event.data);}
  }})().catch(()=>{});
  await stage('lavaanInstall', () => webR.installPackages(['lavaan']));
  console.log('Installed lavaan', await webR.evalRString('as.character(packageVersion("lavaan"))'));
  await stage('jsonliteInstall', () => webR.installPackages(['jsonlite']));
  await webR.FS.mkdir('/home/web_user/fixtures');
  await webR.FS.writeFile('/home/web_user/fixtures/models.json', await readFile('fixtures/models.json'));
  const script = await readFile('spike/run.R', 'utf8');
  await stage('sevenTablesThreeFitsAndProbes', () => webR.evalRVoid(script));
  for (const file of ['results.json', 'parameter-tables.json']) {
    await writeFile(`evidence/node/${file}`, await webR.FS.readFile(`/home/web_user/evidence/${file}`));
  }
  evidence.status = 'complete';
} catch (error) {
  evidence.error = String(error); evidence.stack = error.stack; process.exitCode = 1;
} finally {
  evidence.timingsMs.total = performance.now() - started;
  await writeFile('evidence/node/benchmark.json', JSON.stringify(evidence,null,2));
  await webR.close();
}
