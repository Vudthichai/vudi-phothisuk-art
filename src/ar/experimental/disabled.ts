// Production build alias: the experimental scene and model must not enter its module graph.
export function setupRainforestLab():never {throw new Error('AR experiments are unavailable in production.');}

export function setupRecognition():never {throw new Error('Recognition experiments are unavailable in production.');}
