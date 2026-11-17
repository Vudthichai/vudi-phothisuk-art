import type { ImgHTMLAttributes } from 'react';

/** Casual saving deterrents only: public web images remain downloadable.
 * Keep linked images' context menus available for opening links in another tab.
 * No touch, keyboard, zoom, text-selection or document-wide handlers.
 */
export const artworkImageDeterrents = {
  draggable: false,
  onDragStart: event => event.preventDefault(),
  onContextMenu: event => {
    if (!event.currentTarget.closest('a[href]')) event.preventDefault();
  },
} satisfies Pick<ImgHTMLAttributes<HTMLImageElement>, 'draggable' | 'onDragStart' | 'onContextMenu'>;
