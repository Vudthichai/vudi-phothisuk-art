import { Scene, Group, Matrix4, Vector3, Quaternion, PerspectiveCamera, WebGLRenderer, HemisphereLight, DirectionalLight, SRGBColorSpace, PMREMGenerator } from 'three';
import type { SculptureState } from './customTree';
import { createCustomTree } from './customTree';
import { ImagePoseFilter } from './pose';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { ARExperience } from './config';
type TrackerUpdate={type:string;targetIndex:number;worldMatrix:number[]|null};
type Controller={inputWidth:number;inputHeight:number;worker:Worker;addImageTargetsFromBuffer:(buffer:ArrayBuffer)=>{dimensions:number[][]};getProjectionMatrix:()=>number[];dummyRun:(video:HTMLVideoElement)=>void;processVideo:(video:HTMLVideoElement)=>void;stopProcessVideo:()=>void};
type ControllerConstructor=new(options:{inputWidth:number;inputHeight:number;maxTrack:number;warmupTolerance:number;missTolerance:number;filterMinCF:number;filterBeta:number;onUpdate:(data:TrackerUpdate)=>void})=>Controller;
export type ARSession={dispose:()=>void; onFrame:(callback:((canvas:HTMLCanvasElement)=>void)|undefined)=>void;setPresentationPaused:(paused:boolean)=>void};
export async function startTracking({surface,video,experience,signal,onTracking,onError,onSculptureState}:{surface:HTMLElement;video:HTMLVideoElement;experience:ARExperience;signal:AbortSignal;onTracking:(found:boolean)=>void;onError:(error:Error)=>void;onSculptureState?:(state:SculptureState)=>void}):Promise<ARSession> {
  const loadVendor=new Promise<{Controller:ControllerConstructor}>((resolve,reject)=>{
    const script=document.createElement('script');script.type='module';script.src='/ar/vendor/mindar/mindar-image.prod.js';
    script.onload=()=>{const mindar=(window as unknown as {MINDAR?:{IMAGE?:{Controller:ControllerConstructor}}}).MINDAR?.IMAGE;if(mindar)resolve(mindar);else reject(new Error('The local image tracker did not initialize.'));};
    script.onerror=()=>reject(new Error('The local image tracker could not be loaded.'));document.head.append(script);
  });
  const [module,response]=await Promise.all([loadVendor,fetch(experience.targetFile,{signal})]);
  if(!response.ok)throw new Error('The image target could not be loaded.');
  const buffer=await response.arrayBuffer();signal.throwIfAborted();
  const Controller=module.Controller as ControllerConstructor;
  const scene=new Scene(),anchor=new Group(),camera=new PerspectiveCamera();
  anchor.matrixAutoUpdate=false;anchor.visible=false;scene.add(anchor);
  const renderer=new WebGLRenderer({alpha:true,antialias:false,powerPreference:'low-power'});
  renderer.outputColorSpace=SRGBColorSpace;renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.25));renderer.setClearColor(0x000000,0);
  renderer.domElement.className='ar-overlay';surface.appendChild(renderer.domElement);
  const sculpture=createCustomTree({signal,onState:state=>{surface.dataset.sculpture=state;onSculptureState?.(state);}});anchor.add(sculpture.root);
  const pmrem=new PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04,.1,10,{size:128});
  scene.environment=environment.texture;room.dispose();pmrem.dispose();
  const pose=new ImagePoseFilter(),targetPose=new Matrix4();let lastPoseTime=0,frameCallback:((canvas:HTMLCanvasElement)=>void)|undefined;
  scene.add(new HemisphereLight(0xfff8e8,0x3d301d,2));
  const light=new DirectionalLight(0xffe2aa,3);light.position.set(-1,2,3);scene.add(light);
  let controller:Controller|undefined,disposed=false,frame=0,found=false,lastRender=0,presentationPaused=false;
  let postMatrix=new Matrix4();
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const contextLost=(event:Event)=>{event.preventDefault();onError(new Error('The graphics session was interrupted.'));};
  function dispose() {
    if(disposed)return;disposed=true;
    cancelAnimationFrame(frame);window.removeEventListener('resize',resize);renderer.domElement.removeEventListener('webglcontextlost',contextLost);signal.removeEventListener('abort',dispose);
    controller?.stopProcessVideo();controller?.worker.terminate();
    frameCallback=undefined;sculpture.dispose();environment.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
  }
  function resize() {
    if(disposed||!controller)return;
    if(video.videoWidth!==controller.inputWidth||video.videoHeight!==controller.inputHeight) { onError(new Error('Camera orientation changed. Restart AR to recalibrate.'));return; }
    const w=surface.clientWidth,h=surface.clientHeight;
    if(!w||!h)return;
    const scale=Math.max(w/video.videoWidth,h/video.videoHeight),vw=video.videoWidth*scale,vh=video.videoHeight*scale;
    Object.assign(video.style,{width:`${vw}px`,height:`${vh}px`,left:`${(w-vw)/2}px`,top:`${(h-vh)/2}px`});
    const proj=controller.getProjectionMatrix();
    camera.fov=2*Math.atan(1/proj[5]*h/vh)*180/Math.PI;camera.near=proj[14]/(proj[10]-1);camera.far=proj[14]/(proj[10]+1);camera.aspect=w/h;camera.updateProjectionMatrix();
    renderer.setSize(w,h,false);
  }
  signal.addEventListener('abort',dispose,{once:true});
  renderer.domElement.addEventListener('webglcontextlost',contextLost);
  try {
    controller=new Controller({inputWidth:video.videoWidth,inputHeight:video.videoHeight,maxTrack:1,warmupTolerance:5,missTolerance:8,filterMinCF:.001,filterBeta:1000,onUpdate:data=>{
      if(disposed||data.type!=='updateMatrix'||data.targetIndex!==experience.targetIndex)return;
      const visible=data.worldMatrix!==null;anchor.visible=visible;
      if(data.worldMatrix){const now=performance.now()/1000;targetPose.fromArray(data.worldMatrix).multiply(postMatrix);anchor.matrix.copy(pose.update(targetPose,now-lastPoseTime));lastPoseTime=now;}else{pose.reset();}
      if(found!==visible) {found=visible;onTracking(visible);}
    }});
    const {dimensions}=controller.addImageTargetsFromBuffer(buffer);
    if(dimensions.length!==1||!dimensions[experience.targetIndex])throw new Error('The compiled image target is invalid.');
    const [width,height]=dimensions[experience.targetIndex];
    postMatrix.compose(new Vector3(width/2,height/2,0),new Quaternion(),new Vector3(width,width,width));
    resize();controller.dummyRun(video);signal.throwIfAborted();controller.processVideo(video);
    window.addEventListener('resize',resize);
    const animate=(time:number)=>{
      if(disposed)return;
      if(presentationPaused||time-lastRender<1000/30){frame=requestAnimationFrame(animate);return;}lastRender=time;
      const t=time/1000;
      sculpture.update(t,reducedMotion.matches,found);
      renderer.render(scene,camera);frameCallback?.(renderer.domElement);frame=requestAnimationFrame(animate);
    };
    frame=requestAnimationFrame(animate);
    return {dispose,onFrame:callback=>{frameCallback=callback;},setPresentationPaused:paused=>{presentationPaused=paused;}};
  }catch(error){dispose();throw error;}
}
