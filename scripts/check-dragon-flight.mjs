/** Native-browser regression for StrictMode setup/cleanup/setup. Requires the
 * local app for the licensed GLB; the probe is served only through test routes. */
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const root=process.cwd(),require=createRequire(import.meta.url),esbuild=createRequire(require.resolve('tsx'))('esbuild');
const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'dragon-flight-check-'));
await esbuild.build({entryPoints:['tests/browser/fixtures/dragon-flight.tsx'],bundle:true,jsx:'automatic',format:'esm',outfile:path.join(temporary,'probe.js'),alias:{'@':root},define:{'process.env.NODE_ENV':'"development"'}});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--use-angle=gl','--enable-gpu']});
try{
 const page=await browser.newPage({viewport:{width:1000,height:700}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.route('**/__three/**',async route=>{
  const file=path.resolve(root+'/node_modules/three',new URL(route.request().url()).pathname.slice('/__three/'.length));
  await route.fulfill({body:await fs.readFile(file),contentType:file.endsWith('.wasm')?'application/wasm':'text/javascript'});
 });
 await page.route('**/__flight-probe.js',async route=>route.fulfill({body:await fs.readFile(path.join(temporary,'probe.js')),contentType:'text/javascript'}));
 await page.route('**/__flight-probe',route=>route.fulfill({body:'<style>html,body,#root{width:100%;height:100%;margin:0}</style><div id="root"></div><script type="module" src="/__flight-probe.js"></script>',contentType:'text/html'}));
 await page.goto((process.env.WORLD_REVIEW_URL||'http://localhost:3000')+'/__flight-probe');
 await page.waitForFunction(()=>window.flightProbe?.length>=40,undefined,{timeout:90000});
 const records=await page.evaluate(()=>window.flightProbe),deltas=records.slice(1).map((r,i)=>r.values.reduce((sum,value,j)=>sum+Math.abs(value-records[i].values[j]),0));
 assert.deepEqual(errors,[]);assert.ok(records.every(r=>r.visible),'probe camera must contain the dragon');
 assert.ok(records[0].values.length>0,'missing rig/morph animation samples');
 assert.ok(deltas.every(d=>d>.01),'flight pose froze after StrictMode replay');
 const result={poses:records.length,channels:records[0].values.length,deltas,errors};
 if(process.argv[2])await fs.writeFile(process.argv[2],JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result));
}finally{await browser.close();await fs.rm(temporary,{recursive:true,force:true});}
