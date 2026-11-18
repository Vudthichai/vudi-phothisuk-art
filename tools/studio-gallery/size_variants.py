"""Composite authentic print designs into two sizes on one unchanged supplied scene.
Local asset preparation only; requires existing Pillow/numpy, no AI or network.
"""
from pathlib import Path
import argparse, hashlib, io, json
import numpy as np
from PIL import Image, ImageCms, ImageDraw, ImageFilter

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source-dir', type=Path, required=True, help='Private authentic print JPEGs; never copied to public assets')
parser.add_argument('--review-dir', type=Path, required=True)
parser.add_argument('--artwork', help='Optional single artwork ID for review')
args=parser.parse_args()
repo=Path(__file__).resolve().parents[2]
clean_path=repo/'assets/studio-mockups/approved-clean-room.png'
reference_path=repo/'public/studio-editions/approved/mother-nature-gallery-still-life.png'
clean=Image.open(clean_path).convert('RGB')
reference=Image.open(reference_path).convert('RGB')
assert clean.size==reference.size==(1122,1402)
profile=ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
args.review_dir.mkdir(parents=True,exist_ok=True)
out=repo/'public/studio-editions/size-gallery';out.mkdir(parents=True,exist_ok=True)
# Artist confirms the existing photographed print as the 12x16 reference.
# 55px/inch yields exact 660x880 and 495x660 full-sheet dimensions.
CENTER=(565,572)
FRAME=(213,100,917,1044) # original matte-black photographed frame; 704x944
SHEET=(22,32,682,912) # complete 660x880 sheet within the frame
SUPER=4 # subpixel registration keeps the 495px sheet exactly centered
registry={};audit=[]
configs=[json.loads(p.read_text()) for p in (repo/'tools/studio-gallery/configs').glob('*.json')]
for config in configs:
 slug=config['slug']
 if args.artwork and slug!=args.artwork:continue
 source=args.source_dir/config['source']
 assert hashlib.sha256(source.read_bytes()).hexdigest()==config['sourceSha256']
 im=Image.open(source)
 if im.info.get('icc_profile'):
  im=ImageCms.profileToProfile(im,ImageCms.ImageCmsProfile(io.BytesIO(im.info['icc_profile'])),ImageCms.createProfile('sRGB'),outputMode='RGB')
 else:im=im.convert('RGB') # existing untagged originals interpreted as sRGB
 sheet=im.resize((660*SUPER,880*SUPER),Image.Resampling.LANCZOS)
 pixels=np.asarray(sheet).copy()
 # Warm only unprinted light paper; exclude the entire artwork window and ink.
 sx0,sy0,sx1,sy1=config['sourceArtwork'];h,w=pixels.shape[:2]
 paper=(pixels.min(axis=2)>215)&((pixels.max(axis=2).astype(int)-pixels.min(axis=2))<35)
 paper[round(sy0/im.height*h):round(sy1/im.height*h),round(sx0/im.width*w):round(sx1/im.width*w)]=False
 yy,xx=np.mgrid[0:h,0:w];shade=.985+.015*(1-(.35*xx/max(w-1,1)+.65*yy/max(h-1,1)))
 edge=1-.12*np.exp(-xx/(7*SUPER))-.04*np.exp(-(w-1-xx)/(6*SUPER))
 warmed=np.round(pixels.astype(float)*(shade*edge)[:,:,None]*np.array([1,.985,.95])).clip(0,255).astype('uint8')
 pixels[paper]=warmed[paper]
 sheet=Image.fromarray(pixels,'RGB').convert('RGBA')
 # The old photographed frame has a few foreground leaf pixels crossing its
 # left edge. Clean only those frame pixels using the same frame column above;
 # the supplied scene's leaf is restored at its fixed room coordinate below.
 frame_pixels=np.asarray(reference.crop(FRAME)).copy()
 fy,fx=np.indices(frame_pixels.shape[:2])
 leaf=(fx<18)&(frame_pixels[:,:,1].astype(int)-frame_pixels[:,:,2]>22)&(frame_pixels[:,:,0]<200)&(frame_pixels.max(axis=2)>70)
 cleanup=np.asarray(Image.fromarray((leaf*255).astype('uint8')).filter(ImageFilter.MaxFilter(5))).copy()>0
 cleanup[655:705,:12]=True # include the photographed branch's neutral antialiased fringe
 donor=np.median(frame_pixels[200:400],axis=0).astype('uint8')
 frame_pixels[cleanup]=np.broadcast_to(donor,frame_pixels.shape)[cleanup]
 frame=Image.fromarray(frame_pixels).resize((704*SUPER,944*SUPER),Image.Resampling.LANCZOS).convert('RGBA')
 # Replace the whole old paper opening, including the ten-pixel strips
 # above/below the complete sheet. Extend only its blank outer paper edge;
 # never retain old print pixels or stretch the authentic design to fit.
 opening=np.pad(np.asarray(sheet),((10*SUPER,10*SUPER),(0,0),(0,0)),mode='edge')
 oh=opening.shape[0];oy=np.arange(oh)[:,None]
 inner_shade=1-.08*np.exp(-oy/(8*SUPER))-.04*np.exp(-(oh-1-oy)/(6*SUPER))
 opening[:,:,:3]=np.round(opening[:,:,:3].astype(float)*inner_shade[:,:,None]).clip(0,255).astype('uint8')
 frame.alpha_composite(Image.fromarray(opening),(SHEET[0]*SUPER,(SHEET[1]-10)*SUPER))
 registry[slug]={};records=[];size_results=[]
 for size,factor in [('12x16',1),('9x12',.75)]:
  fw,fh=round(704*factor),round(944*factor)
  x,y=CENTER[0]-fw//2,CENTER[1]-fh//2
  layer=frame.resize((fw,fh),Image.Resampling.LANCZOS)
  mask=Image.new('L',clean.size);ImageDraw.Draw(mask).rectangle((x,y,x+fw-1,y+fh-1),fill=255)
  # Upper-left light: independent contact and soft cast shadows, not a wall patch.
  cast=Image.new('L',clean.size);ImageDraw.Draw(cast).rectangle((x+round(10*factor),y+round(14*factor),x+fw-1+round(10*factor),y+fh-1+round(14*factor)),fill=255)
  cast=cast.filter(ImageFilter.GaussianBlur(9*factor))
  contact=Image.new('L',clean.size);ImageDraw.Draw(contact).rectangle((x+2,y+3,x+fw+1,y+fh+2),fill=255)
  contact=contact.filter(ImageFilter.GaussianBlur(1.6*factor))
  a=np.asarray(cast,dtype=float)/255*.20+np.asarray(contact,dtype=float)/255*.13
  base=np.asarray(clean,dtype=float)
  shadowed=np.round(base*(1-a[:,:,None])).clip(0,255).astype('uint8')
  composed=Image.fromarray(shadowed,'RGB').convert('RGBA');composed.alpha_composite(layer,(x,y));final=composed.convert('RGB')
  # Keep the small photographed branch tip in front of the frame stationary.
  fixed=np.asarray(clean);fg=np.zeros(fixed.shape[:2],dtype=bool)
  tip=fixed[758:802,200:224]
  fg[758:802,200:224]=(tip[:,:,1].astype(int)-tip[:,:,2]>22)&(tip[:,:,0]<200)&(tip.max(axis=2)>70)
  final_pixels=np.asarray(final).copy();final_pixels[fg]=fixed[fg];final=Image.fromarray(final_pixels)
  native=np.asarray(final);allowed=(np.asarray(cast)>0)|(np.asarray(contact)>0)|(np.asarray(mask)>0)
  assert not np.any(native[~allowed]!=np.asarray(clean)[~allowed])
  final.save(args.review_dir/f'{slug}-{size}.png',icc_profile=profile)
  variants=[]
  for width in [480,768,1122]:
   image=final if width==1122 else final.resize((width,round(final.height*width/final.width)),Image.Resampling.LANCZOS)
   path=out/f'{slug}-{size}-{width}.webp';image.save(path,'WEBP',lossless=True,method=6,icc_profile=profile)
   assert np.array_equal(np.asarray(Image.open(path).convert('RGB')),np.asarray(image))
   variants.append({'key':f'{slug}-{size}-{width}','src':'/'+str(path.relative_to(repo/'public')),'width':image.width,'height':image.height})
  registry[slug][size]={'id':f'{slug}-room-{size}','role':'full','alt':f'{config["title"]} {size.replace("x"," × ")} inch Studio Print shown in a black frame above the same sunlit walnut cabinet; illustrative framing, print sold unframed.','variants':variants}
  sheetw,sheeth=660*factor,880*factor
  records.append({'sizeId':size,'sheetPixels':[sheetw,sheeth],'sheetBounds':[CENTER[0]-sheetw/2,CENTER[1]-sheeth/2,CENTER[0]+sheetw/2,CENTER[1]+sheeth/2],'frameBounds':[x,y,x+fw,y+fh],'center':list(CENTER),'outsideCompositeRegionChangedPixels':0,'nativeRgbSha256':hashlib.sha256(native.tobytes()).hexdigest()})
  size_results.append((native,allowed))
 # Across sizes the room is exactly stationary outside the union of overlays/shadows.
 union=size_results[0][1]|size_results[1][1]
 assert np.array_equal(size_results[0][0][~union],size_results[1][0][~union])
 entry={'artworkId':slug,'sourcePrintSha256':config['sourceSha256'],'cleanRoomSha256':hashlib.sha256(clean_path.read_bytes()).hexdigest(),'frameReferenceSha256':hashlib.sha256(reference_path.read_bytes()).hexdigest(),'nativeCanvas':[1122,1402],'sizeReference':'artist-confirmed 12x16 composition; not independent measured room calibration','pixelsPerInch':55,'smallerLinearScale':.75,'stationaryBackgroundOutsideUnion':True,'completeAuthenticDesign':True,'paperOnlyWarmth':True,'foregroundFrameFragmentCleanedPixels':int(cleanup.sum()),'foregroundLeafRestoredAtFixedScenePosition':True,'sizes':records}
 audit.append(entry);print(slug,'75% sheets / fixed center / stationary background / lossless delivery PASS',flush=True)
if not args.artwork:
 (repo/'src/studio/size-gallery-images.json').write_text(json.dumps(registry,indent=2)+'\n')
 (repo/'docs/studio-size-gallery-audit.json').write_text(json.dumps(audit,indent=2)+'\n')
else:
 (args.review_dir/'single-audit.json').write_text(json.dumps(audit,indent=2)+'\n')
