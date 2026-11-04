// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { botanicalAssets, selectBotanicalAssets } from './botanical/registry';
import { BotanicalFall } from './components/BotanicalFall';
afterEach(cleanup);
it('registers twelve unique leaf/petal assets with colors, dimensions and implemented behavior metadata', () => {
  expect(botanicalAssets).toHaveLength(12);
  expect(new Set(botanicalAssets.map(a => a.id)).size).toBe(12);
  expect(selectBotanicalAssets({type:'leaf'})).toHaveLength(6);
  expect(selectBotanicalAssets({type:'petal'})).toHaveLength(6);
  expect(selectBotanicalAssets({type:'petal',color:'deep-red'}).map(a=>a.id)).toEqual(['petal-rose-red']);
  expect(selectBotanicalAssets({color:'deep-red'})).toHaveLength(2);
  for (const asset of botanicalAssets) {
    expect(asset.width).toBeGreaterThan(0); expect(asset.height).toBeGreaterThan(0);
    expect(asset.bytes).toBeGreaterThan(0); expect(asset.displayWidth).toBeLessThanOrEqual(45);
    expect(asset.image).toContain('/assets/botanical/');
    expect(asset.behaviors).toEqual(['fall','flutter']);
  }
});
it('supports balanced variable counts, custom selection and independent motion overrides', () => {
  const { container, rerender } = render(<BotanicalFall count={6}/>);
  expect(container.querySelectorAll('.forest-leaf')).toHaveLength(3);
  expect(container.querySelectorAll('.forest-petal')).toHaveLength(3);
  rerender(<BotanicalFall particles={[{assetId:'leaf-red',duration:4,delay:.8,drift:-75,sway:5,rotation:25,scale:.9,left:'72%',displayWidth:40}]} distance="320px"/>);
  expect(container.querySelectorAll('.forest-drift-piece')).toHaveLength(1);
  const layer=container.querySelector<HTMLElement>('.forest-drift')!;
  const piece=container.querySelector<HTMLElement>('.forest-drift-piece')!;
  expect(piece.dataset.botanicalId).toBe('leaf-red');
  expect(piece.style.getPropertyValue('--duration')).toBe('4s');
  expect(piece.style.getPropertyValue('--delay')).toBe('0.8s');
  expect(piece.style.getPropertyValue('--drift-x')).toBe('-75px');
  expect(piece.style.getPropertyValue('--scale')).toBe('0.9');
  expect(piece.style.left).toBe('72%');
  expect(layer.style.getPropertyValue('--fall-distance')).toBe('320px');
  rerender(<BotanicalFall count={0}/>);expect(container.querySelector('.forest-drift')).toBeNull();
  rerender(<BotanicalFall count={50}/>);expect(container.querySelectorAll('.forest-drift-piece')).toHaveLength(12);
});
function end(element: Element, name: string) {
  // jsdom lacks AnimationEvent, so React may register the WebKit event fallback.
  for (const type of ['animationend', 'webkitAnimationEnd']) {
    const event=new Event(type,{bubbles:true});
    Object.defineProperty(event,'animationName',{value:name});fireEvent(element,event);
  }
}
it('removes a completed sequence only after all falls finish, and replays when settings change', () => {
  const { container, rerender }=render(<BotanicalFall count={2}/>);
  const layer=container.querySelector('.forest-drift')!;
  const pieces=[...container.querySelectorAll('.forest-drift-piece')];
  end(pieces[0].querySelector('img')!,'leaf-flutter');expect(container.querySelector('.forest-drift')).toBe(layer);
  end(pieces[0],'forest-fall');end(pieces[0],'forest-fall');expect(container.querySelector('.forest-drift')).toBe(layer);
  end(pieces[1],'forest-fall');expect(container.querySelector('.forest-drift')).toBeNull();
  rerender(<BotanicalFall count={2}/>);expect(container.querySelector('.forest-drift')).toBeNull();
  rerender(<BotanicalFall count={3}/>);expect(container.querySelectorAll('.forest-drift-piece')).toHaveLength(3);
});
it('selects separate scene presets without modifying menu or painting structure', () => {
  const { container, rerender }=render(<BotanicalFall scene="menu"/>);
  const menu=[...container.querySelectorAll<HTMLElement>('[data-botanical-id]')].map(e=>e.dataset.botanicalId);
  rerender(<BotanicalFall scene="reveal"/>);
  const reveal=[...container.querySelectorAll<HTMLElement>('[data-botanical-id]')].map(e=>e.dataset.botanicalId);
  expect(menu).not.toEqual(reveal);
  expect(container.querySelectorAll('.forest-leaf')).toHaveLength(3);
  expect(container.querySelectorAll('.forest-petal')).toHaveLength(2);
  expect(container.querySelector('.forest-drift')?.getAttribute('data-botanical-scene')).toBe('reveal');
});
