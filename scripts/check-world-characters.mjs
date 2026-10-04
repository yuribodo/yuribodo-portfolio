import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {chromium} from '@playwright/test';
const require=createRequire(import.meta.url),esbuild=createRequire(require.resolve('tsx'))('esbuild');
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'character-preview-'));
const out='docs/design/isekai-world/implementation/characters';await fs.mkdir(out,{recursive:true});
await esbuild.build({entryPoints:['tests/browser/fixtures/character-preview.ts'],bundle:true,format:'esm',outfile:path.join(temp,'probe.js')});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--use-angle=gl','--enable-gpu']});
try{
 const page=await browser.newPage({viewport:{width:900,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__characters.js',r=>r.fulfill({path:path.join(temp,'probe.js'),contentType:'text/javascript'}));
 await page.route('**/__characters',r=>r.fulfill({body:'<style>body{margin:0}</style><script type="module" src="/__characters.js"></script>',contentType:'text/html'}));
 await page.goto((process.env.WORLD_REVIEW_URL||'http://localhost:3000')+'/__characters');
 await page.waitForFunction(()=>window.characterPreview);
 const report={};
 for(const id of ['going-merry','snorlax','ainz','lancelot','fishstick']){
  report[id]=await page.evaluate(id=>window.characterPreview.load(id),id);
  await page.waitForTimeout(500);
  await page.screenshot({path:out+'/'+id+'.png'});
  if(id==='fishstick'){
   const poses=[];
   for(let i=0;i<12;i++){poses.push(await page.evaluate(()=>window.characterPreview.pose()));await page.waitForTimeout(500);}
   report[id].poseDeltas=poses.slice(1).map((p,i)=>p.reduce((s,v,j)=>s+Math.abs(v-poses[i][j]),0));
   await page.screenshot({path:out+'/fishstick-later.png'});
  }
 }
 report.errors=errors;await fs.writeFile(out+'/asset-check.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 if(errors.length||report.fishstick.poseDeltas.some(d=>d<.01))process.exitCode=1;
}finally{await browser.close();await fs.rm(temp,{recursive:true,force:true});}
