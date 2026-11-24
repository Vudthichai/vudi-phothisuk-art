"""Private synthetic fixture: animate the certificate region of a 640x960 camera still; never a physical-device benchmark."""
from PIL import Image
import numpy as np, math, subprocess, argparse
p=argparse.ArgumentParser();p.add_argument('--base-image',required=True);p.add_argument('--output',required=True);args=p.parse_args()
base=Image.open(args.base_image).convert('RGB');paper=base.crop((200,340,440,640));w,h=base.size
assert (w,h)==(640,960), 'Expected the existing 640x960 synthetic certificate fixture, paper bounds (200,340)-(440,640)'
proc=subprocess.Popen(['ffmpeg','-v','error','-f','rawvideo','-pixel_format','rgb24','-video_size',f'{w}x{h}','-framerate','4','-i','-','-pix_fmt','yuv420p','-f','yuv4mpegpipe',args.output,'-y'],stdin=subprocess.PIPE)
for i in range(80):
 t=i/4;dx=13*math.sin(t*.7);dy=8*math.sin(t*.5);tilt=8*math.sin(t*.8)
 dst=[(200+dx+tilt,340+dy),(440+dx-tilt,340+dy+6*math.sin(t*.6)),(440+dx+tilt,640+dy),(200+dx-tilt,640+dy)]
 src=[(0,0),(240,0),(240,300),(0,300)];a=[];b=[]
 for (x,y),(u,v) in zip(dst,src):a.extend([[x,y,1,0,0,0,-u*x,-u*y],[0,0,0,x,y,1,-v*x,-v*y]]);b.extend([u,v])
 coeff=np.linalg.solve(np.array(a),np.array(b));frame=paper.transform((w,h),Image.Transform.PERSPECTIVE,coeff,Image.Resampling.BICUBIC,fillcolor=(247,245,239))
 if 6<=t<9:frame=Image.new('RGB',(w,h),(247,245,239))
 proc.stdin.write(frame.tobytes())
proc.stdin.close();assert proc.wait()==0
