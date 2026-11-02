import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const engine=path.resolve('app/public/engine').replaceAll('\\','/');
const spec=JSON.parse(await readFile('app/src/engine-spec.json','utf8'));
for(const [name,expected] of Object.entries(spec.files)){const bytes=await readFile(engine+'/'+name);assert.equal(bytes.length,expected.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),expected.sha256);}
const {WebR,ChannelType}=(await import(pathToFileURL(engine+'/webr.cjs').href)).default;
const r=new WebR({baseUrl:engine+'/',channelType:ChannelType.PostMessage,interactive:false});
try {
 await r.init();(async()=>{for await(const e of r.stream())if(e.type==='stderr')console.log(e.data);})().catch(()=>{});
 await r.FS.mkdir('/forma-library');
 await r.FS.mount('WORKERFS',{packages:[{blob:new Blob([await readFile(engine+'/library.data')]),metadata:JSON.parse(await readFile(engine+'/library.metadata.json','utf8'))}]},'/forma-library');
 await r.evalRVoid('.libPaths(c("/forma-library",.libPaths())); options(repos=character(),useFancyQuotes=FALSE)');
 const versions=JSON.parse(await r.evalRString('jsonlite::toJSON(as.list(vapply(c("lavaan","semTools","readxl","haven"),function(p)as.character(packageVersion(p)),character(1))),auto_unbox=TRUE)'));
 for(const [name,version] of Object.entries(versions))assert.equal(version,spec.packages[name].replaceAll('-','.'));
 console.log(JSON.stringify(versions));
 for(const p of ['app','app/src','app/src/r','app/scripts','app/tests','app/tests/fixtures','fixtures','fixtures/data','evidence','evidence/phase-2','evidence/phase-3','evidence/phase-4','.Rlib'])await r.FS.mkdir('/home/web_user/'+p);
 for(const p of ['app/src/r/compile.R','app/src/r/edit.R','app/src/r/analysis.R','app/src/r/advanced.R','app/scripts/check-advanced.R','app/scripts/check-analysis.R','app/scripts/check-editing.R','app/tests/fixtures/extra-models.json','fixtures/models.json',...(await readdir('fixtures/data')).filter(p=>/\.(csv|xlsx|sav)$/.test(p)).map(p=>'fixtures/data/'+p)])await r.FS.writeFile('/home/web_user/'+p,await readFile(p));
 await r.evalRVoid('setwd("/home/web_user/app");options(forma.evidence="../evidence/phase-2/packaged.json",forma.editEvidence="../evidence/phase-3/packaged.json",forma.advancedEvidence="../evidence/phase-4/packaged.json");source("scripts/check-analysis.R");source("scripts/check-editing.R");source("scripts/check-advanced.R")');
 await mkdir('evidence/release',{recursive:true});
 for(const [phase,name] of [['2','packaged-analysis'],['3','packaged-editing'],['4','packaged']])await writeFile('evidence/release/'+name+'.json',await r.FS.readFile('/home/web_user/evidence/phase-'+phase+'/packaged.json'));
 console.log('PASS: packaged engine, frozen packages, advanced analyses, Excel and SPSS imports without package installation.');
}finally{await r.close();}
