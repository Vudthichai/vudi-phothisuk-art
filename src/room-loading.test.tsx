// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RoomStudy } from './components/RoomStudy';
import { findCollection } from './data';
afterEach(cleanup);
it('retries a failed image once and allows the visitor to reload the room', () => {
 const artwork=findCollection('oceans')!.artworks.find(art=>art.slug==='the-oceans')!;
 const view=render(<RoomStudy artwork={artwork}/>);
 const image=view.container.querySelector('.curated-room-art') as HTMLImageElement;
 fireEvent.error(image);
 expect(image.src).toContain('?room-retry=1');
 expect(image.getAttribute('srcset')).toBeNull();
 fireEvent.error(image);
 expect(screen.getByRole('status').textContent).toContain('couldn’t load');
 expect(view.container.querySelector('.curated-room-art')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Reload room image'}));
 expect(view.container.querySelector('.curated-room-art')?.getAttribute('src')).toBe(artwork.image.src);
 expect(screen.queryByRole('status')).toBeNull();
});
