#!/usr/bin/env python3
"""Extract a web-size target from an authentic certificate front; never alters its PDF."""
import argparse,hashlib,io,json
from pathlib import Path
import fitz
from PIL import Image
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('pdf',type=Path);p.add_argument('--xref',type=int,required=True);p.add_argument('--output',type=Path,required=True)
p.add_argument('--certificate-path',required=True);p.add_argument('--reuse',action='store_true')
a=p.parse_args()
with fitz.open(a.pdf) as doc:
 page=doc[0]
 if a.xref not in [i[0] for i in page.get_images(full=True)]:raise SystemExit('Select an image actually embedded on the certificate front.')
 data=doc.extract_image(a.xref);image=Image.open(io.BytesIO(data['image'])).convert('RGB');original=image.size
 pixels=hashlib.sha256(image.tobytes()).hexdigest();pdfhash=hashlib.sha256(a.pdf.read_bytes()).hexdigest()
 evidence={'path':a.certificate_path,'pdfSha256':pdfhash,'imagePixelsSha256':pixels}
 if a.reuse:
  meta=json.loads(a.output.with_suffix('.json').read_text())
  if pixels!=meta['embeddedImagePixelsSha256']:raise SystemExit('The front artwork images differ. Compile a separate target instead of reusing this one.')
  meta['certificateSources']=[s for s in meta['certificateSources'] if s['path']!=a.certificate_path]+[evidence]
  a.output.with_suffix('.json').write_text(json.dumps(meta,indent=2)+'\n')
  print('Registered identical artwork image for target reuse. Review its actual printed proportions before enabling.');raise SystemExit(0)
 image.thumbnail((1024,1024),Image.Resampling.LANCZOS)
 a.output.parent.mkdir(parents=True,exist_ok=True);image.save(a.output,quality=92,subsampling=0,optimize=True)
 meta={'sourcePdfSha256':hashlib.sha256(a.pdf.read_bytes()).hexdigest(),'page':1,'embeddedImageXref':a.xref,'imageBoundsPt':list(page.get_image_rects(a.xref)[0]),'embeddedDimensions':list(original),'targetDimensions':list(image.size),'targetImageSha256':hashlib.sha256(a.output.read_bytes()).hexdigest(),'operation':'Exact embedded front-image selection; proportional downsample only. No crop, recoloring, or artwork generation.','collectorsEditionCompatible':False,'embeddedImagePixelsSha256':pixels,'certificateSources':[evidence]}
 a.output.with_suffix('.json').write_text(json.dumps(meta,indent=2)+'\n')
 print(f'Extracted {image.width} × {image.height} target. Compile it and review the actual print before enabling AR.')
