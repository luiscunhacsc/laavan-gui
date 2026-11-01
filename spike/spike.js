const en = await fetch('./en.json').then(r => r.json());
for (const id of ['title', 'intro', 'gallery', 'notice']) document.getElementById(id).textContent = en[id];
const status = document.getElementById('status');
const output = document.getElementById('result');
const again = document.getElementById('again');
const download = document.getElementById('download');
download.textContent = en.download;
again.textContent = en.runAgain;
again.onclick = () => location.reload();
let evidenceSink = false;
try {
  if (location.hostname === '127.0.0.1' && location.port === '8000') {
    const probe = await fetch('/__evidence/');
    evidenceSink = probe.ok && (await probe.json()).enabled === true;
  }
} catch { /* Static hosting has no local evidence sink. */ }
const started = performance.now();
const runId = new Date().toISOString().replaceAll(/[:.]/g, '-');
const evidence = {runId, userAgent: navigator.userAgent, crossOriginIsolated,
  hardwareConcurrency: navigator.hardwareConcurrency, timingsMs: {}, events: [], status: 'running'};
async function save(name, data) {
  if (!evidenceSink) return;
  const response = await fetch(`/__evidence/${runId}/${name}`, {
    method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data, null, 2)
  });
  // Static hosts cannot save evidence; the experiment still runs and displays results.
  if (!response.ok) throw new Error(`Evidence write: ${response.status}`);
}
async function stage(key, fn) {
  const t = performance.now(); const result = await fn();
  evidence.timingsMs[key] = performance.now() - t;
  return result;
}
let webR;
try {
  status.textContent = en.starting;
  const {WebR, ChannelType} = await stage('moduleImport', () => import('https://webr.r-wasm.org/v0.6.0/webr.mjs'));
  // GitHub Pages cannot supply COOP/COEP headers: explicitly test its viable channel.
  webR = new WebR({channelType: ChannelType.PostMessage, interactive: false});
  await stage('runtimeInit', () => webR.init());
  evidence.channel = 'PostMessage';
  evidence.versions = await webR.evalRString('R.version.string');
  (async () => {for await (const event of webR.stream()) {
    if (event.type === 'stdout' || event.type === 'stderr') {
      evidence.events.push(event); output.textContent = evidence.events.map(x => x.data).join('\n');
    }
  }})().catch(() => {});
  status.textContent = en.packages;
  await stage('lavaanInstall', () => webR.installPackages(['lavaan']));
  evidence.lavaan = await webR.evalRString('as.character(packageVersion("lavaan"))');
  await save('progress.json', evidence);
  status.textContent = en.evidencePackage;
  await stage('jsonliteInstall', () => webR.installPackages(['jsonlite']));
  await webR.FS.mkdir('/home/web_user/fixtures');
  const encoder = new TextEncoder();
  const fixtures = await fetch('../fixtures/models.json').then(r => r.text());
  await webR.FS.writeFile('/home/web_user/fixtures/models.json', encoder.encode(fixtures));
  const script = await fetch('./run.R').then(r => r.text());
  status.textContent = en.running;
  await stage('sevenTablesThreeFitsAndProbes', () => webR.evalRVoid(script));
  const decoder = new TextDecoder();
  const result = JSON.parse(decoder.decode(await webR.FS.readFile('/home/web_user/evidence/results.json')));
  const tables = JSON.parse(decoder.decode(await webR.FS.readFile('/home/web_user/evidence/parameter-tables.json')));
  evidence.status = 'complete'; evidence.timingsMs.total = performance.now() - started;
  evidence.resources = performance.getEntriesByType('resource').map(({name,duration,transferSize,encodedBodySize}) => ({name,duration,transferSize,encodedBodySize}));
  await save('results.json', result); await save('parameter-tables.json', tables); await save('benchmark.json', evidence);
  const bundle = {benchmark:evidence, results:result, parameterTables:tables};
  download.href = URL.createObjectURL(new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'}));
  download.download = `sem-phase0-${runId}.json`; download.hidden = false;
  status.textContent = evidenceSink ? en.doneLocal : en.done;
  output.textContent = JSON.stringify({status:evidence.status, R:result.R, lavaan:result.lavaan,
    timingsMs:evidence.timingsMs, fits:Object.fromEntries(Object.entries(result.fits).map(([k,v]) => [k,{converged:v.converged,seconds:v.seconds,fitMeasures:v.fitMeasures}])), probes:result.probes}, null, 2);
} catch (error) {
  evidence.status = 'failed'; evidence.error = String(error); evidence.stack = error.stack;
  status.textContent = en.failed; output.textContent = JSON.stringify(evidence, null, 2);
  await save('benchmark.json', evidence).catch(() => {});
} finally { if (webR) await webR.close(); }
