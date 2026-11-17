// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ArtworkStudioEdition, StudioEditions } from './studio/StudioEditions';
import { studioArtwork, studioCollectionBundle, studioEditions, studioPrintImage } from './studio/editions';
afterEach(cleanup);
it('presents only the five approved reproductions with authentic photographs and no checkout', () => {
  render(<MemoryRouter><StudioEditions/></MemoryRouter>);
  const cards = screen.getAllByRole('article');
  expect(cards.map(card => within(card).getByRole('heading').textContent)).toEqual(['Mother Nature','Ethereal Bloom','Tiger Lily','75 Leaves','A Forest Forgotten']);
  cards.forEach((card, index) => {
    expect(within(card).getByText('$40')).toBeTruthy();
    expect(within(card).getByText('Coming Soon')).toBeTruthy();
    expect(card.textContent).toBe(`${studioArtwork(studioEditions[index]).title}$40—Coming Soon`);
    const artwork = studioArtwork(studioEditions[index]);
    expect(within(card).getByRole('img').getAttribute('src')).toBe(`/studio-editions/${artwork.id}-print-1920.webp`);
    expect(studioPrintImage(studioEditions[index]).variants.map(v => v.src)).toEqual([640,1280,1920].map(size => `/studio-editions/${artwork.id}-print-${size}.webp`));
    expect(within(card).getByRole('link',{name:artwork.title}).getAttribute('href')).toBe(`/collections/forest-and-flowers/${artwork.slug}/#studio-edition`);
  });
  expect(screen.getByText('$175')).toBeTruthy();
  expect(studioCollectionBundle.editionIds).toEqual(studioEditions.map(edition => edition.id));
  expect(screen.queryByRole('button')).toBeNull();
  expect(document.querySelector('form, input, iframe, a[href^="mailto:"]')).toBeNull();
  expect(document.body.textContent).not.toMatch(/reproduction|unsigned|profit|beneficiary|Paper|production details|View edition details/i);
});
it('limits individual panels to eligible art and preserves gifted originals as Not for Sale', () => {
  for (const edition of studioEditions) {
    const artwork = studioArtwork(edition);
    const view = render(<MemoryRouter><ArtworkStudioEdition artworkId={artwork.id}/></MemoryRouter>);
    expect(screen.getByRole('heading',{name:'Studio Edition Print'})).toBeTruthy();
    if (['tiger-lily','75-leaves'].includes(artwork.id)) {
      expect(artwork.availability).toBe('not-for-sale');
    }
    expect(view.container.textContent).toBe('Studio Edition Print$40—Coming Soon');
    expect(screen.queryByRole('link')).toBeNull();
    view.unmount();
  }
  const { container } = render(<MemoryRouter><ArtworkStudioEdition artworkId="dragon-lily"/></MemoryRouter>);
  expect(container.innerHTML).toBe('');
});
it('retains unapproved contribution intentions in data without displaying them in the grid', () => {
  render(<MemoryRouter><StudioEditions/></MemoryRouter>);
  expect(document.querySelector('.studio-contribution')).toBeNull();
  expect(studioEditions.find(e => e.artworkId === '75-leaves')?.contribution).toEqual({percentOfProfit:75,beneficiary:null,status:'pending-approval'});
  expect(studioEditions.find(e => e.artworkId === 'a-forest-forgotten')?.contribution).toEqual({percentOfProfit:20,beneficiary:'Junglekeepers',status:'pending-approval'});
  expect(() => studioPrintImage({id:'missing',artworkId:'unapproved'})).toThrow('Missing approved Studio print photograph');
});
