"""Local synthetic-certificate recognition checks; never substitutes a target or deploys the app."""
from pathlib import Path
import argparse,json
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--base',default='http://localhost:5193');p.add_argument('--frontal',required=True);p.add_argument('--moving',required=True);p.add_argument('--negative',required=True);p.add_argument('--output',required=True);a=p.parse_args();out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
base=a.base.rstrip('/');result={'environment':'Chromium software WebGL + complete authentic PDF-front camera fixtures; not physical iPhone/printed-card verification','cases':{},'errors':[]}
init="""window.__calls=0;window.__stops=Number(sessionStorage.getItem('tiger-stops')||0);const get=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async(...a)=>{window.__calls++;const stream=await get(...a);stream.getTracks().forEach(t=>{const stop=t.stop.bind(t);t.stop=()=>{window.__stops++;sessionStorage.setItem('tiger-stops',String(window.__stops));stop();};});return stream;};"""
with sync_playwright() as w:
 for name,feed in [('frontal',a.frontal),('moving-oblique',a.moving),('negative-mother-nature',a.negative)]:
  flags=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream',f'--use-file-for-fake-video-capture={Path(feed).resolve()}']
  browser=w.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=flags);context=browser.new_context(viewport={'width':393,'height':852},is_mobile=True,has_touch=True);context.add_init_script(init);page=context.new_page();page.set_default_timeout(90000);page.on('pageerror',lambda e:result['errors'].append(str(e)));urls=[];page.on('request',lambda r:urls.append(r.url))
  page.goto(base+'/tiger-lily-ar.html?mode=recognition&debug=1',wait_until='networkidle');assert page.evaluate('__calls')==0;assert page.locator('#ar-target-preview').get_attribute('src')=='/ar/targets/tiger-lily-original.jpg';assert 'Tiger Lily' in page.locator('h1').inner_text();page.screenshot(path=str(out/f'{name}-intro.png'))
  page.evaluate("""()=>{window.__found=false;window.__events=[];const r=document.querySelector('#ar-root');new MutationObserver(()=>{const s=r.dataset.tracking;if(s==='found')window.__found=true;__events.push({at:performance.now(),state:s});}).observe(r,{attributes:true,attributeFilter:['data-tracking']});}""")
  page.get_by_role('button',name='Start camera',exact=True).click();page.locator('.ar-surface[data-sculpture=ready]').wait_for(state='attached')
  if name.startswith('negative'):
   page.wait_for_timeout(12000);assert not page.evaluate('__found');case={'recognized':False,'observationSeconds':12};page.screenshot(path=str(out/'negative-no-match.png'))
  else:
   page.locator('#ar-root[data-tracking=found]').wait_for(state='attached',timeout=120000);page.wait_for_timeout(2500);page.screenshot(path=str(out/f'{name}-recognized.png'));case={'recognized':True}
   if name=='moving-oblique':
    page.wait_for_function('window.__events.some((e,i)=>e.state==="found"&&window.__events.slice(i+1).some((x,j)=>x.state==="searching"&&window.__events.slice(i+j+2).some(y=>y.state==="found")))',timeout=90000);case['reacquiredAfterOcclusion']=True
   case['metrics']=json.loads(page.locator('[data-recognition-metrics]').inner_text());case['trackingEvents']=page.evaluate('__events')
  assert not any('.glb' in u for u in urls);assert not any('mother-nature-original.mind' in u for u in urls);assert any('tiger-lily-original.mind' in u for u in urls);case['noModelRequests']=True;case['noMotherTargetRequests']=True
  page.get_by_role('button',name='Exit AR',exact=True).click(force=True);page.wait_for_url('**/coa/forest-and-flowers/tiger-lily/original/');assert page.evaluate('__stops')>=1;case['cameraStopped']=True;result['cases'][name]=case;print(name,{k:v for k,v in case.items() if k not in ['metrics','trackingEvents']},flush=True)
  context.close();browser.close()
 # Camera denial stays graceful, and the certificate uses the approved collection route.
 b=w.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);ctx=b.new_context();ctx.add_init_script("navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('denied','NotAllowedError');};");page=ctx.new_page();page.goto(base+'/tiger-lily-ar.html');page.get_by_role('button',name='Start camera',exact=True).click();page.locator('#ar-root[data-state=error]').wait_for(state='attached');assert 'permission was not granted' in page.locator('#ar-status').inner_text();result['permissionDeniedHandled']=True
 page.goto(base+'/coa/forest-and-flowers/tiger-lily/original/');page.get_by_role('link',name='Experience in Augmented Reality',exact=True).click();assert page.locator('.certificate-ar-modal iframe').get_attribute('src')=='/ar-camera.html?hub=1&experience=tiger-lily-original&variant=final'
 page.goto(base+'/ar-camera.html?experience=tiger-lily-original');assert page.get_by_role('button',name='Start camera',exact=True).is_disabled();result['normalEntryDisabled']=True;ctx.close();b.close()
assert not result['errors'];result['passed']=True;(out/'verification.json').write_text(json.dumps(result,indent=2));print('TIGER RECOGNITION CHECKS PASSED',flush=True)
