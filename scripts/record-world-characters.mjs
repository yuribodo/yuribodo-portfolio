/** Capture the actual desk, followed by an isolated view of the shipped dance. */
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {chromium} from '@playwright/test';
const require=createRequire(import.meta.url),esbuild=createRequire(require.resolve('tsx'))('esbuild');
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'world-demo-'));
const out='docs/design/isekai-world/implementation/characters';await fs.mkdir(out,{recursive:true});
await esbuild.build({entryPoints:['tests/browser/fixtures/character-preview.ts'],bundle:true,format:'esm',outfile:path.join(temp,'probe.js')});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--use-angle=gl','--enable-gpu']});
try {
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const base=process.env.WORLD_REVIEW_URL||'http://localhost:3000';
 await page.goto(base,{waitUntil:'networkidle',timeout:120000});
 await page.locator('[data-lobby-state=idle]').waitFor({timeout:90000});
 await page.addStyleTag({content:'nextjs-portal{display:none}'});
 await page.mouse.move(720,450);await page.waitForTimeout(12000);
 await page.screenshot({path:out+'/desk.png'});
 const record=async(name,seconds)=>{
  const bytes=await page.evaluate(seconds=>new Promise((resolve,reject)=>{
   const canvas=document.querySelector('canvas');if(!canvas)return reject(new Error('Missing scene canvas'));
   const stream=canvas.captureStream(30),chunks=[];
   const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:7000000});
   recorder.ondataavailable=e=>chunks.push(e.data);recorder.onerror=reject;
   recorder.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());resolve(Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer())));};
   recorder.start();setTimeout(()=>recorder.stop(),seconds*1000);
  }),seconds);
  const source=path.join(temp,name+'.webm'),target=path.join(temp,name+'.mp4');await fs.writeFile(source,Buffer.from(bytes));
  execFileSync('ffmpeg',['-y','-i',source,'-an','-vf','scale=1440:900:force_original_aspect_ratio=decrease,pad=1440:900:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p','-c:v','libx264','-preset','fast','-crf','22',target],{stdio:'pipe'});
  return target;
 };
 const desk=await record('desk',12);
 await page.route('**/__characters.js',r=>r.fulfill({path:path.join(temp,'probe.js'),contentType:'text/javascript'}));
 await page.route('**/__characters',r=>r.fulfill({body:'<style>body{margin:0}</style><script type="module" src="/__characters.js"></script>',contentType:'text/html'}));
 await page.goto(base+'/__characters');await page.waitForFunction(()=>window.characterPreview);
 const fish=await page.evaluate(()=>window.characterPreview.load('fishstick'));await page.waitForTimeout(400);
 await page.screenshot({path:out+'/fishstick.png'});
 const dance=await record('dance',7);
 const list=path.join(temp,'concat.txt');await fs.writeFile(list,`file '${desk}'\nfile '${dance}'\n`);
 execFileSync('ffmpeg',['-y','-f','concat','-safe','0','-i',list,'-c','copy','-movflags','+faststart',out+'/world-characters-demo.mp4'],{stdio:'pipe'});
 await fs.writeFile(out+'/recording-check.json',JSON.stringify({segments:['12 seconds: actual desk scene','7 seconds: isolated shipped Fishstick animation'],fish,errors},null,2)+'\n');
 console.log(JSON.stringify({video:out+'/world-characters-demo.mp4',errors}));if(errors.length)process.exitCode=1;
} finally {await browser.close();await fs.rm(temp,{recursive:true,force:true});}
