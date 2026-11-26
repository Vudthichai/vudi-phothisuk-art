#!/usr/bin/env python3
"""Private camera fixture from an authentic complete PDF front. Never changes the extracted tracking target."""
import argparse, math, subprocess
from pathlib import Path
import fitz,numpy as np
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--pdf',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--mode',choices=['frontal','oblique','moving'],default='moving');p.add_argument('--seconds',type=int,default=90);a=p.parse_args()
with fitz.open(a.pdf) as doc:
 pix=doc[0].get_pixmap(matrix=fitz.Matrix(2,2),alpha=False);paper=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
w,h=640,960;fps=4
proc=subprocess.Popen(['ffmpeg','-v','error','-f','rawvideo','-pixel_format','rgb24','-video_size',f'{w}x{h}','-framerate',str(fps),'-i','-','-pix_fmt','yuv420p','-f','yuv4mpegpipe',str(a.output),'-y'],stdin=subprocess.PIPE)
for i in range(a.seconds*fps):
 t=i/fps;dx=12*math.sin(t*.7) if a.mode=='moving' else 0;dy=8*math.sin(t*.5) if a.mode=='moving' else 0;tilt=8*math.sin(t*.8) if a.mode=='moving' else 0
 dst=[(120,180),(520,180),(520,740),(120,740)] if a.mode=='frontal' else [(150+dx+tilt,245+dy),(485+dx-tilt,255+dy),(540+dx+tilt,720+dy),(105+dx-tilt,705+dy)]
 src=[(0,0),(paper.width,0),(paper.width,paper.height),(0,paper.height)];m=[];v=[]
 for (x,y),(u,z) in zip(dst,src):m.extend([[x,y,1,0,0,0,-u*x,-u*y],[0,0,0,x,y,1,-z*x,-z*y]]);v.extend([u,z])
 coeff=np.linalg.solve(np.array(m),np.array(v));frame=paper.transform((w,h),Image.Transform.PERSPECTIVE,coeff,Image.Resampling.BICUBIC,fillcolor=(219,218,211))
 if a.mode=='moving' and 8<=t%30<14:frame=Image.new('RGB',(w,h),(219,218,211))
 proc.stdin.write(frame.tobytes())
proc.stdin.close();assert proc.wait()==0
print(f'Created {a.mode} fixture from complete {a.pdf.name} front; {a.seconds}s at {fps} FPS. Synthetic, not physical recognition evidence.')
