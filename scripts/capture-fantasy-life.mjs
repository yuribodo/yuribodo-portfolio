/** Capture the actual desk view, including a full flap/glide cycle and both falls. */
import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const directory=process.env.WORLD_CAPTURE_DIRECTORY||'docs/design/isekai-world/implementation/fantasy-life';
await fs.mkdir(directory,{recursive:true});
const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'fantasy-life-'));
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--use-angle=gl','--enable-gpu']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,recordVideo:{dir:temporary,size:{width:1440,height:900}}});
 const page=await context.newPage(),errors=[],wildlifeRequests=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('request',r=>{if(/wildlife-(deer|stag)\.glb/.test(r.url()))wildlifeRequests.push(r.url());});
 await page.goto(process.env.WORLD_REVIEW_URL||'http://localhost:3000',{waitUntil:'networkidle',timeout:120000});
 await page.locator('[data-lobby-state=idle]').waitFor({timeout:90000});
 await page.addStyleTag({content:'nextjs-portal{display:none}'});
 await page.mouse.move(720,450);await page.waitForTimeout(24000);
 await page.screenshot({path:directory+'/after.png'});
 await page.waitForTimeout(18500);
 const video=page.video();await context.close();
 execFileSync('ffmpeg',['-y','-sseof','-18','-i',await video.path(),'-an','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',directory+'/motion.mp4'],{stdio:'ignore'});
 const result={errors,realAnimalRequests:wildlifeRequests,recordingSeconds:18};
 await fs.writeFile(directory+'/capture.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result));if(errors.length||wildlifeRequests.length)process.exitCode=1;
}finally{await browser.close();await fs.rm(temporary,{recursive:true,force:true});}
