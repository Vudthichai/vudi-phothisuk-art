// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PrivateForest } from './forest/PrivateForest';
import collection from '../public/forest-preview/collection.json';
const key='vudi-forest-preview-unlocked';
const art = (slug: string, gift = false) => ({ id:slug,slug,title:'Test painting '+slug,dimensions:null,medium:null,description:['Test description'],copyStatus:'provisional',availability:gift?'not-for-sale':'provisional',availabilityNote:gift?'Not for Sale (personal gift)':'Availability to be confirmed',images:[{id:slug,alt:'Test original photograph',role:'full',variants:[{key:slug+'-640',src:'/forest-preview/images/test.webp',width:640,height:900}]}] });
const data={title:'Forest & Flowers',introduction:['Test introduction'],artworks:[art('test-original'),art('test-gift',true)]};
function page(path='/collections/forest-and-flowers') { return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/collections/forest-and-flowers" element={<PrivateForest/>}/><Route path="/collections/forest-and-flowers/:artworkSlug" element={<PrivateForest/>}/></Routes></MemoryRouter>); }
beforeEach(()=>{sessionStorage.clear();vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json(data)));});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
it('shows the entrance for direct artwork URLs without fetching the public data yet',async()=>{
 const {container}=page('/collections/forest-and-flowers/test-original');await screen.findByLabelText('Password');
 expect(container.querySelector('img')).toBeNull();expect(fetch).not.toHaveBeenCalled();
 expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex');
});
it('rejects incorrect passwords then accepts Evergreen with no server settings',async()=>{
 const {container}=page();await screen.findByLabelText('Password');
 fireEvent.change(screen.getByLabelText('Password'),{target:{value:'wrong'}});fireEvent.submit(container.querySelector('form')!);
 await screen.findByText(/password was not recognized/);expect(fetch).not.toHaveBeenCalled();
 fireEvent.change(screen.getByLabelText('Password'),{target:{value:'Evergreen'}});fireEvent.submit(container.querySelector('form')!);
 await screen.findByText('Test painting test-original');expect(sessionStorage.getItem(key)).toBe('yes');
 expect(vi.mocked(fetch).mock.calls[0][0]).toBe('/forest-preview/collection.json');
 expect(container.querySelectorAll('a[href^="mailto:"]')).toHaveLength(1);
});
it('remembers access across reloads and direct artwork visits in the same tab session',async()=>{
 sessionStorage.setItem(key,'yes');page('/collections/forest-and-flowers/test-original');
 await screen.findByText('Dimensions to be confirmed');expect(screen.getByText(/Provisional description/)).toBeDefined();
 expect(screen.getByRole('link',{name:'Inquire for Pricing'}).getAttribute('href')).toContain(encodeURIComponent('Test painting test-original'));
});
it('relocks locally, removing the session flag and displayed collection',async()=>{
 sessionStorage.setItem(key,'yes');const {container}=page();await screen.findByText('Test painting test-original');
 fireEvent.click(screen.getByRole('button',{name:'Lock collection'}));await screen.findByLabelText('Password');
 expect(container.querySelector('.private-forest-gallery')).toBeNull();expect(sessionStorage.getItem(key)).toBeNull();expect(fetch).toHaveBeenCalledTimes(1);
});
it('reports a failed content download without remembering new access',async()=>{
 vi.mocked(fetch).mockResolvedValue(Response.json({}, {status:404}));const {container}=page();await screen.findByLabelText('Password');
 fireEvent.change(screen.getByLabelText('Password'),{target:{value:'Evergreen'}});fireEvent.submit(container.querySelector('form')!);
 await screen.findByText('The preview could not load. Please try again.');expect(sessionStorage.getItem(key)).toBeNull();
});
it('still opens when browser storage is unavailable',async()=>{
 vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw Error('blocked');});vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('blocked');});
 const {container}=page();await screen.findByLabelText('Password');fireEvent.change(screen.getByLabelText('Password'),{target:{value:'Evergreen'}});fireEvent.submit(container.querySelector('form')!);
 await screen.findByText('Test painting test-original');
});
it('removes noindex metadata when leaving the preview component',async()=>{
 const {unmount}=page();await screen.findByLabelText('Password');unmount();await waitFor(()=>expect(document.querySelector('meta[name="robots"]')).toBeNull());
});
it('preserves ten originals, two not-for-sale exceptions and twelve existing photographs',()=>{
 expect(collection.artworks).toHaveLength(10);expect(collection.artworks.reduce((n,a)=>n+a.images.length,0)).toBe(12);
 expect(collection.artworks.filter(a=>a.availability==='not-for-sale').map(a=>a.title)).toEqual(['Tiger Lily','75 Leaves']);
 expect(collection.artworks.filter(a=>a.availability==='provisional')).toHaveLength(8);
 expect(collection.artworks.find(a=>a.slug==='dragon-lily')?.dimensions).toBeNull();
});
