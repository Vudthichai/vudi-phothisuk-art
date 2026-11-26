import type { ARExperience, BotanicalComposition, LilyCinematics } from './config';

type CreativePreview = {
  variant: string;
  label: string;
  lilyCinematics?: LilyCinematics;
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
  'moss-and-mushrooms': {
    variant: 'forest-awakening',
    label: 'Moss & Mushrooms — Forest Awakening',
    composition: ({ composition }) => composition && { ...composition, creativeFinish: 'moss' },
  },
  'gilded-bloom': {
    variant: 'golden-awakening',
    label: 'Gilded Bloom — Golden Awakening',
    composition: ({ previewV3Composition }) => previewV3Composition && { ...previewV3Composition, creativeFinish: 'gilded' },
  },
  'tiger-lily': {
    variant: 'sunlit-flame',
    label: 'Tiger Lily — Sunlit Flame',
    lilyCinematics: 'sunlit-flame',
  },
  'dragon-lily': {
    variant: 'blushing-ember',
    label: 'Dragon Lily — Blushing Ember',
    composition: ({ composition }) => composition && {
      ...composition,
      lilyCinematics: 'blushing-ember',
      entrance: composition.entrance && { ...composition.entrance, atmosphere: 0 },
    },
  },
  'wild-tiger-lilies': {
    variant: 'the-dance',
    label: 'Wild Tiger Lilies — The Dance',
    composition: ({ composition }) => composition && { ...composition, lilyCinematics: 'the-dance' },
  },
};

export function creativePreviewFor(experience?: ARExperience) {
  return experience && previews[experience.artworkId];
}
