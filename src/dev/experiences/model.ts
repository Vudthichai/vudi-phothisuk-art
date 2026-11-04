import type { BotanicalParticle } from '../../components/BotanicalFall';
import type { FlowerSequence } from '../../botanical/bloom';
import type { BarkAsset, FoliagePiece, GrowthSequence } from '../../botanical/forest';
export type Readiness = 'approved' | 'experimental' | 'asset-blocked';
type StepTiming = { id: string; at: number; duration: number; readiness: Readiness; note: string };
export type ExperienceStep = StepTiming & (
  | { family: 'fall'; particles: readonly BotanicalParticle[]; distance: string }
  | { family: 'foliage'; pieces: readonly FoliagePiece[]; intensity: number }
  | { family: 'flower'; asset: FlowerSequence }
  | { family: 'mushroom'; asset: GrowthSequence }
  | { family: 'bark'; asset: BarkAsset }
);
export type ArtworkExperience = {
  artworkId: string;
  title: string;
  experienceTitle: string;
  introduction?: string;
  photograph: { status: 'available' | 'missing'; src: string; width: number; height: number; alt: string };
  detail?: { src: string; width: number; height: number; alt: string };
  readiness: Readiness;
  missing: readonly string[];
  /** Private reveal only. Public Mother Nature is never imported or modified. */
  revealAt: number;
  steps: readonly ExperienceStep[];
};
export function playableSteps(experience: ArtworkExperience, includeExperimental: boolean) {
  return experience.steps.filter(step => {
    if ((step.family === 'flower' || step.family === 'mushroom') && step.asset.status !== 'approved') return false;
    return step.readiness === 'approved' || (includeExperimental && step.readiness === 'experimental');
  });
}
