import { BotanicalFall, type BotanicalScene } from './BotanicalFall';

/** Compatibility adapter for the existing menu and artwork experiences. */
export function ForestDecorations({ scene = 'menu' }: { scene?: BotanicalScene }) {
  return <BotanicalFall scene={scene}/>;
}
