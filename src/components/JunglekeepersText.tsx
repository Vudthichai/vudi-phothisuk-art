import { junglekeepersUrl } from '../studio/contributions';

/** Keep the artist's text intact while linking the organization's name. */
export function JunglekeepersText({ text }: { text: string }) {
  return <>{text.split(/(Junglekeepers|Jungle Keepers)/g).map((part,index) =>
    /^(Junglekeepers|Jungle Keepers)$/.test(part)
      ? <a key={index} className="charity-organization-link" href={junglekeepersUrl}>{part}</a>
      : part)}</>;
}
