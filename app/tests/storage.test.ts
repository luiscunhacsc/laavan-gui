import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {saveSession,loadSession} from '../src/storage';
import {portableAttachment,attachmentState,readAttachment,type DatasetState} from '../src/dataset-source';
import {readProject,type Project} from '../src/project';
import {defaultDisplay,defaultOptions} from '../src/model';
const project:Project={format:'forma-sem',version:2,syntax:'y ~ x',options:defaultOptions,display:defaultDisplay,positions:{'g1:x':{x:100,y:200}},datasetAttached:true};
const source=(text:string):DatasetState=>({query:{action:'import',id:'test-source',name:'test.csv',format:'csv',sheet:'',delimiter:',',na:['','NA']},binary:new TextEncoder().encode(text),types:[{action:'type',name:'x',type:'ordered'}]});
test('portable projects retain exact dataset bytes and measurement-type choices',()=>{
 const original=source('x,y\n1,2\n3,4\n');
 const p=readProject(JSON.parse(JSON.stringify({...project,dataset:portableAttachment(original)})));
 assert.equal(p.version,2);assert.equal(p.datasetAttached,true);
 const state=attachmentState(p.dataset!);
 assert.deepEqual(state.binary,original.binary);assert.equal(state.types[0].type,'ordered');
 assert.equal(state.types[0].revision,1);assert.equal(state.types[0].id,'test-source');
});
test('attachments cannot request arbitrary R actions or paths and reject corrupt data',()=>{
 const good=portableAttachment(source('x,y\n1,2'));
 assert.throws(()=>readAttachment({...good,source:{...good.source,action:'fit'}}),/badDatasetAttachment/);
 assert.throws(()=>readAttachment({...good,base64:'%%%'}),/badDatasetAttachment/);
 assert.throws(()=>readAttachment({...good,types:[{name:'x',type:'other'}]}),/badDatasetAttachment/);
 assert.equal(readAttachment({...good,source:{...good.source,path:'untrusted'}}).source.path,undefined);
});
test('autosave restores the matching project and binary source, orders writes and removes obsolete sources',async()=>{
 const one=source('x,y\n1,2\n'),two=source('x,y\n5,6\n');
 await saveSession(project,one);
 const initial=await loadSession();assert.equal(initial?.project.syntax,'y ~ x');assert.deepEqual(initial?.dataset?.binary,one.binary);
 // Same source ID with different bytes must not recover the old file.
 await Promise.all([saveSession({...project,syntax:'y ~ a*x'},two),saveSession({...project,syntax:'y ~ b*x'},two)]);
 const latest=await loadSession();assert.equal(latest?.project.syntax,'y ~ b*x');assert.deepEqual(latest?.dataset?.binary,two.binary);
 assert.equal(latest?.dataset?.types[0].type,'ordered');
 // Rejected saves leave the previous valid project/data pair intact.
 await assert.rejects(saveSession({...project,syntax:'bad replacement'},{...two,query:{action:'fit'}}));
 assert.equal((await loadSession())?.project.syntax,'y ~ b*x');
 await saveSession({...project,syntax:'new model',datasetAttached:false});
 const empty=await loadSession();assert.equal(empty?.dataset,undefined);assert.equal(empty?.project.syntax,'new model');
 const count=await new Promise<number>((resolve,reject)=>{const r=indexedDB.open('forma.workspace');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,c=db.transaction('sources').objectStore('sources').count();c.onsuccess=()=>{resolve(c.result);db.close();};};});
 assert.equal(count,0);
});
