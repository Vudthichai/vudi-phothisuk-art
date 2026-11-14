# SEO/GEO implementation decisions

Last verified 2026-11-14.

## One catalog, two render environments

Use the existing 26 artwork records and three collections; no duplicate CMS or keyword pages. All 35 public pages receive build-time React HTML, unique `<title>` and standard description, curated sharing imagery, canonical/social URLs and JSON-LD. The build fails if sharing assets are missing. The sharing manifest stores only image and alt curation; metadata descriptions derive from source artwork/collection records or existing informational copy.

Titles include collection names on artwork pages so the painting The Oceans has a distinct title from its parent collection. Long source descriptions are retained rather than rewritten without editorial scope. Metadata is updated on client navigation as well as direct requests.

## Canonical, sitemap and migration

Use HTTPS apex + trailing slash for HTML routes, matching observed Netlify directory routing. Sitemap derives from the same route catalog; it includes image namespace/locations for the verified primary artwork photographs on artwork and collection pages. Source files, prototypes, unknown routes and 404 are excluded. No invented last-modified dates, priorities, prices, availability, credentials, image licenses or shipping claims.

Only source-backed aliases from Oceans/Regal `sourceUrl` records are redirected. Example: `/waters-edge` → `/collections/oceans/water-s-edge/`; `/the-oceans-painting` → `/collections/oceans/the-oceans/`. Generic `/the-oceans` and `/forest-and-flowers` are **not** assumed historical aliases. Add other aliases only after source/traffic evidence confirms their intended destination.

## Crawler policy

Public search and user-directed retrieval are allowed: Googlebot, Googlebot-Image, bingbot, OAI-SearchBot, ChatGPT-User, PerplexityBot/Perplexity-User, Claude-SearchBot/Claude-User. Named training/extended-use agents are blocked: GPTBot, ClaudeBot, Google-Extended, CCBot, cohere-ai, Bytespider, Applebot-Extended, Amazonbot. The latter broad blocks are conservative and may also limit those providers' other uses.

The default group allows public discovery; all applicable search/default groups exclude `/dev/` and the raw `/forest-preview/collection.json`. Do not block `/forest-preview/images/`: those photographs are used on public artwork pages. Named training access is not granted. Robots rules cannot identify every future crawler, enforce compliance, prevent copying or provide authentication. Review current vendor documentation before adding agents or changing policy. Enabling training access requires a separate owner decision.

References: [OpenAI crawlers](https://developers.openai.com/api/docs/bots), [Google AI search](https://developers.google.com/search/docs/appearance/ai-features), [Perplexity](https://docs.perplexity.ai/docs/resources/perplexity-crawlers), [Claude crawlers](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler).

No `llms.txt` is introduced; readable content, consistent entities, search indexing and relevant independent references take priority. Access does not guarantee indexing, rankings, rich results or AI citations.

## Structured data

- Person: Vudi Phothisuk; verified Pittsburgh connection as `homeLocation`, **no invented business address**. Field Day is an exhibition venue only.
- VisualArtwork: source title, primary image, creator, known medium and size text. No offers/prices/availability inferred. Missing medium/size is omitted. Dragon Lily's provisional narrative remains visibly flagged in the existing page but is omitted from VisualArtwork description.
- CollectionPage / ItemList: catalog order and actual artwork URLs; collection index lists the three collection pages.
- BreadcrumbList: Home → Collections → collection → artwork, or Home → information page.
- ExhibitionEvent: Forest & Flowers at Field Day, 3706 Butler Street, Pittsburgh PA 15201, December 5, 2026, 16:00–19:00 Eastern (`-05:00`). No invented admission, organizer, ticket offers or event status.
- AboutPage/ContactPage/WebPage link the page identity with the artist or principal artwork/event.

Schema is supplied as escaped JSON-LD, never HTML-assembled artwork facts. Build warnings identify incomplete records without changing them. Schema.org validity and Google rich-result eligibility are different; VisualArtwork is useful semantic markup but not a promise of a Google rich result.
