"""Scale the approved photographed frame/print, rather than rebuilding its paper.
Uses lossless reviewed collection images and the supplied clean room; no AI.
"""
from pathlib import Path
import argparse,hashlib,json
import numpy as np
from PIL import Image,ImageFilter,ImageDraw
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--review-dir',type=Path,required=True);args=p.parse_args()
repo=Path(__file__).resolve().parents[2];args.review_dir.mkdir(parents=True,exist_ok=True)
clean=Image.open(repo/'assets/studio-mockups/approved-clean-room.png').convert('RGB')
reference=Image.open(repo/'public/studio-editions/approved/mother-nature-gallery-still-life.png').convert('RGB')
frame_box=(213,100,917,1044);center=(565,572);small_box=(301,218,829,926)
published=json.loads((repo/'docs/exact-gallery-published-assets.json').read_text());records=[]
# Trace the approved photograph's cast-shadow silhouette, rather than copy
# wall pixels (the supplied clean plate has different fine wall texture).
# Derive its neutral attenuation from the interior of the photographed shadow.
a=np.asarray(reference.filter(ImageFilter.GaussianBlur(2)),dtype=float)
b=np.asarray(clean.filter(ImageFilter.GaussianBlur(2)),dtype=float)
ratio=np.median(a/np.maximum(b,1),axis=2)
opacity=float(np.clip(1-np.median(ratio[200:900,930:949]),.20,.40))
shadow=Image.new('L',clean.size);d=ImageDraw.Draw(shadow)
d.polygon([(213,100),(917,100),(970,128),(970,1082),(246,1082),(213,1044)],fill=round(255*opacity))
shadow=shadow.filter(ImageFilter.GaussianBlur(4))
# Scale only the shadow field about the frame center; scene never moves.
shadow=shadow.transform(clean.size,Image.Transform.AFFINE,(1/.75,0,center[0]*(1-1/.75),0,1/.75,center[1]*(1-1/.75)),Image.Resampling.BICUBIC)
base=np.asarray(clean);alpha=np.asarray(shadow,dtype=float)/255
wall=Image.fromarray(np.round(base*(1-alpha[:,:,None])).clip(0,255).astype('uint8'))
for entry in published:
 slug=entry['artworkId'];path=repo/f'public/studio-editions/exact-gallery/{slug}-1122.webp';approved=Image.open(path).convert('RGB')
 assert hashlib.sha256(np.asarray(approved).tobytes()).hexdigest()==entry['nativeDecodedRgbSha256']
 # Keep the complete photographed frame, paper warmth, printed border and inks.
 frame=np.asarray(approved.crop(frame_box)).copy()
 # A foreground branch crossed the large frame's far-left edge. It belongs to
 # the stationary room, not the resized object; restore only that frame strip.
 yy,xx=np.indices(frame.shape[:2]);leaf=(xx<18)&(frame[:,:,1].astype(int)-frame[:,:,2]>22)&(frame[:,:,0]<200)&(frame.max(axis=2)>70)
 cleanup=np.asarray(Image.fromarray((leaf*255).astype('uint8')).filter(ImageFilter.MaxFilter(5)))>0;cleanup[655:705,:12]=True
 donor=np.median(frame[200:400],axis=0).astype('uint8');frame[cleanup]=np.broadcast_to(donor,frame.shape)[cleanup]
 scaled=Image.fromarray(frame).resize((528,708),Image.Resampling.LANCZOS)
 final=wall.copy();final.paste(scaled,small_box[:2]);pixels=np.asarray(final)
 assert np.array_equal(pixels[218:926,301:829],np.asarray(scaled))
 allowed=np.asarray(shadow)>0;allowed[218:926,301:829]=True
 assert np.array_equal(pixels[~allowed],base[~allowed])
 final.save(args.review_dir/f'{slug}-9x12.png',icc_profile=approved.info.get('icc_profile',b''))
 for width in [480,768,1122]:
  image=final if width==1122 else final.resize((width,round(1402*width/1122)),Image.Resampling.LANCZOS)
  image.save(repo/f'public/studio-editions/size-gallery/{slug}-9x12-{width}.webp','WEBP',lossless=True,method=6,icc_profile=approved.info.get('icc_profile',b''))
 records.append({'artworkId':slug,'approvedLargeRgbSha256':entry['nativeDecodedRgbSha256'],'largeFrameBounds':list(frame_box),'smallFrameBounds':list(small_box),'linearScale':.75,'sameCenter':list(center),'directApprovedFrameResample':True,'paperRecolored':False,'roomOutsideCompositeChangedPixels':0,'nativeRgbSha256':hashlib.sha256(pixels.tobytes()).hexdigest(),'foregroundFrameCleanupPixels':int(cleanup.sum())})
 print(slug,'approved frame and paper scaled exactly 75%; room unchanged outside composite',flush=True)
(repo/'docs/approved-small-mockup-audit.json').write_text(json.dumps(records,indent=2)+'\n')
