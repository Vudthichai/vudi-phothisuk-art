"""Deterministic compositing of approved print files; requires development Pillow.
Run with --sources /private/source/directory. Never commit the source photographs.
Only the EMPTY room plate was generated. Artwork is resized/pasted, never generated.
"""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--sources', type=Path, required=True)
parser.add_argument('--verify-only', action='store_true', help='Recheck source/composite integrity without re-encoding assets')
args = parser.parse_args()
layout = json.loads((ROOT/'assets/studio-mockups/layout.json').read_text())
records = json.loads((ROOT/'docs/studio-print-photographs.json').read_text())
output = ROOT/'public/studio-editions/mockups'
output.mkdir(parents=True, exist_ok=True)
manifest = {}
checks = []

def composite(background, artwork, center, pixels_per_inch, width, height, border_inches):
    canvas = background.copy().convert('RGBA')
    size = (round(width*pixels_per_inch), round(height*pixels_per_inch))
    # Both intended sizes and supplied designs are 3:4. Only proportional resize.
    assert abs(artwork.width/artwork.height - width/height) < 0.001
    print_image = artwork.resize(size, Image.Resampling.LANCZOS).convert('RGBA')
    border = max(2, round(border_inches*pixels_per_inch))
    frame_size = (size[0]+2*border, size[1]+2*border)
    x, y = round(center[0]-frame_size[0]/2), round(center[1]-frame_size[1]/2)
    assert x >= 0 and y >= 0 and x+frame_size[0] <= canvas.width and y+frame_size[1] <= canvas.height
    mask = Image.new('L',canvas.size,0)
    ImageDraw.Draw(mask).rectangle((x+5,y+7,x+frame_size[0]+5,y+frame_size[1]+7),fill=65)
    shadow = Image.new('RGBA',canvas.size,(25,22,18,0))
    shadow.putalpha(mask.filter(ImageFilter.GaussianBlur(max(3,pixels_per_inch*.11))))
    canvas = Image.alpha_composite(canvas,shadow)
    frame = Image.new('RGBA',frame_size,(26,27,26,255))
    draw = ImageDraw.Draw(frame)
    draw.line((0,0,frame_size[0]-1,0),fill=(58,58,55,255),width=1)
    draw.line((0,0,0,frame_size[1]-1),fill=(48,49,46,255),width=1)
    frame.paste(print_image,(border,border))
    canvas.alpha_composite(frame,(x,y))
    # Verify every composited artwork pixel equals the proportional source resize.
    roi = canvas.crop((x+border,y+border,x+border+size[0],y+border+size[1]))
    assert ImageChops.difference(roi.convert('RGB'),print_image.convert('RGB')).getbbox() is None
    return canvas.convert('RGB'), {'printPixels':size,'framePixels':frame_size,'positionPixels':[x,y],'pixelsPerInch':pixels_per_inch}

for record in records:
    slug = record['artworkId']
    source = args.sources/record['sourceFilename']
    assert hashlib.sha256(source.read_bytes()).hexdigest() == record['sourceSha256'], f'Unapproved source: {slug}'
    with Image.open(source) as raw:
        art = ImageOps.exif_transpose(raw).convert('RGB')
    manifest[slug] = {}
    for size_id,width,height in [('9x12',9,12),('12x16',12,16)]:
        manifest[slug][size_id] = []
        for kind in ['gallery','lifestyle']:
            spec = layout[kind]
            if kind == 'gallery':
                bg = Image.new('RGB',tuple(spec['canvas']),spec['background'])
                ppi = spec['pixelsPerInch']
                center = (bg.width/2,bg.height/2)
                label = 'Gallery mockup'
            else:
                bg = Image.open(ROOT/spec['background']).convert('RGB')
                ppi = (spec['consoleSpanPixels'][1]-spec['consoleSpanPixels'][0])/spec['assumedConsoleWidthInches']
                center = spec['printCenterPixels']
                label = 'Interior mockup'
            image,check = composite(bg,art,center,ppi,width,height,spec['frameInches'])
            variants=[]
            for edge in spec['longEdges']:
                derivative=image.copy()
                derivative.thumbnail((edge,edge),Image.Resampling.LANCZOS)
                filename=f'{slug}-{kind}-{size_id}-{edge}.webp'
                if not args.verify_only:
                    derivative.save(output/filename,'WEBP',quality=92,method=6)
                else:
                    with Image.open(output/filename) as existing:
                        assert existing.size == derivative.size
                variants.append({'key':filename[:-5],'src':f'/studio-editions/mockups/{filename}','width':derivative.width,'height':derivative.height})
            manifest[slug][size_id].append({'id':f'{slug}-{kind}-{size_id}', 'kind':'framed' if kind=='gallery' else 'lifestyle', 'label':label, 'image':{'id':f'{slug}-{kind}-{size_id}','role':'full','alt':f"{slug.replace('-',' ').title()} {width} × {height} inch Studio Edition design in a slim matte-black frame, {'against warm ivory' if kind=='gallery' else 'on an ivory wall above an oak console'}; composited mockup.",'variants':variants},'approval':'approved-print-composite','modeledSizeIds':[size_id]})
            checks.append({'artworkId':slug,'sizeId':size_id,'kind':kind,'sourceSha256':record['sourceSha256'],'artworkPixelComparison':'exact before web encoding',**check})
            print(slug,size_id,kind,'composited and verified')
(ROOT/'src/studio/mockup-images.json').write_text(json.dumps(manifest,indent=2)+'\n')
(ROOT/'docs/studio-mockup-composition-checks.json').write_text(json.dumps({'layoutVersion':layout['version'],'checks':checks},indent=2)+'\n')
