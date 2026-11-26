import { certificateARPreviews, type ARExperience, type BotanicalComposition } from './config';
import { creativePreviewFor } from './creativePreviews';

export const FINAL_AR_VARIANT = 'final';

const refinements: Readonly<Partial<Record<string, Partial<BotanicalComposition>>>> = {
  'a-forest-forgotten': { finalForest: 'rebirth' },
  'blooming-desire': { finalBloom: true },
  'dragon-lily': { finalLilyLight: true },
  'ethereal-bloom': { finalCanopy: 'ethereal' },
  '75-leaves': { finalCanopy: 'leaves' },
  'moss-and-mushrooms': { finalForest: 'moss' },
};

export function finalExperience(experience: ARExperience): ARExperience {
  // Keep the same V5 scene visitors use on the live Mother Nature certificates.
  if (experience.rainforestV5) return experience;
  const creative = creativePreviewFor(experience);
  const base = experience.previewFirstBreathComposition ?? creative?.composition?.(experience) ?? experience.composition;
  const refinement = refinements[experience.artworkId];
  return {
    ...experience,
    composition: base && refinement ? { ...base, ...refinement } : base,
    lilyCinematics: creative?.lilyCinematics,
    finalLilyLight: experience.artworkId === 'tiger-lily',
  };
}

export function certificateEdition(experience: ARExperience) {
  return experience.certificatePaths[0]?.includes('/collectors-edition/') ? 'Collector’s Edition' : 'Original';
}

export function finalCameraPath(experience: ARExperience) {
  const query = new URLSearchParams({ hub: '1', experience: experience.id, variant: FINAL_AR_VARIANT });
  return `/ar-camera.html?${query}`;
}

export function artworkHubEntries(experiences = certificateARPreviews) {
  const artworks = new Map<string, { title: string; certificates: ARExperience[] }>();
  for (const experience of experiences) {
    const entry = artworks.get(experience.artworkId);
    if (entry) entry.certificates.push(experience);
    else artworks.set(experience.artworkId, { title: experience.title, certificates: [experience] });
  }
  return [...artworks.values()].sort((a, b) => a.title.localeCompare(b.title)).map(entry => ({
    ...entry,
    certificates: entry.certificates.sort((a, b) => Number(certificateEdition(b) === 'Original') - Number(certificateEdition(a) === 'Original')),
  }));
}
