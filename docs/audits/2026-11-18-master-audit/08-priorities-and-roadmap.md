# Prioritized recommendations and 30/60/90-day roadmap

These are proposed actions, **not implemented changes**. Any later website change, publishing, transaction integration or external outreach remains subject to the artist's approval. Impact is an informed expectation, not measured revenue uplift. Effort estimates assume existing architecture and assets; owner/venue/vendor decisions can be the limiting factor.

## Severity and confidence

- **Critical:** immediate widespread inability to access the site, serious incorrect transactions, or verified sitewide index blocking. **None verified in this audit.**
- **High:** unresolved inventory/object facts, public-source image policy exceptions, and prerequisites to accepting print orders. These should be addressed before the relevant exhibition sale/launch.
- **Medium:** meaningful collector, evidence, maintainability or discoverability improvement.
- **Low:** limited editorial/technical refinement with no demonstrated conversion or indexing failure.

## Ranked action register

| ID | Priority | Recommendation | Expected impact | Effort | Dependency / owner | Confidence and evidence |
|---|---|---|---|---|---|---|
| A01 | High | Confirm all eight Forest sale statuses and approve available/reserved/sold/gifted workflow and central filtering. | Avoid contradictory inventory during and after the show. | Owner review 1–2h; later scoped implementation ~0.5–1.5d. | Artist inventory; authorized implementation. | High current-data evidence; future failure risk inferred. T02, E08/E09. |
| A02 | High | Finalize Dragon Lily dimensions, medium and copy status. | Removes a concrete obstacle to an informed inquiry and complete catalog. | Owner ~30–60 min plus proofing. | Physical object measurement and artist approval. | High, T01/E09. |
| A03 | High | Audit oversized public source-like images and approve replacements/retention before removal. | Aligns delivery and reasonable reproduction deterrence with prior intent; reduces accidental source exposure. | ~0.5–2d after owner source decisions. | Full dynamic reachability map; private master retention; photo-quality approval. | High HTTP/dimension evidence; exact master status unverified. V01/V03,E05/E06. |
| A04 | High before checkout | Complete print samples, final specifications, POD/vendor selection, costs, delivery/returns/payment/tax decisions and charitable accounting. | Prevents selling an unspecified product or promising unsupported fulfillment/margins. | Vendor/owner dependent; likely multiple weeks. | Samples and actual quotes; owner approval; no fixed exhibition deadline implied. | High, intentional launch gate, T06/E08. |
| A05 | Medium; before show | Make the Forest Available Art inquiry phrase functional/contextual. | Reduces a verified extra navigation step without changing the art-led layout. | Small ~1–3h scoped change. | Artist approval. | High fact; conversion impact inferred. T04/E02. |
| A06 | Medium; before show | Publish a concise factual bio/CV or artist packet and verify event/history links. | Gives curators/designers evidence beyond visual polish and an artistic statement. | 1–3d editorial with owner documents. | Artist-approved facts and corroborating sources; no invented credentials. | High missing on-site facts; impact inferred. T05,E11/E13. |
| A07 | Medium | Review the first-visit consent layout for smaller screens. | Makes the artwork/CTA more visible while keeping consent protections. | ~0.5–1d design/QA. | Preserve opt-in, accessible accept/decline and privacy detail; approval. | High geometry, inferred inquiry effect. V02/E07. |
| A08 | Medium | Add a short, factual acquisition/commission process: availability, quote, payment discussion, collection/transport and object records. | Reduces uncertainty for collectors, trade and international inquiries. | 1–2d once policies exist. | Owner/logistics decisions; do not invent shipping/lead-time promises. | High content absence; impact inferred. T11/E02. |
| A09 | Medium | Reconcile historical $40 planning documents with current $45/$95 and $175/$425 metadata. | Prevents vendor/checkout handoff errors. No runtime price correction is needed. | ~1–2h review. | Latest artist-approved schedule. | High,T07/E18. |
| A10 | Medium | Add automated unit/SEO checks to a future approved release workflow. | Catches regressions that current build-only deployment would not automatically test. | ~0.5d. | Repository permissions and approval; no workflow created now. | High source fact,T09/E04. |
| A11 | Medium | Obtain GSC/Bing/consent-respecting analytics reports and establish field/lab performance baselines. | Distinguishes actual discovery/lead/performance issues from assumptions. | Setup/export hours; field collection over weeks. | Owner read-only access; no fabricated traffic/CWV. | High measurement gap,E10. |
| A12 | Medium, conditional | Test conservative compression/delivery improvements for large active mockups and texture photos; route-split only if measured CPU cost warrants it. | Potential transfer/interaction improvement while preserving quality. | ~1–3d measurement and proofing. | Sampled performance data and 100%/Retina artist approval. | Bytes verified; benefit inferred.V04,T08. |
| A13 | Low | Improve thin Collections landing context and H1→H3 hierarchy; write concise search descriptions separately from long artistic copy. | Clearer navigation/discovery context and snippets, no claim of ranking lift. | ~0.5–1d editorial. | Approved copy; preserve collection stories and design. | High facts, inferred impact.T10/E02. |
| A14 | Low / unverified host work | Validate the hyphenated domain/default alias from an unrestricted network and ownership records; optionally simplify HTTP-WWW chain if controlled. | Resolves canonical-identity uncertainty; minor redirect efficiency. | Hours if access exists. | Registrar/host read-only evidence first. | Canonical primary verified; alternate host unverified.E01. |

