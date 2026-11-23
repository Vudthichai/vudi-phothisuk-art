/** Local-only video capture. Composite synchronously after WebGL render, never record the raw camera alone. */
export const CLIP_SECONDS=12;
export function recordingMimeType():string|undefined {
  if(typeof MediaRecorder==='undefined'||typeof HTMLCanvasElement.prototype.captureStream!=='function')return;
  // MP4 first for Apple share-sheet compatibility; never infer support from the user agent.
  return ['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp8','video/webm'].find(type=>MediaRecorder.isTypeSupported(type));
}
export function coverRect(sourceWidth:number,sourceHeight:number,width:number,height:number) {
  const scale=Math.max(width/sourceWidth,height/sourceHeight);
  return {x:(width-sourceWidth*scale)/2,y:(height-sourceHeight*scale)/2,width:sourceWidth*scale,height:sourceHeight*scale};
}
export type LocalRecording={draw:(overlay:HTMLCanvasElement)=>void;stop:()=>void;cancel:()=>void};
export function beginRecording({video,width,height,onComplete,onError,onStarted}:{video:HTMLVideoElement;width:number;height:number;onComplete:(blob:Blob)=>void;onError:()=>void;onStarted?:()=>void}):LocalRecording {
  const mimeType=recordingMimeType();if(!mimeType)throw new Error('Composite recording unavailable');
  const canvas=document.createElement('canvas'),ratio=Math.min(1,720/Math.max(width,height));
  canvas.width=Math.max(2,Math.round(width*ratio/2)*2);canvas.height=Math.max(2,Math.round(height*ratio/2)*2);
  const context=canvas.getContext('2d',{alpha:false});if(!context)throw new Error('Canvas unavailable');
  let stream:MediaStream|undefined,recorder:MediaRecorder|undefined,done=false,cancelled=false,lastFrame=0,frames=0,timer=0,stopTimer=0;
  const chunks:Blob[]=[];
  function release(){clearTimeout(timer);clearTimeout(stopTimer);stream?.getTracks().forEach(track=>track.stop());canvas.width=canvas.height=2;}
  function error(){if(done)return;done=true;cancelled=true;if(recorder?.state!=='inactive')try{recorder?.stop();}catch{/* already failed */}release();onError();}
  try {
    // Start with the video filled in; subsequent frames always include the rendered overlay.
    const rect=coverRect(video.videoWidth,video.videoHeight,canvas.width,canvas.height);context.drawImage(video,rect.x,rect.y,rect.width,rect.height);
    stream=canvas.captureStream(24);if(stream.getVideoTracks().length!==1)throw new Error('No canvas capture track');
    recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:2_500_000});
    recorder.ondataavailable=event=>{if(!cancelled&&event.data.size)chunks.push(event.data);};
    recorder.onerror=error;
    recorder.onstop=()=>{
      if(done)return;done=true;
      const blob=new Blob(chunks,{type:recorder?.mimeType||mimeType});release();
      if(cancelled)return;if(frames<2||!blob.size){onError();return;}onComplete(blob);
    };
    recorder.start(1000);
    timer=window.setTimeout(error,6000);
  }catch(cause){release();throw cause;}
  function stop(){if(done||recorder?.state==='inactive')return;clearTimeout(timer);recorder?.stop();stopTimer=window.setTimeout(error,5000);}
  return {
    draw(overlay){
      if(done||cancelled||recorder?.state!=='recording')return;
      const now=performance.now();if(now-lastFrame<1000/24)return;lastFrame=now;
      try{
        const rect=coverRect(video.videoWidth,video.videoHeight,canvas.width,canvas.height);
        context.drawImage(video,rect.x,rect.y,rect.width,rect.height);context.drawImage(overlay,0,0,canvas.width,canvas.height);
        if(frames===0){clearTimeout(timer);timer=window.setTimeout(()=>stop(),CLIP_SECONDS*1000);onStarted?.();}frames++;
      }catch{error();}
    },stop,
    cancel(){if(done)return;cancelled=true;done=true;if(recorder?.state!=='inactive')try{recorder?.stop();}catch{/* best effort */}chunks.length=0;release();}
  };
}
