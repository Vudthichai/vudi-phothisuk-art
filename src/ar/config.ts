import experiences from './experiences.json';
export type ARExperience = { id:string; artworkId:string; title:string; certificateLabel:string; certificatePaths:string[]; targetImage:string; targetFile:string; targetIndex:number };
export const arExperiences: readonly ARExperience[] = experiences;
export function arForCertificate(path:string) { return arExperiences.find(experience => experience.certificatePaths.includes(path)); }
export function arById(id:string|null) { return arExperiences.find(experience => experience.id === id); }
