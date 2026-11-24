"""Private frozen-pose visual authoring check, using source modules from a local Vite dev server. No camera or physical-performance claims."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,argparse
p=argparse.ArgumentParser();p.add_argument('--base',default='http://localhost:5189');p.add_argument('--output',default='/workspace/previews/rainforest-v5-review');args=p.parse_args()
out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':720,'height':960});page.set_default_timeout(120000);page.goto(args.base.rstrip('/')+'/rainforest-v5.html',wait_until='networkidle')
 result=page.evaluate('''async()=>{
 const T=await import('/node_modules/.vite/deps/three.js');const {setupRainforestLab}=await import('/src/ar/experimental/rainforest.ts');const {RoomEnvironment}=await import('/node_modules/three/examples/jsm/environments/RoomEnvironment.js');
 document.body.innerHTML='<main id="fixture"><div class="ar-surface"></div><div class="ar-controls"></div><div class="ar-actions"></div><div class="ar-guidance"></div></main>';document.querySelector('#fixture').style.display='none';document.body.style.margin='0';
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,720/960,.01,100);camera.up.set(0,0,1);camera.position.set(2.4,-3.6,2.7);camera.lookAt(0,-.4,.65);camera.updateProjectionMatrix();
 const renderer=new T.WebGLRenderer({alpha:false,antialias:false});renderer.setSize(720,960);renderer.outputColorSpace=T.SRGBColorSpace;document.body.append(renderer.domElement);
 const pm=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),env=pm.fromScene(room,.04,.1,10,{size:128});scene.environment=env.texture;room.dispose();pm.dispose();
 scene.add(new T.HemisphereLight(0xf4f8f4,0x26352c,2));const light=new T.DirectionalLight(0xfff5e4,3);light.position.set(-1,2,3);scene.add(light);
 const host=document.querySelector('#fixture'),lab=setupRainforestLab(host,{atmosphere:true,diagnostics:true,leafEnabled:true});const states=[];const sculpture=lab.factory({signal:new AbortController().signal,onState:s=>states.push(s),onError:e=>{throw e;},view:{scene,camera}});scene.add(sculpture.root);
 await new Promise((resolve,reject)=>{const end=Date.now()+90000;const tick=()=>{if(states.includes('ready'))return resolve();if(Date.now()>end)return reject('model timeout');setTimeout(tick,20);};tick();});
 sculpture.update(0,false,true);sculpture.update(.7,false,true);sculpture.update(12,false,true);sculpture.update(14,false,true);
 const draw=(bg,mist)=>{renderer.setClearColor(bg);const checkbox=host.querySelector('[data-mist]');checkbox.checked=mist;checkbox.dispatchEvent(new Event('input',{bubbles:true}));renderer.render(scene,camera);return {...renderer.info.render};};
 window.__review={scene,camera,renderer,lab,sculpture,draw};return {flowers:host.dataset.flowerCount,leafActive:host.dataset.leafActive,states};}''');print(result,flush=True)
 stats={}
 for name,color in [('ivory',0xf7f5ef),('dark',0x393c36)]:
  for enabled in [True,False]:
   stats[f'{name}-{enabled}']=page.evaluate('([bg,mist])=>__review.draw(bg,mist)',[color,enabled]);page.screenshot(path=str(out/f'{name}-mist-{"on" if enabled else "off"}.png'))
 
 for t in [15,16,17,18,19]:
  info=page.evaluate('(t)=>{__review.sculpture.update(t,false,true);__review.draw(0xf7f5ef,true);const m=__review.scene.getObjectByName("Occasional foreground rainforest leaf");return {time:t,visible:m.visible,opacity:m.material.opacity,ndc:m.position.clone().project(__review.camera).toArray(),scale:m.scale.x};}',t);print(info,flush=True);page.screenshot(path=str(out/f'foreground-leaf-{t}.png'))
  if t==15:
   page.evaluate('()=>{__review.scene.getObjectByName("Occasional foreground rainforest leaf").visible=false;__review.draw(0xf7f5ef,true);}');page.screenshot(path=str(out/'foreground-leaf-15-off.png'))
 page.evaluate('()=>{const leaf=__review.scene.getObjectByName("Occasional foreground rainforest leaf");leaf.visible=false;__review.draw(0xf7f5ef,true);}')
 page.screenshot(path=str(out/'foreground-leaf-19-off.png'))
 (out/'stats.json').write_text(json.dumps({'setup':result,'renders':stats},indent=2));print(stats,flush=True);page.evaluate('()=>{__review.sculpture.dispose();__review.lab.dispose();__review.renderer.dispose();}');b.close()
