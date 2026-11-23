from pathlib import Path
import json,time
from playwright.sync_api import sync_playwright
import argparse
parser=argparse.ArgumentParser();parser.add_argument('--base',default='http://localhost:5178');parser.add_argument('--camera-feed',required=True);parser.add_argument('--output',required=True);args=parser.parse_args()
OUT=Path(args.output);OUT.mkdir(parents=True,exist_ok=True);BASE=args.base.rstrip('/');PATH='/coa/forest-and-flowers/mother-nature/original/?ar=1'
FLAGS=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream',f'--use-file-for-fake-video-capture={args.camera_feed}']
INIT="""localStorage.setItem('vpa.analytics-consent.v1',JSON.stringify({choice:'denied',time:Date.now()}));window.__calls=0;window.__stops=0;if(navigator.mediaDevices){const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async(...args)=>{window.__calls++;const s=await original(...args);for(const t of s.getTracks()){const stop=t.stop.bind(t);t.stop=()=>{window.parent.postMessage({type:'test-stopped'},location.origin);return stop();};}return s;};}window.addEventListener('message',e=>{if(e.data?.type==='test-stopped')window.__stops++;});"""
report={'errors':[]}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=FLAGS)
 ctx=b.new_context(viewport={'width':393,'height':852},is_mobile=True,has_touch=True,accept_downloads=True)
 ctx.add_init_script(INIT+";navigator.canShare=()=>true;navigator.share=async d=>{window.__shared={count:d.files.length,bytes:d.files[0].size,active:navigator.userActivation.isActive};};");page=ctx.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
 page.goto(BASE+PATH,wait_until='networkidle');f=page.frame_locator('iframe');f.get_by_role('button',name='Start camera',exact=True).wait_for()
 assert page.frames[1].evaluate('__calls')==0
 page.screenshot(path=str(OUT/'mobile-intro.png'));f.get_by_role('button',name='Start camera',exact=True).click()
 f.locator('#ar-root[data-tracking="found"]').wait_for(state='attached',timeout=60000);page.wait_for_timeout(3500)
 page.screenshot(path=str(OUT/'mobile-tree.png'));assert page.frames[1].evaluate('__calls')==1
 print('TREE FOUND',flush=True)
 f.get_by_role('button',name='Record video',exact=True).click();f.get_by_role('button',name='Stop recording',exact=True).wait_for()
 page.wait_for_timeout(3000);page.screenshot(path=str(OUT/'recording.png'))
 f.locator('#ar-review:not([hidden])').wait_for(state='attached',timeout=20000)
 f.locator('#ar-clip').evaluate('(v)=>new Promise((ok,bad)=>{if(v.readyState>=2)return ok();v.onloadeddata=()=>ok();v.onerror=()=>bad("clip decode error");})')
 duration=f.locator('#ar-clip').evaluate('(v)=>({duration:v.duration,width:v.videoWidth,height:v.videoHeight,type:v.currentSrc})');report['clip']=duration
 assert duration['width']>200 and duration['height']>200,duration
 f.locator('#ar-clip').evaluate('(v)=>v.currentTime=2');page.wait_for_timeout(700);page.screenshot(path=str(OUT/'clip-review.png'))
 with page.expect_download() as d:f.get_by_role('link',name='Save video',exact=True).click()
 d.value.save_as(str(OUT/'recorded.mp4'));report['downloadBytes']=(OUT/'recorded.mp4').stat().st_size
 f.get_by_role('button',name='Share video',exact=True).click();report['share']=page.frames[1].evaluate('__shared');assert report['share']['active'] and report['share']['count']==1
 f.get_by_role('button',name='Return to AR',exact=True).click();f.get_by_role('button',name='Exit AR',exact=True).click();page.wait_for_function('document.querySelector("iframe")===null');assert page.evaluate('__stops')>=1
 report['cameraStopped']=True;report['noAutoCamera']=True
 ctx.close();b.close();print('RECORD/SHARE/EXIT PASS',flush=True)
 # Unsupported direct recorder -> explicit native guidance, without ending AR.
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=FLAGS)
 ctx=b.new_context(viewport={'width':393,'height':852},is_mobile=True,has_touch=True);ctx.add_init_script(INIT+';window.MediaRecorder=undefined;');page=ctx.new_page();page.goto(BASE+PATH);f=page.frame_locator('iframe');f.get_by_role('button',name='Start camera',exact=True).click();f.locator('#ar-root[data-tracking="found"]').wait_for(state='attached',timeout=60000)
 f.get_by_role('button',name='Record video',exact=True).click();f.locator('#ar-fallback:not([hidden])').wait_for(state='attached');page.screenshot(path=str(OUT/'native-fallback.png'));f.get_by_role('button',name='Continue',exact=True).click();assert f.locator('.ar-overlay').is_visible();f.get_by_role('button',name='Exit AR',exact=True).click();report['nativeFallback']=True;ctx.close();b.close()
 print('NATIVE FALLBACK PASS',flush=True)
 # Recorder API exists but construction fails: no broken recording state.
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=FLAGS)
 ctx=b.new_context(viewport={'width':393,'height':852},is_mobile=True,has_touch=True);ctx.add_init_script(INIT+';window.MediaRecorder=class{static isTypeSupported(){return true;}constructor(){throw new Error("encoder unavailable");}};');page=ctx.new_page();page.goto(BASE+PATH);f=page.frame_locator('iframe');f.get_by_role('button',name='Start camera',exact=True).click();f.locator('#ar-root[data-tracking="found"]').wait_for(state='attached',timeout=60000);f.get_by_role('button',name='Record video',exact=True).click();f.locator('#ar-fallback:not([hidden])').wait_for(state='attached');report['encoderFailureFallback']=True;f.get_by_role('button',name='Continue',exact=True).click();f.get_by_role('button',name='Exit AR',exact=True).click();ctx.close();b.close();print('ENCODER FALLBACK PASS',flush=True)
 report['passed']=not report['errors'];(OUT/'verification.json').write_text(json.dumps(report,indent=2));print(report,flush=True)
