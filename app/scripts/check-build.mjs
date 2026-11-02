import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const manifest=JSON.parse(await readFile('dist/assets-manifest.json','utf8'));
const release=JSON.parse(await readFile('dist/release.json','utf8'));
const assets=new Map();
for(const file of manifest.files){
 const bytes=await readFile('dist/'+file.path);
 assert.equal(bytes.length,file.bytes,file.path);assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256,file.path);
 assets.set(new URL(file.path,'http://localhost:8765/').href,{...file,text:file.path==='index.html'?bytes.toString():file.path});
}
assert.equal(release.files,assets.size);assert.equal(release.bytes,manifest.files.reduce((n,f)=>n+f.bytes,0));
const code=await readFile('dist/sw.js','utf8');
function worker(fail=false){
 const handlers={},stores=new Map([['forma-static-old',new Map()],['another-app',new Map()]]);let claimed=false,network=0;
 const key=request=>typeof request==='string'?request:request.href||request.url;
 const caches={async keys(){return [...stores.keys()];},async delete(name){return stores.delete(name);},async open(name){
  if(!stores.has(name))stores.set(name,new Map());const data=stores.get(name);
  return {async add(request){const asset=assets.get(request.url);assert.ok(asset);assert.equal(request.integrity,'sha256-'+Buffer.from(asset.sha256,'hex').toString('base64'));assert.equal(request.cache,'reload');if(fail)throw Error('integrity mismatch');data.set(request.url,new Response(asset.text));},async match(request){return data.get(key(request))?.clone();}};
 }};
 const self={registration:{scope:'http://localhost:8765/'},location:{origin:'http://localhost:8765'},clients:{async claim(){claimed=true;}},addEventListener(type,handler){handlers[type]=handler;}};
 vm.runInNewContext(code,{self,caches,URL,Request,fetch:async()=>{network++;throw Error('network disconnected');}});
 const lifecycle=async type=>{let promise;handlers[type]({waitUntil(p){promise=p;}});await promise;};
 const request=async(url,method='GET',mode='cors')=>{let response;handlers.fetch({request:{url,method,mode},respondWith(p){response=p;}});return response&&await response;};
 return {stores,lifecycle,request,claimed:()=>claimed,network:()=>network};
}
const w=worker();await w.lifecycle('install');await w.lifecycle('activate');
assert.ok(w.claimed());assert.ok(!w.stores.has('forma-static-old'));assert.ok(w.stores.has('another-app'));
assert.equal(w.stores.get('forma-static-'+manifest.key).size,assets.size);
const html=await w.request('http://localhost:8765/?workspace=model','GET','navigate');assert.match(await html.text(),/<html/);
for(const name of ['engine/webr.js','engine/webr-worker.js','engine/library.data','fonts/NotoSans-Regular.ttf'])assert.ok(await w.request('http://localhost:8765/'+name));
assert.equal(await w.request('http://localhost:8765/user-data.csv'),undefined);
assert.equal(await w.request('http://localhost:8765/index.html','POST'),undefined);
assert.equal(await w.request('https://example.org/index.html','GET','navigate'),undefined);assert.equal(w.network(),0);
const broken=worker(true);await assert.rejects(broken.lifecycle('install'),/integrity mismatch/);assert.ok(!broken.stores.has('forma-static-'+manifest.key));
execFileSync(process.execPath,['--experimental-vm-modules',fileURLToPath(new URL('./check-engine-browser.mjs',import.meta.url)),'dist/engine'],{stdio:'pipe',windowsHide:true,timeout:15000});
const result={passed:true,build:manifest.key,assets:assets.size,bytes:release.bytes,checks:['all asset hashes and sizes','browser entry import and worker startup without Node built-ins','integrity-bound service-worker precache','offline navigation and engine/font lookup','application-only GET cache','old-cache cleanup','failed-install cleanup'],scope:'Node browser-module and service-worker simulations and artifact validation; not a browser offline certification'};
await writeFile('../evidence/release/build-check.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
