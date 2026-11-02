// Check the real packaged entry with browser module rules and no Node globals.
// Run with node --experimental-vm-modules; this does not replace a browser test.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createContext, SourceTextModule} from 'node:vm';

const spec=JSON.parse(await readFile(new URL('../src/engine-spec.json',import.meta.url),'utf8'));
const directory=process.argv[2]
  ? pathToFileURL(path.resolve(process.argv[2])+path.sep)
  : new URL('../public/engine/',import.meta.url);
const entries=Object.keys(spec.files).filter(name=>/^webr\.(js|mjs)$/.test(name));
assert.equal(entries.length,1,'The engine lock must identify one browser entry');
const entry=entries[0],source=await readFile(new URL(entry,directory),'utf8');
const expected=spec.files[entry];
assert.equal(Buffer.byteLength(source),expected.bytes);
assert.equal(createHash('sha256').update(source).digest('hex'),expected.sha256);

// Exercise both root hosting and the subdirectory URL used by the local app.
for(const base of ['http://localhost:8765/','http://127.0.0.1:8000/app/dist/']){
  const workers=[];
  class BrowserWorker {
    constructor(url){this.url=url;this.messages=[];this.closed=false;workers.push(this);}
    postMessage(message){this.messages.push(message);}
    terminate(){this.closed=true;}
  }
  const rejectImport=specifier=>{throw new Error(`Browser cannot resolve module specifier ${JSON.stringify(specifier)}`);};
  const context=createContext({
    TextEncoder,TextDecoder,URL,Blob,WebSocket:class {},Worker:BrowserWorker,
    location:{href:base,origin:new URL(base).origin},document:{},console,
  });
  const module=new SourceTextModule(source,{
    context,identifier:new URL('engine/'+entry,base).href,
    initializeImportMeta(meta){meta.url=new URL('engine/'+entry,base).href;},
    importModuleDynamically:rejectImport,
  });
  await module.link(rejectImport);
  await module.evaluate();
  const {WebR,ChannelType}=module.namespace;
  assert.equal(typeof WebR,'function');
  assert.equal(ChannelType.PostMessage,3);
  const runtime=new WebR({baseUrl:new URL('engine/',base).href,channelType:ChannelType.PostMessage,interactive:false});
  assert.equal(workers.length,1);
  assert.equal(workers[0].url,new URL('engine/webr-worker.js',base).href);
  assert.equal(workers[0].messages[0].type,'init');
  assert.equal(workers[0].messages[0].data.channelType,ChannelType.PostMessage);
  assert.equal(workers[0].messages[0].data.config.interactive,false);
  await runtime.close();
  assert.equal(workers[0].closed,true);
}
console.log('PASS: integrity-checked browser engine imports and starts its worker without Node built-ins, at root and subdirectory URLs.');
