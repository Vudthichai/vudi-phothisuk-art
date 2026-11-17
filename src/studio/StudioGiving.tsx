import { Link } from 'react-router-dom';
import { contributionStatement, contributionSummary } from './contributions';
import { studioArtwork, studioEditions, studioProductPath, type StudioEdition } from './editions';

export function StudioGiving({ edition, original = false }: { edition: StudioEdition; original?: boolean }) {
  const giving = edition.contribution;
  if (!giving) return null;
  const artwork = studioArtwork(edition);
  const headingId = `${edition.id}-giving-${original ? 'original' : 'print'}`;
  const Heading = original ? 'h3' : 'h2';
  return <section className="studio-giving" aria-labelledby={headingId}>
    <Heading id={headingId}>{artwork.title} — {giving.heading}</Heading>
    <p>{contributionStatement(giving)}</p>
    {original && <p className="studio-giving-scope">These percentages apply to Studio Print sales, not to this original artwork.</p>}
  </section>;
}

export function ArtWithPurpose() {
  return <section className="forest-art-purpose" aria-labelledby="art-purpose-title">
    <h2 id="art-purpose-title">Art With Purpose</h2>
    <p>Selected Studio Prints from Forest &amp; Flowers contribute a portion of their profits to causes connected to the stories of the original paintings.</p>
    <div className="forest-purpose-works">{studioEditions.filter(edition => edition.contribution).map(edition =>
      <article key={edition.id}><h3><Link to={studioProductPath(edition)}>{studioArtwork(edition).title}</Link></h3><p>{contributionStatement(edition.contribution!)}</p></article>
    )}</div>
  </section>;
}

export function StudioGivingSummary({ edition }: { edition: StudioEdition }) {
  const giving = edition.contribution;
  if (!giving) return null;
  const percentage = `${giving.percentOfProfit}%`;
  return <p className="studio-giving-summary"><strong>{percentage}</strong>{contributionSummary(giving).slice(percentage.length)}</p>;
}
