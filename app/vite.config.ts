import {defineConfig} from 'vite';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
export default defineConfig({base:'./',build:{target:'es2022'},server:{strictPort:true},plugins:[{
  name:'local-fixture-evidence',apply:'serve',
  configureServer(server){
  server.middlewares.use('/__qa-advanced',async(request,response)=>{
    if(request.method!=='POST'||request.headers.origin!=='http://127.0.0.1:5173'){response.statusCode=403;response.end();return;}
    let body='';for await(const chunk of request){body+=chunk;if(body.length>12000000){response.statusCode=413;response.end();return;}}
    try{const value=JSON.parse(body);if(typeof value.userAgent!=='string'||!Array.isArray(value.checks)||value.checks.length!==12||!Array.isArray(value.models)||value.models.length!==3)throw new Error('Invalid evidence');
      const directory=resolve('../evidence/phase-4',`browser-${new Date().toISOString().replaceAll(/[:.]/g,'-')}`);await mkdir(directory,{recursive:true});
      for(const [name,base64] of Object.entries(value.artifacts||{})){if(!['notation.svg','mediation.png','mediation.pdf','analysis.docx','analysis.tex','mediation.tex'].includes(name)||typeof base64!=='string'||base64.length>4000000)throw new Error('Invalid artifact');await writeFile(resolve(directory,name),Buffer.from(base64,'base64'));}
      delete value.artifacts;await writeFile(resolve(directory,'results.json'),JSON.stringify(value,null,2));response.statusCode=201;response.end('Saved');
    }catch{response.statusCode=400;response.end('Invalid evidence');}
  });
  server.middlewares.use('/__qa-editing',async(request,response)=>{
    if(request.method!=='POST'||request.headers.origin!=='http://127.0.0.1:5173'){response.statusCode=403;response.end();return;}
    let body='';for await(const chunk of request){body+=chunk;if(body.length>9000000){response.statusCode=413;response.end();return;}}
    try{const value=JSON.parse(body);if(typeof value.userAgent!=='string'||!Array.isArray(value.models)||value.models.length!==15||!value.storage||!value.drawn)throw new Error('Invalid evidence');
      const directory=resolve('../evidence/phase-3');await mkdir(directory,{recursive:true});await writeFile(resolve(directory,`browser-${new Date().toISOString().replaceAll(/[:.]/g,'-')}.json`),JSON.stringify(value,null,2));response.statusCode=201;response.end('Saved');
    }catch{response.statusCode=400;response.end('Invalid evidence');}
  });
  server.middlewares.use('/__fixtures',async(request,response)=>{
    const name=(request.url||'').slice(1);
    if(request.method!=='GET'||!['labelled.sav','workbook.xlsx','large.csv'].includes(name)){response.statusCode=404;response.end();return;}
    try{response.setHeader('Content-Type','application/octet-stream');response.end(await readFile(resolve('../fixtures/data',name)));}catch{response.statusCode=404;response.end();}
  });
  server.middlewares.use('/__qa-analysis',async(request,response)=>{
    if(request.method!=='POST'||request.headers.origin!=='http://127.0.0.1:5173'){response.statusCode=403;response.end();return;}
    let body='';for await(const chunk of request){body+=chunk;if(body.length>5000000){response.statusCode=413;response.end();return;}}
    try{const value=JSON.parse(body);if(typeof value.userAgent!=='string'||!Array.isArray(value.models)||value.models.length!==3||!value.imports)throw new Error('Invalid evidence');
      const directory=resolve('../evidence/phase-2');await mkdir(directory,{recursive:true});await writeFile(resolve(directory,`browser-${new Date().toISOString().replaceAll(/[:.]/g,'-')}.json`),JSON.stringify(value,null,2));response.statusCode=201;response.end('Saved');
    }catch{response.statusCode=400;response.end('Invalid evidence');}
  });
  server.middlewares.use('/__qa',async(request,response)=>{
    if(request.method!=='POST'||request.headers.origin!=='http://127.0.0.1:5173'){response.statusCode=403;response.end();return;}
    let body='';for await(const chunk of request){body+=chunk;if(body.length>3000000){response.statusCode=413;response.end();return;}}
    try{const value=JSON.parse(body);if(typeof value.userAgent!=='string'||!Array.isArray(value.models)||value.models.length!==7)throw new Error('Invalid evidence');
      const directory=resolve('../evidence/phase-1');await mkdir(directory,{recursive:true});
      await writeFile(resolve(directory,`browser-${new Date().toISOString().replaceAll(/[:.]/g,'-')}.json`),JSON.stringify(value,null,2));
      response.statusCode=201;response.end('Saved');
    }catch{response.statusCode=400;response.end('Invalid evidence');}
  });}
} ]});
