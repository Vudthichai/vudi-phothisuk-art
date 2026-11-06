"""Offline catalog checks; no HTTP requests, image access or third-party dependencies."""
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1] / 'docs/migration/catalog'

class Paragraphs(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth = 0
        self.values = []
    def handle_starttag(self, tag, attrs):
        if tag in ('p', 'h1', 'h2', 'h3'):
            self.depth += 1
            self.values.append('')
    def handle_endtag(self, tag):
        if tag in ('p', 'h1', 'h2', 'h3'):
            self.depth -= 1
    def handle_data(self, text):
        if self.depth:
            self.values[-1] += text

def load(name):
    return json.loads((ROOT / name).read_text())

catalog = load('inventory.json')
manifest = load('image-manifest.json')
collections = {c['id']: c for c in catalog['collections']}
artworks = {a['id']: a for a in catalog['artworks']}
images = {i['id']: i for i in manifest['images']}
for records, kind in [(catalog['collections'], 'col'), (catalog['artworks'], 'art'), (manifest['images'], 'img')]:
    assert len({r['id'] for r in records}) == len(records), 'Duplicate IDs'
    for r in records:
        assert re.fullmatch(kind + r'_[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}', r['id'])
for artwork in artworks.values():
    assert urlparse(artwork['sourceUrl']).path == artwork['originalPath']
    for cid in artwork['collectionIds']:
        assert artwork['id'] in collections[cid]['artworkIds']
    assert set(artwork['imageIds']) <= images.keys()
    if artwork['sourceStatus'] == 'retrieved':
        source = load('sources/' + artwork['originalPath'].strip('/') + '.json')
        paragraphs = Paragraphs()
        for block in source['blocks']:
            paragraphs.feed(block['html'])
        for text in artwork['descriptionParagraphsVerbatim']:
            assert text in paragraphs.values, 'Description differs from published paragraph'
        assert artwork['technicalTextVerbatim'] in paragraphs.values
        if artwork['sales']['status'] == 'sold':
            assert artwork['sales']['availabilityText'] in paragraphs.values
    else:
        assert not artwork['descriptionParagraphsVerbatim']
for c in collections.values():
    for aid in c['artworkIds']:
        assert c['id'] in artworks[aid]['collectionIds']
for image in images.values():
    assert image['binaryDownloaded'] is False
    assert image['quality'] == 'unverified'
for match in manifest['matches']:
    a = artworks[match['artworkId']]
    assert match['imageId'] in a['imageIds']
    assert match['evidence']['sourceUrl'] == a['sourceUrl']
    assert not match['placementApproved'] and not match['visualMatchVerified']
for file in ROOT.rglob('*.json'):
    json.loads(file.read_text())
print(f"Validated {len(collections)} collections, {len(artworks)} records, {len(images)} image references, verbatim paragraphs, IDs, relationships and paths.")
