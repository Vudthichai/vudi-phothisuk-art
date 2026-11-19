# GEO / AI discoverability

## Eligibility is stronger than demonstrated reach

**Verified:** the live site exposes ordinary readable HTML, clear artwork titles, collection narratives, dimensions/media where known, artist identity/location schema, an exhibition event, original-versus-print distinctions, image alternatives, and connected canonical/breadcrumb URLs. Search-oriented bots and user-directed retrieval are allowed by the observed robots file. Named training crawlers are separately blocked. These are sound prerequisites, **not evidence that an AI engine has cited or recommended the artist**.

Google explicitly says ordinary SEO requirements remain applicable to AI features and there is no special AI markup/file required. Indexed, snippet-eligible content may be considered, but inclusion is not guaranteed. Do not make `llms.txt`, FAQ schema or an invented GEO score the main recommendation. [Google Search Central: AI features](https://developers.google.com/search/docs/appearance/ai-features). OpenAI documents search/user-retrieval crawlers separately from training crawlers; permitting one and blocking another is a valid intentional configuration, not a contradiction. [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots).

**Not Yet Verified:** Google/Bing indexed coverage, Google AI Overview/AI Mode appearances, ChatGPT/Perplexity/Copilot citations, impressions, attributable inquiries, crawler logs, Search Console ownership and query performance. We did not have owner console/analytics exports or execute controlled tests on each AI answer platform. A web-search tool's result is not a ChatGPT citation-rate measurement.

## Requested query observations

Each query below was submitted to the available web-search service during the audit. Returned samples are not a controlled Google result set: location, personalization, exact coverage and rank cannot be fixed. “Not observed” means not present in that returned sample, **not absent from an engine index or proof of a ranking position**. Full query/source records: [query observations](evidence/query-observations.json).

| Query | Observation in returned sample | Implication / confidence |
|---|---|---|
| Vudi Phothisuk | Own site/About and named event/fundraiser pages surfaced. | Branded identity retrievable; verified sample only. |
| Vudi Phothisuk Art | Own site and third-party event/fundraiser mentions surfaced. | Basic entity footprint exists; no traffic/ranking inference. |
| Forest & Flowers Vudi Phothisuk | Branded site/About surfaced; a current dedicated collection result was not clearly established in the returned sample. | Collection-specific independent reinforcement is an opportunity, not proven deindexing. |
| Pittsburgh contemporary mixed-media artist | Other local artists surfaced; Vudi not observed. | Improve verified local identity/context and substantive external references; no promised ranking. |
| Pittsburgh botanical artist | Botanical society/member/artist sites surfaced; Vudi not observed. | Relevant regional/community context could help if participation is authentic. |
| Sculptural botanical paintings | Other sculptural/botanical practitioners surfaced; Vudi not observed. | This is an existing category, not an exclusive descriptor. |
| Dimensional mixed-media paintings | Other artists/gallery portfolios surfaced; Vudi not observed. | Precise material explanations and strong series documentation matter more than repeated adjectives. |
| Original botanical artwork Pittsburgh | Local artists and an Ashley Cecil gallery listing surfaced; Vudi not observed. | Availability plus confirmed object/geography facts need stronger supporting evidence. |
| Textured floral paintings | Other stores/artist galleries surfaced; Vudi not observed. | Broad commercial competition; avoid generic keyword stuffing. |
| Contemporary nature-inspired artwork | Other artist portfolios surfaced; Vudi not observed. | Distinct stories/material language should carry the differentiation. |
| Original art for luxury interiors | Artist/designer/trade-oriented pages surfaced; Vudi not observed. | A factual trade/acquisition brief could be useful if the artist wants that audience. |
| Botanical art commissions | Commission-specific artist and professional-society pages surfaced; Vudi not observed. | Explain real commission process/capacity when supplied, not hypothetical services. |

Search samples still include WWW links and older About wording with a telephone contact not present in current rendered About. The live WWW redirect and canonicals are correct. **Inference:** results may reflect older cached content and migration recrawl timing. They do not demonstrate a current duplicate host or justify a new migration. Verify in GSC/URL Inspection before diagnosing an indexing fault.

## External corroboration found

| Source | What it supports | What it does not support |
|---|---|---|
| [Pier Pressure event organizer](https://www.pierpressurepgh.com/) | Publicly lists Vudi as an artwork/Canvas Collab participant and links his art identity. | The supplied bio is not independent art criticism, gallery representation or a sales record. |
| [The Ocean Cleanup fundraiser](https://fund.theoceancleanup.com/fundraisers/vudiphothisuk/community-usd) | Artist-authored public announcement describes an August 3, 2024 Field Day Oceans show and the artist's conservation interest. | Hosting on a fundraising platform does not independently verify exhibition execution, artwork sales or present charity partnership. Donation totals are not art revenue. |
| [American Cancer Society event fundraiser on Zeffy](https://www.zeffy.com/en-US/ticketing/vudi-phothisuk-art-raffle-pier-pressure-x-american-cancer-society) | A named 2025 art-raffle/community context exists publicly. | No inference about contemporary sale prices, future endorsements, or donation compliance. |
| [Best Defense Foundation: Wallace “Wally” King](https://bestdefensefoundation.org/veteran/wallace-wally-king/) and [Crestwood oral-history project](https://ohp.crestwood.on.ca/ohp/king-wallace/) | The historical basis of the 75-mission tribute and Elbe reference can be corroborated. | Neither source establishes the as-yet-unannounced veterans beneficiary or any partnership with Vudi. |
| [Junglekeepers official site](https://www.junglekeepers.org/) | Organization identity and conservation purpose. | No formal endorsement or relationship with the artist was verified. |

The December 5, 2026 event is confirmed by the artist's brief and live exhibition/schema records. A current official venue announcement or independent listing was **not established in sampled search**. Obtain the venue's approved listing rather than implying one already exists.

## Prioritized discoverability improvements — recommendations only

1. **Before the show:** confirm complete artwork facts and availability, especially Dragon Lily. Keep full artistic descriptions; correct factual gaps and outdated meta summary first.
2. **Add an approved factual identity layer:** a compact bio/CV with location, named/date-specific exhibitions and authentic official social/professional links. `sameAs` should point only to verified artist identities. Avoid invented education, representation, awards or heritage narratives.
3. **Make corroboration easy:** link the approved venue event listing and relevant prior public event records; collect real installation photographs, captions and dates after the show. Public documentation has more value than adding unsupported prestige language.
4. **Clarify collector questions:** object materials, size/depth/weight, framing/hanging, condition/care and acquisition/transport process where known. This supports human decisions and accurate retrieval simultaneously.
5. **Keep originals and reproductions unambiguous:** ordinary HTML titles, true medium/dimensions, print sizes and Coming Soon status. Product schema alone does not make an unreleased print a sale-ready offer. [Google product guidance](https://developers.google.com/search/docs/appearance/structured-data/product).
6. **Measure actual outcomes:** read-only GSC/Bing/analytics reports, consent-respecting inquiry attribution and a repeatable branded/unbranded query log. Maintain separate columns for eligibility, observed result and actual inquiry; never merge them into a claimed AI visibility score.
