"""Optional software-Chromium integration check; not a physical iPhone benchmark."""
from pathlib import Path
import argparse, json
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--base',default='http://localhost:5184');p.add_argument('--camera-feed',required=True);p.add_argument('--output',required=True);args=p.parse_args()
out=Path(args.output);out.mkdir(parents=True,exist_ok=True);base=args.base.rstrip('/')
flags=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream',f'--use-file-for-fake-video-capture={Path(args.camera_feed).resolve()}']
init="""window.__cameraCalls=0;window.__cameraStops=Number(sessionStorage.getItem('v2-stops')||0);const get=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async(...a)=>{window.__cameraCalls++;const s=await get(...a);s.getTracks().forEach(t=>{const stop=t.stop.bind(t);t.stop=()=>{window.__cameraStops++;sessionStorage.setItem('v2-stops',String(window.__cameraStops));stop();};});return s;};navigator.clipboard.writeText=async text=>window.__report=JSON.parse(text);"""
result={'environment':'software Chromium, synthetic authentic certificate feed; not iPhone Safari','errors':[]}
with sync_playwright() as w:
 b=w.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=flags);ctx=b.new_context(viewport={'width':393,'height':852},is_mobile=True,has_touch=True);ctx.add_init_script(init);page=ctx.new_page();page.set_default_timeout(90000);page.on('pageerror',lambda e:result['errors'].append(str(e)))
 page.goto(base+'/rainforest-v2.html',wait_until='networkidle');assert page.evaluate('__cameraCalls')==0;assert page.locator('.rainforest-lab').count()==0;page.screenshot(path=str(out/'v2-intro.png'))
 page.get_by_role('button',name='Start camera',exact=True).click();page.locator('.ar-surface[data-sculpture="ready"]').wait_for(state='attached');page.locator('#ar-root[data-tracking="found"]').wait_for(state='attached',timeout=120000);page.wait_for_timeout(3500)
 assert page.get_by_role('button',name='Reset view').is_visible();assert not page.locator('#ar-capture-help').is_visible();assert page.locator('.rainforest-lab').count()==0;assert page.locator('input[type=range]').count()==0
 page.screenshot(path=str(out/'v2-normal-tracked.png'));print('V2 NORMAL TRACKED',flush=True)
 page.get_by_role('button',name='Reset view').click(force=True)
 page.get_by_role('button',name='Record video',exact=True).click(force=True);page.get_by_role('button',name='Stop recording',exact=True).wait_for();page.wait_for_timeout(3500);page.get_by_role('button',name='Stop recording',exact=True).click(force=True)
 page.wait_for_function('!document.querySelector("#ar-review").hidden||!document.querySelector("#ar-fallback").hidden',timeout=45000)
 if page.locator('#ar-review').is_visible():
  page.wait_for_function('document.querySelector("#ar-clip").readyState>=2');result['clip']=page.locator('#ar-clip').evaluate('v=>({duration:v.duration,width:v.videoWidth,height:v.videoHeight})');assert result['clip']['width']>0;page.screenshot(path=str(out/'v2-recording-review.png'));page.get_by_role('button',name='Return to AR',exact=True).click(force=True)
 else:
  result['nativeFallback']=True;page.get_by_role('button',name='Continue',exact=True).click(force=True)
 page.get_by_role('button',name='Exit AR',exact=True).click(force=True);page.wait_for_url('**/coa/forest-and-flowers/mother-nature/original/');assert page.evaluate('__cameraStops')>=1;result['cameraStopped']=True
 # Opt-in diagnostics exposes the comparison toggle and measurable pinch state.
 page.goto(base+'/rainforest-v2.html?debug=1',wait_until='networkidle');page.get_by_role('button',name='Start camera',exact=True).click();page.locator('.ar-surface[data-sculpture="ready"]').wait_for(state='attached');page.locator('#ar-root[data-tracking="found"]').wait_for(state='attached',timeout=120000);page.wait_for_timeout(2000)
 assert page.locator('.rainforest-lab').count()==1
 def report():
  page.get_by_role('button',name='Copy diagnostics',exact=True).evaluate('b=>b.click()');return page.evaluate('__report')
 def touch(kind,coords):
  page.locator('.ar-surface').evaluate("""(s,a)=>{const touches=a.coords.map((p,i)=>new Touch({identifier:i,target:s,clientX:p[0],clientY:p[1]}));s.dispatchEvent(new TouchEvent(a.kind,{touches,bubbles:true,cancelable:true}));}""",{'kind':kind,'coords':coords})
 touch('touchstart',[[150,400],[250,400]]);touch('touchmove',[[125,400],[275,400]]);touch('touchend',[]);r=report();assert r['collectorScale']==1.5;assert abs(r['placement']['height']-3.9)<.001;assert r['placement']['x']==0 and r['placement']['y']==-.55;result['pinch']=r['placement'].copy()
 page.get_by_role('button',name='Reset view').click(force=True);r=report();assert r['collectorScale']==1 and r['placement']['height']==2.6
 page.locator('.rainforest-lab').evaluate('d=>d.open=false');page.wait_for_timeout(1800);page.screenshot(path=str(out/'v2-mist-on.png'));on=report()
 page.locator('[data-mist]').evaluate("i=>{i.checked=false;i.dispatchEvent(new Event('input',{bubbles:true}));}");page.wait_for_timeout(1800);page.screenshot(path=str(out/'v2-mist-off.png'));off=report();assert on['mistEnabled'] and not off['mistEnabled'];result['mistOn']=on;result['mistOff']=off
 page.get_by_role('button',name='Exit AR',exact=True).click(force=True);page.wait_for_url('**/coa/forest-and-flowers/mother-nature/original/')
 page.goto(base+'/rainforest-ar.html');assert 'Rainforest lab' in page.locator('h1').inner_text();assert page.get_by_role('button',name='Reset view').count()==0;result['v1FallbackPreserved']=True
 assert not result['errors'];result['passed']=True;(out/'verification.json').write_text(json.dumps(result,indent=2));print({k:v for k,v in result.items() if k not in ['mistOn','mistOff']},flush=True);ctx.close();b.close()
