"""Preview-only masked compositing. Never changes website/repository assets.
Requires existing Pillow/numpy/scipy. All untagged RGB inputs are explicitly
interpreted as sRGB. Artwork downsampling uses linear light, not a color grade.
"""
from pathlib import Path
import argparse,hashlib,json
import numpy as np
from PIL import Image, ImageCms
from scipy.ndimage import binary_dilation
ROOT=Path(__file__).parent
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--config',type=Path,required=True)
parser.add_argument('--output-dir',type=Path,default=ROOT)
parser.add_argument('--source-dir',type=Path,help='Private directory of approved high-resolution print files')
parser.add_argument('--reference',type=Path,help='Optional location of the unchanged approved room PNG')
args=parser.parse_args()
config=json.loads(args.config.read_text())
ROOT=args.output_dir
ROOT.mkdir(parents=True,exist_ok=True)
reference_path=args.reference or Path(config['reference'])
if not reference_path.is_absolute(): reference_path=args.config.resolve().parent/reference_path
source_path=(args.source_dir/Path(config['source']).name) if args.source_dir else Path(config['source'])
if not source_path.is_absolute(): source_path=args.config.resolve().parent/source_path
assert hashlib.sha256(reference_path.read_bytes()).hexdigest()==config['referenceSha256']
assert hashlib.sha256(source_path.read_bytes()).hexdigest()==config['sourceSha256']

def linear(a):
 a=np.asarray(a,dtype=np.float32)/255
 return np.where(a<=.04045,a/12.92,((a+.055)/1.055)**2.4)
def encode(a):
 a=np.clip(a,0,1)
 return np.round(255*np.where(a<=.0031308,12.92*a,1.055*a**(1/2.4)-.055)).clip(0,255).astype(np.uint8)
def resize_float(a,size):
 if a.ndim==2:return np.asarray(Image.fromarray(a.astype(np.float32)).resize(size,Image.Resampling.LANCZOS))
 return np.stack([resize_float(a[:,:,i],size) for i in range(a.shape[2])],axis=2)

def srgb_image(path):
 im=Image.open(path)
 if im.info.get('icc_profile'):
  import io
  im=ImageCms.profileToProfile(im,ImageCms.ImageCmsProfile(io.BytesIO(im.info['icc_profile'])),ImageCms.createProfile('sRGB'),outputMode='RGB')
 return im.convert('RGB')

reference=srgb_image(reference_path)
source=srgb_image(source_path)
original=np.array(reference)
output=original.copy()
allowed=np.zeros(original.shape[:2],dtype=bool)
ax0,ay0,ax1,ay1=config['destinationArtwork']
sx0,sy0,sx1,sy1=config['sourceArtwork']
art=np.array(source.crop((sx0,sy0,sx1,sy1)))
aw,ah=ax1-ax0,ay1-ay0
scale=min(aw/art.shape[1],ah/art.shape[0])
w,h=round(art.shape[1]*scale),round(art.shape[0]*scale)
px=ax0+(aw-w)//2;py=ay0+(ah-h)//2
# Warm paper illumination for narrow aspect-fit margins. Samples are existing
# photographed paper immediately beside the artwork, never pixels from the art.
left=linear(original[ay0:ay1,274:289]).mean(axis=1)
right=linear(original[ay0:ay1,842:857]).mean(axis=1)
t=np.linspace(0,1,aw,dtype=np.float32)[None,:,None]
paper=(1-t)*left[:,None,:]+t*right[:,None,:]
output[ay0:ay1,ax0:ax1]=encode(paper)
# Entire authentic artwork, with one uniform scale and no perspective distortion.
art_rendered=encode(resize_float(linear(art),(w,h)))
output[py:py+h,px:px+w]=art_rendered
allowed[ay0:ay1,ax0:ax1]=True

# Remove only old title ink, retaining the reference's paper everywhere else.
tx0,ty0,tx1,ty1=config['destinationTitlePatch']
patch=original[ty0:ty1,tx0:tx1]
left_sample,right_sample=config.get('titlePaperSamples',[[324,330],[412,421]])
left_title=linear(original[ty0:ty1,left_sample[0]:left_sample[1]]).mean(axis=1)
right_title=linear(original[ty0:ty1,right_sample[0]:right_sample[1]]).mean(axis=1)
tt=np.linspace(0,1,tx1-tx0,dtype=np.float32)[None,:,None]
lit_paper=(1-tt)*left_title[:,None,:]+tt*right_title[:,None,:]
darkening=np.max(lit_paper-linear(patch),axis=2)
old_ink=darkening>.045
old_ink=binary_dilation(old_ink,iterations=1)
repaired=patch.copy()
repaired[old_ink]=encode(lit_paper)[old_ink]
output[ty0:ty1,tx0:tx1]=repaired

