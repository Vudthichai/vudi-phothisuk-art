// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PrivateForest } from './forest/PrivateForest';
const art = (slug: string, gift = false) => ({ id:slug,slug,title:'Test painting '+slug,dimensions:null,medium:null,description:['Private test description'],copyStatus:'provisional',availability:gift?'not-for-sale':'provisional',availabilityNote:gift?'Not for Sale (personal gift)':'Availability to be confirmed',images:[{id:slug,alt:'Test original photograph',role:'full',variants:[{key:slug+'-640',width:640,height:900}]}] });
const data={title:'Forest & Flowers',introduction:['Test private introduction'],artworks:[art('test-original'),art('test-gift',true)]};
function page(path='/collections/forest-and-flowers') { return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/collections/forest-and-flowers" element={<PrivateForest/>}/><Route path="/collections/forest-and-flowers/:artworkSlug" element={<PrivateForest/>}/></Routes></MemoryRouter>); }
beforeEach(()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({error:'Enter password to view the collection.'},{status:401})));});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('gates a direct artwork route without rendering protected descriptions or image links',async()=>{
 const {container}=page('/collections/forest-and-flowers/test-original');
 await screen.findByLabelText('Password');
 expect(container.textContent).not.toContain('Private test description');expect(container.querySelector('img')).toBeNull();
 expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex');
});
it('supports rejected then accepted passwords and keeps protected data only after server approval',async()=>{
 vi.mocked(fetch).mockResolvedValueOnce(Response.json({}, {status:401})).mockResolvedValueOnce(Response.json({error:'Not recognized'},{status:401})).mockResolvedValueOnce(Response.json(data));
 const {container}=page();await screen.findByLabelText('Password');
 fireEvent.change(screen.getByLabelText('Password'),{target:{value:'wrong'}});fireEvent.submit(container.querySelector('form')!);await screen.findByText('Not recognized');
 fireEvent.change(screen.getByLabelText('Password'),{target:{value:'test-only'}});fireEvent.submit(container.querySelector('form')!);
 await screen.findByText('Test painting test-original');expect(container.querySelectorAll('a[href^="mailto:"]')).toHaveLength(1);
 expect(container.querySelector('.private-forest-gallery')?.textContent).toContain('Not for Sale');
});
it('shows missing dimensions and provisional copy without inventing a medium or price',async()=>{
 vi.mocked(fetch).mockResolvedValue(Response.json(data));page('/collections/forest-and-flowers/test-original');
 await screen.findByText('Dimensions to be confirmed');expect(screen.getByText(/Provisional description/)).toBeDefined();
 expect(screen.getByRole('link',{name:'Inquire for Pricing'}).getAttribute('href')).toContain(encodeURIComponent('Test painting test-original'));
});
it('clears protected content on successful relock',async()=>{
 vi.mocked(fetch).mockResolvedValueOnce(Response.json(data)).mockResolvedValueOnce(Response.json({locked:true}));
 const {container}=page();await screen.findByText('Test painting test-original');fireEvent.click(screen.getByRole('button',{name:'Lock collection'}));
 await screen.findByLabelText('Password');expect(container.querySelector('.private-forest-gallery')).toBeNull();
});
it('treats missing server configuration as a closed gate, never a client-only fallback',async()=>{
 vi.mocked(fetch).mockResolvedValue(Response.json({error:'Awaiting secure server configuration'},{status:503}));
 const {container}=page();await screen.findByText('Awaiting secure server configuration');expect(container.querySelector('.private-forest-gallery')).toBeNull();
});
it('removes noindex metadata when leaving the protected component',async()=>{
 const {unmount}=page();await screen.findByLabelText('Password');unmount();await waitFor(()=>expect(document.querySelector('meta[name="robots"]')).toBeNull());
});
