import { JunglekeepersText } from '../components/JunglekeepersText';
import { contributionStatement, contributionSummary } from './contributions';
import { studioArtwork, type StudioEdition } from './editions';

export function StudioGiving({ edition, headingLevel = 'h2', includeOriginal = false }: { edition: StudioEdition; headingLevel?: 'h2' | 'h3'; includeOriginal?: boolean }) {
  const giving = edition.contribution;
  if (!giving) return null;
  const artwork = studioArtwork(edition);
  const Heading = headingLevel;
  const headingId = `${edition.id}-giving-print`;
  return <section className="studio-giving" aria-labelledby={headingId}>
    <Heading id={headingId}>{artwork.title} — {giving.heading}</Heading>
    <p><JunglekeepersText text={contributionStatement(giving, includeOriginal)}/></p>
  </section>;
}

export function StudioGivingSummary({ edition }: { edition: StudioEdition }) {
  const giving = edition.contribution;
  if (!giving) return null;
  const percentage = `${giving.percentOfProfit}%`;
  return <p className="studio-giving-summary"><strong>{percentage}</strong><JunglekeepersText text={contributionSummary(giving).slice(percentage.length)}/></p>;
}
