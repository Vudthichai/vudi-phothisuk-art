"""Prepare local web derivatives of reviewed composites. No network/deployment.
Requires existing development Pillow/numpy; print-production JPEGs are not read.
"""
from pathlib import Path
import argparse,hashlib,json
import numpy as np
from PIL import Image,ImageChops
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--review-root',type=Path,required=True)
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
review=args.review_root
rows=json.loads((review/'validation-summary.json').read_text())
reference=np.array(Image.open(review/'approved-mother-nature-room-master.png').convert('RGB'))
assert (review/'approved-mother-nature-room-master.png').read_bytes()==(root/'public/studio-editions/approved/mother-nature-gallery-still-life.png').read_bytes()
out=root/'public/studio-editions/exact-gallery';out.mkdir(parents=True,exist_ok=True)
manifest={};audit=[]
for row in rows:
 slug=row['slug'];source=review/slug/f'{slug}-gallery.png'
 assert hashlib.sha256(source.read_bytes()).hexdigest()==row['fileSha256']
 with Image.open(source) as source_image:
  image=source_image.convert('RGB');profile=source_image.info.get('icc_profile',b'')
  pixels=np.array(image);mask=np.array(Image.open(review/slug/'allowed-edit-mask.png'))>0
  assert not np.any(np.any(pixels!=reference,axis=2)&~mask)
  variants=[]
  for width in [480,768,1122]:
   height=round(image.height*width/image.width)
   derivative=image if width==image.width else image.resize((width,height),Image.Resampling.LANCZOS)
   dest=out/f'{slug}-{width}.webp'
   derivative.save(dest,'WEBP',lossless=True,method=6,icc_profile=profile)
   with Image.open(dest) as decoded:assert ImageChops.difference(derivative,decoded.convert('RGB')).getbbox() is None
   variants.append({'key':dest.stem,'src':f'/studio-editions/exact-gallery/{dest.name}','width':width,'height':height})
  manifest[slug]={'id':f'{slug}-exact-gallery','role':'full','alt':f"{row['title']} Studio Edition in the approved black frame above a wooden cabinet, with flowering vase, art books and natural sunlight; composited gallery view.",'variants':variants}
  check=json.loads((review/slug/'validation.json').read_text())
  audit.append({'artworkId':slug,'reviewedPngSha256':row['fileSha256'],'approvedPrintSourceSha256':check['sourceSha256'],'roomMasterSha256':check['referenceSha256'],'outsideMaskChangedPixels':0,'nativeSize':[image.width,image.height],'nativeDecodedRgbSha256':hashlib.sha256(pixels.tobytes()).hexdigest(),'delivery':'lossless WebP; native decoded pixels identical to reviewed PNG; smaller copies resized proportionally'})
  print(slug,'review checksum, room/frame identity and lossless derivatives verified')
(root/'src/studio/exact-gallery-images.json').write_text(json.dumps(manifest,indent=2)+'\n')
(root/'docs/exact-gallery-published-assets.json').write_text(json.dumps(audit,indent=2)+'\n')