## Exhibition-aware schedule

Audit date is **November 18, 2026 in Pittsburgh time**. The confirmed show is **December 5, 2026, 4:00–7:00 PM, Field Day, 3706 Butler Street, Lawrenceville, Pittsburgh**. There are approximately 17 calendar days until the show; a generic 30-day plan would be too late for its essential preparation.

### Before December 5 — realistic, narrow priorities

**Days 1–3: inventory and object truth.** Owner confirms Forest status and Dragon Lily facts; prepare the final catalog/price sheet from the same approved data. Reconfirm Beach Day's current status internally. Identify which pieces/prints are actually offered, which are displayed only, and what remains Coming Soon. No speculative print launch.

**Days 4–7: acquisition and professional packet.** Draft an artist-approved one-page bio/CV and image/size/medium/price list. Set a real inquiry response process, reservation/sold update process, and truthful transport/payment discussion. Verify the venue's official event listing and practical information; do not invent admission, RSVP or accessibility policies. Source/oversized-image decisions may proceed only after approved replacement and retention mapping.

**Days 8–12: targeted usability and communications.** If approved, fix the plain-text inquiry action and correct catalog/meta facts; consider the compact consent presentation only if there is adequate QA time. Personally test inquiry email on phone/webmail. Prepare appropriate factual event/artist materials for existing contacts or selected outreach, but this audit does not send messages or promise gallery interest.

**Days 13–16: freeze, rehearse and document.** Test the actual event QR/URL, inventory sheet, invoice/reservation record, basic device navigation and delivery discussion. Finish clean installation/side/detail photographs and condition/hanging information. Reserve time for gallery lighting and the physical objects rather than further nonessential mockup revisions.

**December 5: show and record.** Photograph actual installations and interactions with appropriate permission. Record inquiries, agreed holds/sales and collector follow-up preferences accurately. Make owner-approved inventory changes promptly. Do not equate attendance or compliments with sales. Keep Coming Soon prints unavailable unless all launch gates were explicitly completed.

### 30 days — through December 18, 2026

Within 48 hours after the show, follow up with people who requested contact using an approved process; no unsolicited bulk mailing. Reconcile sales/holds and expenses, archive dated installation images and exhibition facts, update CV only with actual events, and record donations when due under the agreed policy. Review genuine inquiries and collector questions. Complete remaining acquisition information and factual identity improvements. Establish a performance/search baseline; do not demand that a recent migration show immediate organic growth.

**Success evidence:** accurate post-show inventory, documented inquiries and responses, actual object/installation records, current CV/event archive and a verified analytics/search baseline. No invented sales target.

### 60 days — through January 17, 2027

Use show feedback to select the next coherent body/portfolio edit and identify appropriate regional curators/galleries/juried opportunities. Evaluate POD samples and full unit economics if the artist still wants to launch prints. Finalize paper/finish/sizes, packing, delivery/returns, tax/payment handling and charitable-profit definition. Prepare a trade/commission brief only for services the artist can actually provide. Implement prioritized performance/release checks after approval and measurement.

**Success evidence:** approved production samples and costed launch decision, a factual artist packet, documented regional submissions/conversations and measured site inquiry paths—not follower-count goals.

### 90 days — through February 16, 2027

Review actual sell-through, realized prices, costs, inquiry sources and repeat interest privately. Use that evidence to decide print launch, capacity, future exhibitions and any pricing review; do not change asking prices from competitor comparisons alone. Pursue sustained regional professional relationships and further material/scale/compositional development. National/international outreach should follow relevant documented work and relationships rather than a blanket prestige campaign.

**Success evidence:** an honest quarter review with evidence gaps still labeled, operating acquisition/fulfillment decisions where approved, a coherent next-series plan and a repeatable professional documentation process. Recognition cannot be guaranteed on a 90-day timetable.
