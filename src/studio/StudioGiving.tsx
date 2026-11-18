import { contributionStatement, contributionSummary } from './contributions';
import { studioArtwork, type StudioEdition } from './editions';

export function StudioGiving({ edition }: { edition: StudioEdition }) {
  const giving = edition.contribution;
  if (!giving) return null;
  const artwork = studioArtwork(edition);
  const headingId = `${edition.id}-giving-print`;
  return <section className="studio-giving" aria-labelledby={headingId}>
    <h2 id={headingId}>{artwork.title} — {giving.heading}</h2>
    <p>{contributionStatement(giving)}</p>
  </section>;
}

export function StudioGivingSummary({ edition }: { edition: StudioEdition }) {
  const giving = edition.contribution;
  if (!giving) return null;
  const percentage = `${giving.percentOfProfit}%`;
  return <p className="studio-giving-summary"><strong>{percentage}</strong>{contributionSummary(giving).slice(percentage.length)}</p>;
}
