"""Make back-layout proofs from explicitly selected private bleed masters."""
import argparse
import re
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from pypdf.generic import DecodedStreamObject, NameObject

MEDIA = (0, 0, 378, 522)
TRIM = (9, 9, 369, 513)
DIVIDER = b'n 38 122 m 322 122 l S'
QR_AND_CAPTION = re.compile(
    rb'1 1 1 rg\nn 250 47 72 72 re f\*\n0 0 0 rg\n'
    rb'n [0-9. re]+\nf\*\n(\.070588 \.207843 \.113725 rg)\n'
    rb'BT [^\n]+ (/F[^ ]+) 6\.5 Tf [^\n]+ \(Scan to explore the artwork\) Tj ET'
)


def refine_back(page):
    content = page.get_contents().get_data()
    matches = list(QR_AND_CAPTION.finditer(content))
    if len(matches) != 1 or content.count(DIVIDER) != 1:
        raise ValueError('Expected one legacy vector QR, caption, and footer divider')

    match = matches[0]
    green, font_key = match.groups()
    font = page['/Resources']['/Font'][font_key.decode()]
    widths = font['/Widths']
    first = font['/FirstChar']
    size = 7.5
    center = 281.5
    captions = []
    for wording, baseline in [('SCAN TO VIEW YOUR', 37), ('DIGITAL CERTIFICATE', 27.5)]:
        width = sum(widths[ord(char) - first] for char in wording) * size / 1000
        x = center - width / 2
        captions.append(
            f'BT {font_key.decode()} {size} Tf 0 Tc 1 0 0 1 {x:.4f} {baseline} Tm '
            f'({wording}) Tj ET'.encode('ascii')
        )

    # Scale the original symbol and quiet zone together, without re-encoding it.
    # Translate the original 72 pt square to (241, 48) and enlarge it to 81 pt.
    qr = content[match.start():match.start(1)]
    replacement = b'q\n1.125 0 0 1.125 -40.25 -4.875 cm\n' + qr + b'Q\n'
    replacement += green + b'\n' + b'\n'.join(captions)
    updated = content[:match.start()] + replacement + content[match.end():]
    return updated.replace(DIVIDER, b'n 38 122 m 222 122 l S')


def make_proof(source, output):
    reader = PdfReader(source)
    if len(reader.pages) != 2 or any(
        tuple(page.mediabox) != MEDIA or tuple(page.bleedbox) != MEDIA
        or tuple(page.trimbox) != TRIM or page.rotation
        for page in reader.pages
    ):
        raise ValueError(f'Expected a two-sided 5 × 7 inch master with 1/8 inch bleed: {source}')

    writer = PdfWriter(clone_from=reader)
    back = writer.pages[1]
    stream = DecodedStreamObject()
    stream.set_data(refine_back(back))
    back[NameObject('/Contents')] = writer._add_object(stream.flate_encode())
    # Refuse accidental overwrites of masters and previous proofs.
    with output.open('xb') as file:
        writer.write(file)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('masters', type=Path, nargs='+')
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for source in args.masters:
        make_proof(source, args.output_dir / f'{source.stem.removesuffix("-bleed")}-proof.pdf')


if __name__ == '__main__':
    main()
