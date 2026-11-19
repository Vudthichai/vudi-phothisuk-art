# Vudi Phothisuk Art — master audit
**Audit date:** November 18, 2026, America/New_York. Some evidence files carry November 19 UTC timestamps.  
**Website:** https://vudiphothisukart.com/  
**Production/main commit:** `03d1d4ec15705715db9ed4bd7f4c30c511129007`.  
**Scope:** investigation and reporting only. No implementation, price changes, new branches, commits, PRs, deployment or infrastructure changes.

## Executive assessment

The website is a credible, visually distinctive **inquiry-led emerging-artist portfolio**. Its technical foundation is materially stronger than its publicly documented career record and transaction readiness. The live site ships readable HTML, consistent canonical identity, artwork narratives, structured data, responsive imagery, and working inquiry paths. It does not need another wholesale redesign.

The next gains should come from **confirmed artwork records, acquisition clarity, verifiable professional history, controlled image exposure, and exhibition follow-through**. Room mockups and typography already communicate care; further visual polish cannot establish collector demand or gallery standing.

**Realistic position:** the evidence supports a locally active emerging artist with a coherent dimensional practice and a professional direct-inquiry presentation. Public event/fundraising appearances are observable. A sustained regional gallery record, national/international institutional recognition, repeat-collector demand and realized sales at current asking prices were **not established**. That does not mean they do not exist; the evidence was not supplied or found in this pass. Asking prices and SOLD labels alone do not establish market traction.

### What passed

- **40/40 canonical production routes returned HTTP 200**; live titles, descriptions and canonical URLs matched the repository build across all 40.
- Live `build-info.json` identifies the latest main merge; local source tree equals that merge's tree exactly.
- **131 tests / 24 files, production build and SEO checks passed.**
- **80 live browser route/viewport checks** covered all 40 pages at 1440px and 390px: no horizontal overflow, missing H1 or runtime exception detected. This is not a WCAG certificate or a field-performance result.
- HTTP → HTTPS, HTTPS WWW → non-WWW, Contact → About, and a genuine unknown-route HTTP 404 were verified.
- Current Studio Print metadata correctly uses **$45 / $95**. Bundles remain **$175 / $425**, with **$50 / $50** current savings. The $40 discrepancy is in historical documentation, not current customer pricing.

### Most important findings

| Priority | Finding | Evidence status | Next decision |
|---|---|---|---|
| High | Eight Forest originals remain availability-provisional; the Forest data/rendering system does not yet express a complete sold/reserved lifecycle. | Current data/filter verified; future stale inventory is an inferred risk. | Artist-confirm inventory and approve sale-state handling before exhibition transactions. |
| High | Dragon Lily lacks confirmed dimensions/medium and retains provisional copy. | Verified. | Supply the facts; do not infer them from other paintings. |
| High | Large artwork source/legacy files remain publicly retrievable, including 5712×4284 JPEGs and a 9.45 MB PNG. | Local dimensions plus live HTTP 200 verified for named examples. | Approve optimized replacements and retention/deployment policy before changing/removing files. Not proof that print-production masters were exposed. |
| High before checkout, not a defect | Print production, shipping/returns, costs and payment/tax configuration are unfinished. | Verified intentional status and owner context. | Keep Coming Soon and payment disabled until decisions/samples/accounting are approved. |
| Medium | Forest Available Art's “Inquire about the original” text is not itself a link. | Verified; image/title still link to detail. | Make the action explicit in a future approved change. |
| Medium | About communicates sensibility and process but lacks a concise factual bio/CV and externally corroborated chronology. | Verified visible-content gap; career facts remain unverified. | Assemble an evidence-backed artist packet. |
| Medium | Initial consent UI obscures a substantial portion of the phone viewport. | Measured in audit screenshots; detailed image/UX report. | Consider a more compact, accessible consent presentation while preserving consent behavior. |
| Medium | Current pricing is consistent but older planning documents still state $40. | Verified. | Reconcile handoff documents before supplier/payment work. |

**No verified critical outage, sitewide indexing block or incorrect current Studio Print price was found.** Unverified indexing, domain ownership and field CWV are measurement limits, not failures.

## Read the report

1. [Method, domains and production identity](01-method-and-domains.md)
2. [Every page: inventory and recommendations](02-page-inventory.md) · [full metadata CSV](evidence/page-inventory.csv)
3. [Images, presentation, performance and accessibility](03-images-and-ux.md)
4. [Repository technical SEO, pricing and schema](04-technical-seo.md)
5. [GEO / AI discoverability and query observations](05-geo-search.md)
6. [25-artist competitive benchmark](06-competitive-benchmarks.md)
7. [Artistic positioning and commercial readiness](07-positioning-and-commercial.md)
8. [Priorities and exhibition-aware 30/60/90-day roadmap](08-priorities-and-roadmap.md)
9. [Evidence register and remaining verification](09-evidence-register.md)

## Interpretation rules

**Verified** means observed in the named source or test, not a promise of future behavior. **Inferred** means an assessment based on stated evidence. **Not Yet Verified** means the necessary access, facts or measurement were unavailable. **Critical/High/Medium/Low** describe practical urgency, not artistic merit. The scorecards are categorical audit judgments, not Google scores or art-market valuations.

Original prices, inventory statuses, images and branding were not changed. Report files under this directory are the only intended repository additions. No recommendations have been implemented.
