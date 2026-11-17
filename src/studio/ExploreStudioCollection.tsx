import { studioEditions, type StudioEdition } from './editions';
import { EditionCard } from './StudioEditions';

export function ExploreStudioCollection({ edition }: { edition: StudioEdition }) {
  return <section className="studio-explore" aria-labelledby="studio-explore-title">
    <h2 id="studio-explore-title">Explore the Collection</h2>
    <div className="studio-explore-grid">{studioEditions.filter(item => item.id !== edition.id).map(item =>
      <EditionCard key={item.id} edition={item} identifyPrint/>)}</div>
  </section>;
}
