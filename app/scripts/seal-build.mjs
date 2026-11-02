import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=path.resolve('dist'),files=[];
async function visit(dir){for(const item of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const full=path.join(dir,item.name);if(item.isDirectory())await visit(full);else if(!['sw.js','assets-manifest.json','release.json'].includes(item.name)){const bytes=await readFile(full);files.push({path:path.relative(root,full).replaceAll('\\','/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}}}
await visit(root);
const key=createHash('sha256').update(JSON.stringify(files)).digest('hex').slice(0,20);
const version=JSON.parse(await readFile('package.json','utf8')).version;
await writeFile(root+'/assets-manifest.json',JSON.stringify({version,key,files},null,2));
await writeFile(root+'/release.json',JSON.stringify({application:'Forma',version,build:key,files:files.length,bytes:files.reduce((s,f)=>s+f.bytes,0)},null,2));
const requests=files.map(f=>({path:f.path,integrity:'sha256-'+Buffer.from(f.sha256,'hex').toString('base64')}));
await writeFile(root+'/sw.js',`/* Forma ${version}; caches only bundled public assets. */
const CACHE='forma-static-${key}',FILES=${JSON.stringify(requests)};
const URLS=new Set(FILES.map(f=>new URL(f.path,self.registration.scope).href));
self.addEventListener('install',event=>event.waitUntil((async()=>{try{const cache=await caches.open(CACHE);for(const f of FILES)await cache.add(new Request(new URL(f.path,self.registration.scope),{integrity:f.integrity,cache:'reload'}));}catch(error){await caches.delete(CACHE);throw error;}})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith('forma-static-')&&name!==CACHE)await caches.delete(name);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;if(event.request.mode==='navigate'&&url.pathname.startsWith(new URL(self.registration.scope).pathname)){event.respondWith((async()=>{const cache=await caches.open(CACHE);return await cache.match(new URL('index.html',self.registration.scope))||fetch(event.request);})());return;}if(URLS.has(url.href))event.respondWith((async()=>{const cache=await caches.open(CACHE);return await cache.match(event.request)||fetch(event.request);})());});
`);
console.log(`Sealed ${files.length} assets (${(files.reduce((s,f)=>s+f.bytes,0)/1048576).toFixed(1)} MiB), build ${key}.`);
