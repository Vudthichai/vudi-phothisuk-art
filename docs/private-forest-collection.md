# Forest & Flowers — protected preview

## Status and source

The entrance and all artwork URLs use the existing React layout/navigation. A
server-side Netlify Function protects both collection JSON and new image delivery.
There is no client-side password comparison or plaintext protected data in the
public browser bundle. The existing homepage Mother Nature interaction is unchanged.
No artwork was added to Available Art, and public collection data/navigation stays
unchanged. Only the existing Forest & Flowers route now leads to the private gate.

The authoritative artist upload contained Forest-and-Flowers-Descriptions.pdf and
IMG_6921.jpg, IMG_6922.jpg, IMG_6923.jpg. First-nine text and introduction were
extracted verbatim, with PDF line wrapping normalized into paragraphs. The full
Junglekeepers donation paragraph is preserved. the tenth painting uses the artist's
supplied provisional copy, explicitly labeled pending approval. Its dimensions and
medium are not guessed.

Temporary images: the existing prepared Mother Nature photograph, eight photographs
extracted from the artist's PDF, and all three uploaded the tenth painting photographs
(full/angle/detail). Optimization produces 640px/1200px WebP copies, preserves full
proportions/white borders, removes EXIF/XMP metadata while retaining color profiles,
and does not crop, recolor or alter the paintings. PDF photos retain their original
surroundings until final professionally prepared photographs are supplied.

A private backup of the input registry, optimized images and matching runtime
settings is saved at `/workspace/forest-inputs/private-forest-backup.zip`. Keep it
private and download a backup before the execution workspace expires.

The source originals and plaintext image registry are intentionally OUTSIDE this
public GitHub repository, in the execution workspace under `/workspace/forest-inputs/`.
The uploaded ZIP remains there through its attachment path. The PDF and original
uploaded JPEG files are preserved; optimized plaintext is in `private-package/`. None is
copied into public/ or dist/. Do not commit any of those originals/plaintext files.

## Runtime setup — required before the Netlify preview can unlock

Set these two secret environment variables in the existing Netlify project's
configuration, available to Functions in the desired deploy-preview/production
contexts. Do not use VITE_ prefixes or put values in this public repository:

- `FOREST_COLLECTION_PASSWORD`: the visitor password requested by the artist.
- `FOREST_COLLECTION_CONTENT_KEY`: the exact random base64 32-byte key used to
  create the committed encrypted package. An unrelated new key will NOT decrypt it.

The matching values were saved outside Git at
`/workspace/forest-inputs/forest-preview.env` (owner read/write only). Transfer them
privately through Netlify's environment-variable UI. Do not attach this file to a
public PR. Preserve a private backup of the key and artist input package; encrypted
content cannot be recovered without them. The runtime file is not included in this
PR or the public build. After setting variables, deploy/redeploy the approved branch
with those variables. This PR does not change account configuration or deploy itself.
Until setup is complete, the API returns 503 and reveals no collection content.
There is no insecure fallback. The visitor password is also absent from the source.

Netlify Functions are used within the existing hosting project; no new hosting,
auth provider, subscription, dependency or plan upgrade is introduced. Deployment
and account/usage availability on the actual Netlify project still require checking.
No production deployment is claimed by local tests.

## Local review

From the repository root, run:

```
node --env-file=/workspace/forest-inputs/forest-preview.env node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174
```

Open `http://localhost:5174/collections/forest-and-flowers`. Use localhost for local
Secure-cookie testing; production requires HTTPS. The development-only Vite adapter
invokes the SAME function handler, not a client-side bypass. Without the runtime
file/settings, ordinary `npm run dev` correctly shows the closed entrance.

## Image/data registry and future replacements

The private input directory contains `collection.json` and `images/`. Each artwork
has its ID/slug/title, exact paragraphs, dimensions/medium, provisional-copy flag,
availability and multiple image records. An image contains role/alt and variants
with stable keys, actual width/height and a plaintext input filename. The UI and
inquiry links use these records; no per-artwork component rewrite is needed.

Replace temporary input photographs with approved optimized copies and update their
variant metadata/alt text in that private registry. Keep the originals separately.
Then run, using the SAME private key:

```
node --env-file=/workspace/forest-inputs/forest-preview.env scripts/package-forest.mjs /workspace/forest-inputs/private-package
```

Review a fresh encrypted package before committing it. The script generates random
opaque filenames and AES-256-GCM envelopes (`VFF1`, nonce, tag, ciphertext). The
manifest is encrypted too: descriptions and artwork/image names are not recoverable
from committed ciphertext without the key. The packaging script is maintenance
only and never runs during Netlify build. To rotate the content key, re-encrypt the
entire private input package and update the Netlify variable together. Remove old
unreferenced encrypted files when deliberately regenerating a package.

## Actual security properties and limits

- The server checks the password and issues an HMAC-signed `__Host-` session cookie,
  with HttpOnly, Secure, SameSite=Strict, Path=/ and no persistent cookie expiry.
  Server validation limits a session to eight hours. Reloads and direct detail
  URLs reuse this browser-session cookie. Password changes invalidate old signatures.
- Every image request uses the same session check and an exact whitelist. Arbitrary
  paths/source files cannot be requested. Runtime decryption occurs only after
  authorization. Both JSON and images use private/no-store, nosniff and noindex.
- Relock clears the browser cookie and removes loaded collection content. Exit
  returns to existing collections; access intentionally remains for that session
  until relocked. Browsers that restore sessions may restore session cookies too.
- Shared-password access is not individual accounts or copy protection. Authorized
  viewers can save what they see. Previously copied valid cookies expire within
  eight hours; clearing one browser cookie is not global revocation. The supplied
  low-friction password should not be treated as high-assurance authentication.
- Mother Nature's already-public homepage image remains publicly accessible; this
  cannot make that previously released photograph private. New photographs and all
  new protected text are encrypted in Git and gated on the website.
- Noindex/nofollow/noarchive HTTP headers cover the collection and descendant paths;
  the React gate also sets a generic private title/description and robots metadata.
  There is no new sitemap and no protected artwork entries in public collection data.

## Availability and motion

Eight originals are explicitly provisional, with availability to be confirmed and
Inquire for Pricing email links including the artwork title. No numerical prices.
Two artist-designated works are Not for Sale and have no purchase/pricing inquiry
control. the tenth painting's dimensions remain to be confirmed. Final photographs,
the tenth painting copy/dimensions/medium and the eight provisional availability records
still need artist confirmation before launch.

Only a manual, one-shot two-element Phase 1 leaf/petal drift is offered in the
introduction. It uses existing production cutouts and reduced-motion CSS. No bloom,
mushroom, vine, experimental bark or Phase 4 prototype is imported into this visitor
experience. The collection works fully with motion disabled.

## Checks

- `npm test`: existing suite plus frontend gate and server/auth/crypto tests.
- `npm run build`: TypeScript and production bundle.
- `node scripts/check-private-previews.mjs`: Phase 2–4 experiments remain excluded.
- `node --env-file=/workspace/forest-inputs/forest-preview.env scripts/check-protected-forest.mjs`:
  validates encryption envelopes and scans dist for password/key and decrypted
  paragraphs. Without private settings it still checks package/static isolation.

Local Chromium checks cover wrong/right passwords, gated direct artwork URLs,
session reload, relock/image denial, ten records, three uploaded views, two NFS
exceptions, eight inquiry links, exact donation text, contain image fitting and no
horizontal overflow at 375/390/1440px. Actual Netlify deployed-function behavior and
real Safari/device review remain pending. No automatic merge or publication.
