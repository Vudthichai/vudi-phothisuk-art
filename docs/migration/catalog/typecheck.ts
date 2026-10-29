import inventory from './inventory.json';
import manifest from './image-manifest.json';
import type { Catalog, ImageReference, ImageMatch } from './model';
// TypeScript widens literals in imported JSON. Check all field shapes here;
// scripts/validate-catalog.py separately checks constrained values and relationships.
type JsonShape<T> = T extends string ? string : T extends number ? number : T extends boolean ? boolean : T extends readonly (infer U)[] ? JsonShape<U>[] : T extends object ? { [K in keyof T]: JsonShape<T[K]> } : T;
inventory satisfies JsonShape<Catalog>;
manifest.images satisfies JsonShape<ImageReference[]>;
manifest.matches satisfies JsonShape<ImageMatch[]>;
