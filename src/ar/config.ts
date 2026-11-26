import experiences from './experiences.json';
import artworkPresentations from './artwork-presentations.json';
export type Entrance = {
  duration: number;
  stagger: number;
  softness: number;
  atmosphere: number;
  direction: number[];
  gold?: boolean;
};
export type BotanicalComposition = {
  leafRain?: boolean;
  mossAwakening?: boolean;
  float?: number;
  entrance?: Entrance;
  pieces: { asset: string; size: number; position: number[]; rotation: number[] }[];
};
type Presentation = { modelAsset?: string; rainforestV5?: boolean; composition?: BotanicalComposition; previewComposition?: BotanicalComposition };
export type ARExperience = { id:string; artworkId:string; title:string; certificateLabel:string; certificatePaths:string[]; entryPaths?:string[]; targetImage:string; targetFile:string; targetIndex:number; targetAspect?:number; previewOnly?:boolean; recognitionOnly?:boolean; } & Presentation;
const presentations: Readonly<Record<string, Presentation>> = artworkPresentations;
// The certificate selects the tracked image. The artwork selects its presentation.
const registeredExperiences: readonly ARExperience[] = experiences.map(certificate => {
  const presentation = presentations[certificate.artworkId];
  return { ...certificate, ...presentation, recognitionOnly: !presentation };
});
export const certificateARPreviews = registeredExperiences;
export const arExperiences: readonly ARExperience[] = registeredExperiences.filter(experience=>!experience.previewOnly);
// Entry pages may offer an AR experience without being separately compiled image targets.
// certificatePaths remains the strictly verified provenance for tracked physical certificate fronts.
export function arForCertificate(path:string) { return arExperiences.find(experience => !experience.previewOnly && (experience.entryPaths ?? experience.certificatePaths).includes(path)); }
export function arById(id:string|null, includePreview=false) { return registeredExperiences.find(experience => experience.id === id && (!experience.previewOnly || includePreview)); }