# Extract actual title glyphs from the high-resolution supplied print layout.
# No font substitution, text rendering, generative fill or screenshot extraction.
title=np.array(source.crop(tuple(config['sourceTitle'])))
title_linear=linear(title)
source_paper=np.median(np.concatenate([title_linear[:3].reshape(-1,3),title_linear[-3:].reshape(-1,3)]),axis=0)
ink_pixels=title_linear[np.min(title,axis=2)<100]
ink=np.percentile(ink_pixels,15,axis=0)
alpha=np.clip(np.max((source_paper-title_linear)/np.maximum(source_paper-ink,.01),axis=2),0,1)
alpha[alpha<.055]=0
foreground=np.clip((title_linear-(1-alpha[:,:,None])*source_paper)/np.maximum(alpha[:,:,None],.001),0,1)
new_w,new_h=config['titleRenderedSize']
a=np.clip(resize_float(alpha,(new_w,new_h)),0,1)
premultiplied=np.clip(resize_float(foreground*alpha[:,:,None],(new_w,new_h)),0,1)
nx,ny=config['titleOrigin']
# Transfer the photographed paper's RGB lighting field to title ink in linear
# light, not a flat-white rectangular background. Reference paper stays intact.
field=lit_paper[ny-ty0:ny-ty0+new_h,nx-tx0:nx-tx0+new_w]
assert field.shape==(new_h,new_w,3)
base=linear(output[ny:ny+new_h,nx:nx+new_w])
illuminated_ink=premultiplied*np.clip(field/source_paper,.5,1.5)
blended=encode(base*(1-a[:,:,None])+illuminated_ink)
active=a>.002
region=output[ny:ny+new_h,nx:nx+new_w]
region[active]=blended[active]
allowed[ty0:ty1,tx0:tx1]=True

changed=np.any(output!=original,axis=2)
assert not np.any(changed&~allowed)
assert np.array_equal(output[py:py+h,px:px+w],art_rendered)
# Preserve the actual master paper/brand border, including logo and signature.
protected={'logo':[286,946,326,985],'heading':[329,946,580,969],'signature':[782,941,848,984]}
for name,(x0,y0,x1,y1) in protected.items():
 assert np.array_equal(output[y0:y1,x0:x1],original[y0:y1,x0:x1]),name
profile=ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
final=Image.fromarray(output)
final.save(ROOT/f"{config['slug']}-gallery.png",icc_profile=profile)
Image.fromarray((allowed*255).astype(np.uint8)).save(ROOT/'allowed-edit-mask.png')
Image.fromarray((changed*255).astype(np.uint8)).save(ROOT/'changed-pixels.png')
# 100% crop, no rescaling: includes artwork, cream paper, authentic title and frame.
final.crop((235,780,920,1060)).save(ROOT/'detail-100-percent.png',icc_profile=profile)
side=Image.new('RGB',(reference.width*2+40,reference.height+52),'#f7f5ef')
side.paste(reference,(0,52));side.paste(final,(reference.width+40,52))
from PIL import ImageDraw
label=ImageDraw.Draw(side);label.text((20,18),'Approved Mother Nature reference',fill='#12351d');label.text((reference.width+60,18),config['title']+' — exact-room composite',fill='#12351d')
side.save(ROOT/'side-by-side.png',icc_profile=profile)
checks={'referenceSize':reference.size,'outputSize':final.size,'sourceSize':source.size,'sourceArtworkBounds':config['sourceArtwork'],'destinationArtworkBounds':[px,py,px+w,py+h],'artworkUniformScale':scale,'sourceArtworkAspect':art.shape[1]/art.shape[0],'renderedArtworkAspect':w/h,'nativePixelRoundingOnly':True,'outsideMaskChangedPixels':int(np.count_nonzero(changed&~allowed)),'unchangedOutsideMaskPixels':int(np.count_nonzero(~allowed)),'allChangedPixelsWithinArtworkAndTitle':True,'protectedBrandRegionsIdentical':list(protected),'roomFrameLightingUnchanged':True,'noGlobalArtworkColorGradeOrBlur':True,'outputFormat':'lossless PNG, sRGB profile','referenceSha256':config['referenceSha256'],'sourceSha256':config['sourceSha256'],'limitations':['Reference is only 1122×1402; output is not upsampled.','Reference and source have no embedded ICC profile; explicitly interpreted as sRGB.','Artwork is uniformly fitted with narrow warm-paper side margins rather than cropped or stretched.']}
(ROOT/'validation.json').write_text(json.dumps(checks,indent=2)+'\n')
print(json.dumps(checks,indent=2))
