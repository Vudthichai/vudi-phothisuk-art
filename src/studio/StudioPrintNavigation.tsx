import { Link } from 'react-router-dom';
import { studioPrimaryImage } from './gallery';
import { ForestPhotograph } from '../forest/ForestPhotograph';
import { studioArtwork, studioBase, studioEditions, studioProductPath, type StudioEdition } from './editions';
export function printNeighbors(edition: StudioEdition) {
  const index = studioEditions.findIndex(item => item.id === edition.id);
  return { previous: studioEditions[(index + studioEditions.length - 1) % studioEditions.length], next: studioEditions[(index + 1) % studioEditions.length] };
}
export function StudioPrintNavigation({ edition }: { edition: StudioEdition }) {
  const { previous, next } = printNeighbors(edition);
  return <nav className="studio-print-navigation" aria-label="Studio Edition print navigation">
    {([{ edition:previous, label:'Previous Studio Edition', className:'previous' },{edition:next,label:'Next Studio Edition',className:'next'}] as const).map(item => <Link key={item.className} className={`studio-print-neighbor ${item.className}`} to={studioProductPath(item.edition)} aria-label={`${item.label}: ${studioArtwork(item.edition).title}`}><ForestPhotograph image={{...studioPrimaryImage(item.edition),alt:''}} sizes="64px"/><span><small>{item.label}</small><span>{studioArtwork(item.edition).title}</span></span></Link>)}
    <Link className="studio-print-all" to={studioBase}>View All Studio Editions</Link>
  </nav>;
}
