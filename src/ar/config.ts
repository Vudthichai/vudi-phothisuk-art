import experiences from './experiences.json';
export type ARExperience = { id:string; artworkId:string; title:string; certificateLabel:string; certificatePaths:string[]; entryPaths?:string[]; targetImage:string; targetFile:string; targetIndex:number; targetAspect?:number; previewOnly?:boolean; recognitionOnly?:boolean; modelAsset?:string };
const registeredExperiences: readonly ARExperience[] = experiences;
export const arExperiences: readonly ARExperience[] = registeredExperiences.filter(experience=>!experience.previewOnly);
// Entry pages may offer an AR experience without being separately compiled image targets.
// certificatePaths remains the strictly verified provenance for tracked physical certificate fronts.
export function arForCertificate(path:string) { return arExperiences.find(experience => !experience.previewOnly && (experience.entryPaths ?? experience.certificatePaths).includes(path)); }
export function arById(id:string|null, includePreview=false) { return registeredExperiences.find(experience => experience.id === id && (!experience.previewOnly || includePreview)); }
