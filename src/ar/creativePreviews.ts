import type { ARExperience, BotanicalComposition } from './config';

type CreativePreview = {
  variant: string;
  label: string;
  composition?: (experience: ARExperience) => BotanicalComposition | undefined;
};

const previews: Readonly<Record<string, CreativePreview>> = {
  'mother-nature': {
    variant: 'ancient-tree',
    label: 'Mother Nature — The Ancient Tree',
  },
  'a-forest-forgotten': {
    variant: 'rebirth',
    label: 'A Forest Forgotten — Rebirth',
    composition: ({ composition }) => composition && { ...composition, stumpRebirth: true },
  },
};

export function creativePreviewFor(experience?: ARExperience) {
  return experience && previews[experience.artworkId];
}
