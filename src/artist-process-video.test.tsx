// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { ArtistProcessVideo } from './pages/ArtistProcessVideo';
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('keeps video sources out of reduced-motion rendering and responds to preference changes', () => {
  let listener = () => {};
  const query = { matches:true, addEventListener:vi.fn((_event:string, fn:()=>void) => { listener=fn; }), removeEventListener:vi.fn() };
  vi.stubGlobal('matchMedia',vi.fn(() => query));
  vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(() => {});
  const view=render(<ArtistProcessVideo/>);
  expect(view.container.querySelector('video,source')).toBeNull();
  expect(view.container.querySelector('img')?.getAttribute('src')).toBe('/artist/artist-process-poster.webp');
  act(() => { query.matches=false;listener(); });
  const video=view.container.querySelector('video')!;
  expect(video.muted && video.autoplay && video.loop && video.playsInline).toBe(true);
  expect(video.controls).toBe(false);
  act(() => { query.matches=true;listener(); });
  expect(view.container.querySelector('video,source')).toBeNull();
  view.unmount();expect(query.removeEventListener).toHaveBeenCalled();
});
it('falls back to the authentic poster if video decoding fails', () => {
  vi.stubGlobal('matchMedia',vi.fn(() => ({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
  const {container}=render(<ArtistProcessVideo/>);
  fireEvent.error(container.querySelector('video')!);
  expect(container.querySelector('video')).toBeNull();
  expect(container.querySelector('img')?.getAttribute('src')).toBe('/artist/artist-process-poster.webp');
});
