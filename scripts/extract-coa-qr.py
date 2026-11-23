#!/usr/bin/env python3
"""Decode existing physical certificates; never creates or replaces a QR code.

Tooling only: pip install PyMuPDF Pillow zxing-cpp (outside website dependencies).
Output contains extracted physical-certificate text and must stay private.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import fitz
from PIL import Image
import zxingcpp

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('folder', type=Path)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
if 'public' in args.output.resolve().parts:
    parser.error('Private certificate evidence must not be written under public/.')
files = sorted(p for p in args.folder.rglob('*') if p.suffix.lower() == '.pdf' and '__MACOSX' not in p.parts and not p.name.startswith('._'))
if len(files) != 15:
    parser.error(f'Expected exactly 15 physical certificate PDFs; found {len(files)}.')
records = []
for path in files:
    decoded = set()
    with fitz.open(path) as doc:
        text = '\n'.join(page.get_text() for page in doc)
        for page in doc:
            for dpi in [150, 250, 350]:
                pix = page.get_pixmap(dpi=dpi, alpha=False)
                image = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
                decoded.update(code.text for code in zxingcpp.read_barcodes(image) if code.format == zxingcpp.BarcodeFormat.QRCode)
                if decoded:
                    break
    if len(decoded) != 1:
        raise SystemExit(f'{path.name}: expected one distinct QR destination, decoded {sorted(decoded)}')
    url = next(iter(decoded))
    match = re.fullmatch(r'https://vudiphothisukart\.com(/coa/forest-and-flowers/([a-z0-9-]+)/(original|collectors-edition)/)', url)
    if not match:
        raise SystemExit(f'Unexpected exact QR destination (do not silently rewrite it): {url}')
    records.append({'sourceFile': path.name, 'pdfSha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'qrUrl': url, 'path': match[1], 'artworkSlug': match[2], 'designation': match[3], 'physicalCertificateText': text})
if len({record['path'] for record in records}) != 15:
    raise SystemExit('Duplicate destinations: review original certificates before proceeding.')
if sum(record['designation'] == 'original' for record in records) != 10:
    raise SystemExit('Expected 10 originals and 5 Collector’s Editions.')
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps({'records': records}, indent=2, ensure_ascii=False) + '\n')
args.output.chmod(0o600)
print(f'Decoded and verified 15 existing QR destinations. Private evidence: {args.output}')
