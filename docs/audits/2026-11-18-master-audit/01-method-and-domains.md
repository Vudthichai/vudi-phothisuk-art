# Method, production identity and domain investigation

## Scope and provenance

The uploaded master brief requires read-only investigation and explicitly authorizes writing an audit in `docs/audits/`. That narrow reporting exception is the only repository edit made. Installed tests/build tools generated ignored output; research scripts, captures and temporary working files were kept outside application source in `/workspace/audit-work/`. No dependencies were installed. No account messages, orders, payments or forms were submitted.

| Object | Verified identity |
|---|---|
| GitHub main | `03d1d4ec15705715db9ed4bd7f4c30c511129007` (PR90 merge) |
| Live `/build-info.json` | Same commit, context `production`, branch `main`, analytics eligibility enabled |
| Local read-only checkout | `ee4d717bdbb268be33325e569a851c210030f100` (PR90 change commit) |
| Both Git trees | `094dea2383e59f4029f08957e2776a38ea7d539c` — exact source-tree equality, verified through GitHub's git-commit API and `git rev-parse HEAD^{tree}` |

A different local commit ID was therefore not treated as a different source release. Local analytics eligibility may differ by build environment; live consent/account outcomes require separate evidence.

## Investigation coverage

- Repository: route/catalog/SSR pipeline, manifests, source image and print registries, donation/pricing metadata, CSS/components, analytics/privacy, hosting config, tests and existing documentation.
- Production HTTP: all sitemap routes, headers, robots/sitemap/build identity, host/protocol variations, Contact aliases, slash behavior, and a unique nonexistent path.
- Production rendering: 40 routes × desktop 1440px and phone 390px in Chromium. Representative pages received screenshots, progressive image inspection and additional interaction checks; see the image report for exact limits.
- Media: all 810 public image files inventoried; initial HTML/OG/srcset references and actual browser `currentSrc`/display data recorded. Dynamically loaded and legacy assets are distinguished from initial references; no unused-file purge was attempted.
- External research: 12 requested discovery queries, official search/crawler guidance, publicly observable artist mentions, and 25 sourced competitors. Search results are a single retrieval sample, not localized Google positions or controlled AI-answer tests.
- No Search Console, GA account reports, CrUX owner evidence, invoices, acquisition records, gallery contracts, product-cost quotes, or registrar access were available. Real Safari/VoiceOver and full competitor-site audits were not performed.

## Domain and HTTP findings

| Requested URL / behavior | Observed result | Status / severity |
|---|---|---|
| `https://vudiphothisukart.com` | HTTP 200, current homepage | Verified / pass |
| `http://vudiphothisukart.com` | One 301 to HTTPS non-WWW | Verified / pass |
| `https://www.vudiphothisukart.com` | One 301 to HTTPS non-WWW | Verified / pass |
| `http://www.vudiphothisukart.com` | Two hops: HTTPS WWW then HTTPS non-WWW | Verified / Low optimization opportunity; not an indexing failure |
| `/about` | 301 to `/about/`; final 200 | Verified / pass |
| `/contact` and `/contact/` | 301 directly to `/about/`; final 200 | Verified / pass |
| Unique unknown path | Actual HTTP 404, not blanket SPA 200 | Verified / pass |
| `https://vudi-phothisukart.com` and HTTPS WWW form | Environment proxy tunnel rejected with 403; no origin response obtained | **Not Yet Verified** — do not call this a dead domain, duplicate website or redirect |
| HTTP hyphenated host |403 observed via environment transport; ownership/origin attribution unresolved | **Not Yet Verified** |
| Netlify default alias | Same proxy-tunnel 403 restriction | **Not Yet Verified** from this transport; no inference about production alias indexing |

Every crawled canonical and OG URL uses `https://vudiphothisukart.com/…`. No conflicting canonical identity was found in the live 40-page corpus. Determine hyphenated-domain registration/ownership, DNS and redirect behavior from a separate network and, if owner-controlled, read-only registrar/hosting records before proposing changes. Do not alter DNS on this audit's evidence.

The homepage response includes HSTS `max-age=31536000`, HTML `public,max-age=0,must-revalidate`, and Netlify response identifiers. Those headers do not constitute a full security review or prove all other policies. No intrusive security scan was conducted.

## Evidence

[Domain probes](evidence/domain-probes.json) include redirect chains, statuses, timing from the audit network, headers and relevant public text. [Live page metadata](evidence/live-page-observations.json) records each route. Network timings are single observations through a proxy, not user p75 performance. The production/source comparison found zero differences in titles, meta descriptions or canonicals across all 40 pages.
