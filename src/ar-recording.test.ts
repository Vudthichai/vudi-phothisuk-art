// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { beginRecording, recordingMimeType } from './ar/recording';
class Recorder {
 static isTypeSupported=(type:string)=>type==='video/mp4';
 static instance:Recorder;state='inactive';mimeType='video/mp4';ondataavailable?: (event:{data:Blob})=>void;onstop?:()=>void;onerror?:()=>void;
 constructor(){Recorder.instance=this;}
 start(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['video'])});this.onstop?.();}
}
const stop=vi.fn(),drawImage=vi.fn();
beforeEach(()=>{
 vi.useFakeTimers();vi.stubGlobal('MediaRecorder',Recorder);
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({drawImage} as unknown as CanvasRenderingContext2D);
 Object.defineProperty(HTMLCanvasElement.prototype,'captureStream',{configurable:true,value:()=>({getVideoTracks:()=>[{}],getTracks:()=>[{stop}]})});
 vi.spyOn(performance,'now').mockReturnValue(100);
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();stop.mockClear();drawImage.mockClear();delete (HTMLCanvasElement.prototype as Partial<HTMLCanvasElement>).captureStream;});
function setup(){const complete=vi.fn(),error=vi.fn(),video=document.createElement('video');Object.defineProperties(video,{videoWidth:{value:1280},videoHeight:{value:720}});const session=beginRecording({video,width:393,height:852,onComplete:complete,onError:error});return {session,complete,error,video};}
it('requires both canvas capture and a supported recorder; prefers supported MP4',()=>{
 expect(recordingMimeType()).toBe('video/mp4');vi.stubGlobal('MediaRecorder',undefined);expect(recordingMimeType()).toBeUndefined();
});
it('composites both layers and returns a clip at the explicit twelve-second limit',()=>{
 const {session,complete,error,video}=setup();const overlay=document.createElement('canvas');
 session.draw(overlay);vi.mocked(performance.now).mockReturnValue(160);session.draw(overlay);
 expect(drawImage.mock.calls.some(call=>call[0]===video)).toBe(true);expect(drawImage.mock.calls.some(call=>call[0]===overlay)).toBe(true);
 vi.advanceTimersByTime(12000);expect(complete).toHaveBeenCalledOnce();expect(error).not.toHaveBeenCalled();expect(stop).toHaveBeenCalledOnce();
});
it('discards partial video and releases canvas tracks on cancellation/exit',()=>{
 const {session,complete,error}=setup();session.cancel();session.cancel();vi.advanceTimersByTime(20000);
 expect(complete).not.toHaveBeenCalled();expect(error).not.toHaveBeenCalled();expect(stop).toHaveBeenCalledOnce();
});
it('falls back if the API returns data without rendered composition frames',()=>{
 const {session,complete,error}=setup();session.stop();expect(complete).not.toHaveBeenCalled();expect(error).toHaveBeenCalledOnce();expect(stop).toHaveBeenCalledOnce();
});
it('cleans up a recorder runtime error without publishing partial output',()=>{
 const {session,complete,error}=setup();Recorder.instance.onerror?.();session.cancel();expect(error).toHaveBeenCalledOnce();expect(complete).not.toHaveBeenCalled();expect(stop).toHaveBeenCalledOnce();
});
