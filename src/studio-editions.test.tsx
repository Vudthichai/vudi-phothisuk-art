// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ArtworkStudioEdition, StudioEditions } from './studio/StudioEditions';
import { studioArtwork, studioCollectionBundle, studioEditions } from './studio/editions';
import { primaryForestImage } from './forest/types';
afterEach(cleanup);
it('presents only the five approved reproductions with authentic photographs and no checkout', () => {
  render(<MemoryRouter><StudioEditions/></MemoryRouter>);
  const cards = screen.getAllByRole('article');
  expect(cards.map(card => within(card).getByRole('heading').textContent)).toEqual(['Mother Nature','Ethereal Bloom','Tiger Lily','75 Leaves','A Forest Forgotten']);
  cards.forEach((card, index) => {
    expect(within(card).getByText('$40')).toBeTruthy();
    expect(within(card).getByText('Coming Soon')).toBeTruthy();
    expect(within(card).getByText('Unsigned, open-edition reproduction')).toBeTruthy();
    const artwork = studioArtwork(studioEditions[index]);
    expect(within(card).getByRole('img').getAttribute('src')).toBe(primaryForestImage(artwork).variants.at(-1)!.src);
    expect(within(card).getByRole('link',{name:'View edition details'}).getAttribute('href')).toBe(`/collections/forest-and-flowers/${artwork.slug}/#studio-edition`);
  });
  expect(screen.getByText('$175')).toBeTruthy();
  expect(studioCollectionBundle.editionIds).toEqual(studioEditions.map(edition => edition.id));
  expect(screen.queryByRole('button')).toBeNull();
  expect(document.querySelector('form, input, iframe, a[href^="mailto:"]')).toBeNull();
  expect(document.body.textContent).not.toMatch(/signed, numbered|shipping included|archival|gsm/i);
});
it('limits individual panels to eligible art and preserves gifted originals as Not for Sale', () => {
  for (const edition of studioEditions) {
    const artwork = studioArtwork(edition);
    const view = render(<MemoryRouter><ArtworkStudioEdition artworkId={artwork.id}/></MemoryRouter>);
    expect(screen.getByRole('heading',{name:'Studio Edition — Fine Art Print'})).toBeTruthy();
    if (['tiger-lily','75-leaves'].includes(artwork.id)) {
      expect(artwork.availability).toBe('not-for-sale');
      expect(screen.getByText(/original painting is Not for Sale/)).toBeTruthy();
    }
    expect(screen.getByRole('link',{name:'Explore all Studio Editions'}).getAttribute('href')).toBe('/available-art/#studio-editions');
    view.unmount();
  }
  const { container } = render(<MemoryRouter><ArtworkStudioEdition artworkId="dragon-lily"/></MemoryRouter>);
  expect(container.innerHTML).toBe('');
});
it('describes contributions only as unapproved intentions, without an invented beneficiary', () => {
  render(<MemoryRouter><StudioEditions/></MemoryRouter>);
  const notes = document.querySelectorAll('.studio-contribution');
  expect(notes).toHaveLength(2);
  expect(notes[0].textContent).toContain('75% of profit intended for a veterans foundation (beneficiary to be confirmed)');
  expect(notes[1].textContent).toContain('20% of profit intended for Junglekeepers');
  notes.forEach(note => expect(note.textContent).toContain('Final terms and the profit calculation await approval'));
});
