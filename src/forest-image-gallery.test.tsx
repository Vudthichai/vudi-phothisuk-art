// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ArtworkImageGallery } from './forest/ArtworkImageGallery';
import { primaryForestImage, type ForestImage } from './forest/types';
import collection from '../public/forest-preview/collection.json';
const images: ForestImage[] = ['full','angle','detail'].map((role,index)=>({id:`view-${index}`,role:role as ForestImage['role'],alt:`Painting view ${index}`,caption:index===2?'Sculpted petals':undefined,variants:[{key:`v${index}`,src:`/test-${index}.webp`,width:600,height:900}]}));
beforeEach(()=>{
 Object.defineProperty(HTMLImageElement.prototype,'decode',{configurable:true,value:vi.fn().mockResolvedValue(undefined)});
 Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:vi.fn(function(this:HTMLDialogElement){this.setAttribute('open','');})});
 Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:vi.fn(function(this:HTMLDialogElement){this.removeAttribute('open');})});
});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it('shows one main image and changes it using thumbnail buttons',async()=>{
 const {container}=render(<ArtworkImageGallery title="Test painting" images={images}/>);
 expect(container.querySelectorAll('.forest-photo-stage img')).toHaveLength(1);
 fireEvent.click(screen.getByRole('button',{name:'View Angled view'}));
 await waitFor(()=>expect(container.querySelector('.forest-photo-stage img')?.getAttribute('alt')).toBe('Painting view 1'));
 expect(screen.getByRole('button',{name:'View Angled view'}).getAttribute('aria-pressed')).toBe('true');
 fireEvent.click(screen.getByRole('button',{name:'View Sculpted petals'}));
 await waitFor(()=>expect(container.querySelector('.forest-selected-photo figcaption')?.textContent).toContain('Sculpted petals'));
});
it('supports arrows/Home/End and keeps thumbnail keyboard focus on selected view',async()=>{
 render(<ArtworkImageGallery title="Test painting" images={images}/>);
 const first=screen.getByRole('button',{name:'View Full composition'});first.focus();fireEvent.keyDown(first,{key:'ArrowRight'});
 await waitFor(()=>expect(document.activeElement).toBe(screen.getByRole('button',{name:'View Angled view'})));
 fireEvent.keyDown(document.activeElement!,{key:'End'});
 expect(document.activeElement).toBe(screen.getByRole('button',{name:'View Sculpted petals'}));
 fireEvent.keyDown(document.activeElement!,{key:'Home'});expect(document.activeElement).toBe(first);
});
it('decodes requested photos before replacing the current one and handles failures',async()=>{
 let resolve!:()=>void;
 vi.mocked(HTMLImageElement.prototype.decode).mockImplementationOnce(()=>new Promise<void>(r=>{resolve=r;}));
 const {container}=render(<ArtworkImageGallery title="Test painting" images={images}/>);
 fireEvent.click(screen.getByRole('button',{name:'Next photograph'}));
 expect(container.querySelector('.forest-photo-stage img')?.getAttribute('alt')).toBe('Painting view 0');
 expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();resolve();
 await waitFor(()=>expect(container.querySelector('.forest-photo-stage img')?.getAttribute('alt')).toBe('Painting view 1'));
 vi.mocked(HTMLImageElement.prototype.decode).mockRejectedValueOnce(Error('missing'));
 fireEvent.click(screen.getByRole('button',{name:'Next photograph'}));await screen.findByRole('alert');
 expect(container.querySelector('.forest-photo-stage img')?.getAttribute('alt')).toBe('Painting view 1');
});
it('opens and closes an enlarged view and omits unnecessary controls for one photo',()=>{
 render(<ArtworkImageGallery title="Test painting" images={[images[0]]}/>);
 expect(screen.queryByRole('button',{name:'Next photograph'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:/Enlarge Test painting/}));
 expect(screen.getByRole('dialog').hasAttribute('open')).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'Close enlarged view'}));expect(screen.queryByRole('dialog')).toBeNull();
});
it('records upright Dragon Lily photographs in gallery order',()=>{
 const art=collection.artworks.find(a=>a.slug==='dragon-lily')!;
 expect(art.images.filter(photo=>photo.role==='detail')).toHaveLength(4);
 for(const variant of art.images[0].variants){
   expect(variant.width).toBeLessThan(variant.height);
 }
 expect(art.images[0].id).toBe(art.galleryImageId);
 expect(primaryForestImage({...art,availability:'provisional',images:images,galleryImageId:images[1].id}).id).toBe(images[1].id);
});
it('supports texture and room roles without changing the gallery interface',()=>{
 const extra:ForestImage[]=[{...images[0],id:'texture',role:'texture'},{...images[1],id:'room',role:'room',caption:'Room context'}];
 render(<ArtworkImageGallery title="Test painting" images={extra}/>);
 expect(screen.getByRole('button',{name:'View Texture close-up'})).toBeDefined();
 expect(screen.getByRole('button',{name:'View Room context'})).toBeDefined();
});
