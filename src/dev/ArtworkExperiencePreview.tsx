import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { artworkExperiences } from './experiences/configurations';
import { ArtworkExperience } from './experiences/ArtworkExperience';
import './flower-preview.css';
function Gallery() {
  const [selected, setSelected] = useState(artworkExperiences[0]);
  return <main><p>Local development only · Phase 4</p><h1>Individual artwork experiences</h1>
    <p>Five private creative directions. Only Mother Nature has an existing photograph. Missing photographs are explicitly labeled placeholders.</p>
    <p><a href="/dev/forest.html">Forest studies</a> · <a href="/dev/flower-bloom.html">Flower review</a></p>
    <div className="experience-selector" role="group" aria-label="Select artwork experience">{artworkExperiences.map(experience => <button key={experience.artworkId} aria-pressed={selected.artworkId === experience.artworkId} onClick={() => setSelected(experience)}>{experience.title}</button>)}</div>
    <ArtworkExperience key={selected.artworkId} experience={selected} />
  </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Gallery /></React.StrictMode>);
