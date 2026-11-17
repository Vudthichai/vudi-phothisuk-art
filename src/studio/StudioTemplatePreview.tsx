import { useEffect, useState } from 'react';
import type { ForestImage } from '../forest/types';
import { ForestPhotograph } from '../forest/ForestPhotograph';
import { studioEditions, studioPrintImage, studioSizes } from './editions';
import './StudioTemplatePreview.css';
/** Development-only reference. Do not roll out other species/artworks before artist approval. */
export default function StudioTemplatePreview() {
  useEffect(() => { document.title = 'Mother Nature — Presentation Study | Vudi Phothisuk Art'; }, []);
  const [selected, setSelected] = useState(studioSizes[0].id);
  const size = studioSizes.find(option => option.id === selected)!;
  return <section className="section page studio-template"><p className="eyebrow">Private development study</p><h1>Mother Nature — print presentation</h1><p>Framing concept for review. This is a CSS presentation study, not an interior photograph. Room scale and print materials are not verified.</p><label>Study size <select value={selected} onChange={e=>setSelected(e.target.value)}>{studioSizes.map(s=><option value={s.id} key={s.id}>{s.label}</option>)}</select></label><PrintWallStudy image={studioPrintImage(studioEditions[0])} widthInches={size.width}/><p>The larger option is 4/3 the width and height of the smaller option within this fixed reference wall. Absolute physical scale is not claimed. No furniture, paper texture or artwork details have been invented.</p></section>;
}

export function PrintWallStudy({ image, widthInches }: { image: ForestImage; widthInches: number }) {
  return <div className="studio-template-wall"><div className="studio-template-frame" style={{width:`${widthInches/24*100}%`}}><ForestPhotograph image={image} eager sizes="60vw"/></div></div>;
}
