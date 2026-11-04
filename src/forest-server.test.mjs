import { beforeAll, afterAll, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes, createCipheriv, createHmac } from 'node:crypto';
import { createHandler } from '../netlify/functions/forest-collection.mjs';
let root, handler;
const key = randomBytes(32);
const environment = { FOREST_COLLECTION_PASSWORD: 'test-password', FOREST_COLLECTION_CONTENT_KEY: key.toString('base64') };
const file = 'a'.repeat(32) + '.enc';
const content = { title: 'Test collection', introduction: ['Private text'], artworks: [{ id: 'fixture', description: ['Protected description'], images: [{ variants: [{ key: 'fixture-640', file, width: 640, height: 900 }] }] }] };
function seal(bytes) { const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv); const encrypted = Buffer.concat([cipher.update(bytes),cipher.final()]); return Buffer.concat([Buffer.from('VFF1'),iv,cipher.getAuthTag(),encrypted]); }
function request(method = 'GET', options = {}) { return new Request('https://art.test/.netlify/functions/forest-collection' + (options.query ?? ''), { method, headers: { Origin: 'https://art.test', ...(options.cookie ? { cookie: options.cookie } : {}), ...(method === 'POST' ? {'Content-Type':'application/json'} : {}), ...options.headers }, ...(options.body ? {body: options.body} : {}) }); }
async function login() { const response = await handler(request('POST',{body: JSON.stringify({password: 'test-password'})})); return { response, cookie: response.headers.get('set-cookie').split(';')[0] }; }
beforeAll(async () => { root = await mkdtemp(join(tmpdir(),'forest-auth-')); await mkdir(join(root,'assets')); await writeFile(join(root,'collection.enc'),seal(Buffer.from(JSON.stringify(content)))); await writeFile(join(root,'assets',file),seal(Buffer.from('test-webp-bytes'))); handler = createHandler({contentRoot:root,environment}); });
afterAll(async () => rm(root,{recursive:true,force:true}));
it('fails closed without both private runtime settings', async () => {
  expect((await createHandler({environment:{}})(request())).status).toBe(503);
  expect((await createHandler({environment:{FOREST_COLLECTION_PASSWORD:'test'}})(request())).status).toBe(503);
});
it('rejects anonymous content and image requests with no-store/noindex headers', async () => {
  for (const query of ['', '?image=fixture-640']) { const r=await handler(request('GET',{query})); expect(r.status).toBe(401); expect(await r.text()).not.toContain('Protected description'); expect(r.headers.get('cache-control')).toContain('no-store'); expect(r.headers.get('x-robots-tag')).toContain('noindex'); }
});
it('rejects incorrect passwords and cross-origin mutations', async () => {
  expect((await handler(request('POST',{body:'{"password":"wrong"}'}))).status).toBe(401);
  expect((await handler(request('POST',{headers:{Origin:'https://other.test'},body:'{"password":"test-password"}'}))).status).toBe(403);
  expect((await handler(request('DELETE',{headers:{Origin:'https://other.test'}}))).status).toBe(403);
});
it('authenticates with an HttpOnly Secure SameSite session cookie and no persistent expiry', async () => {
  const {response,cookie}=await login(); expect(response.status).toBe(200);
  const header=response.headers.get('set-cookie'); expect(header).toContain('HttpOnly'); expect(header).toContain('Secure'); expect(header).toContain('SameSite=Strict'); expect(header).not.toContain('Max-Age');
  const data=await response.json(); expect(data.artworks[0].description).toEqual(['Protected description']); expect(data.artworks[0].images[0].variants[0]).not.toHaveProperty('file');
  expect((await handler(request('GET',{cookie}))).status).toBe(200);
});
it('protects whitelisted image delivery and rejects traversal/unknown identifiers', async () => {
  const {cookie}=await login(); const image=await handler(request('GET',{cookie,query:'?image=fixture-640'}));
  expect(image.headers.get('content-type')).toBe('image/webp'); expect(await image.text()).toBe('test-webp-bytes');
  expect((await handler(request('GET',{cookie,query:'?image=../../source.pdf'}))).status).toBe(404);
});
it('rejects tampered and expired sessions', async () => {
  const {cookie}=await login(); expect((await handler(request('GET',{cookie:cookie+'x'}))).status).toBe(401);
  const payload=Buffer.from(JSON.stringify({exp:Date.now()-1})).toString('base64url'); const signature=createHmac('sha256',createHmac('sha256',key).update('session-key-v1:test-password').digest()).update('forest-session-v1:'+payload).digest('base64url');
  expect((await handler(request('GET',{cookie:'__Host-vudi-forest='+payload+'.'+signature}))).status).toBe(401);
});
it('relocks by clearing the browser cookie', async () => {
  const {cookie}=await login(); const r=await handler(request('DELETE',{cookie})); expect(r.status).toBe(200); expect(r.headers.get('set-cookie')).toContain('Max-Age=0');
});
it('never serves encrypted content when runtime key is wrong or package is corrupted', async () => {
  const bad = createHandler({contentRoot:root,environment:{...environment,FOREST_COLLECTION_CONTENT_KEY:randomBytes(32).toString('base64')}});
  expect((await bad(request('POST',{body:'{"password":"test-password"}'}))).status).toBe(503);
});

it('changing the configured password invalidates prior signed sessions', async () => {
 const {cookie}=await login();
 const rotated=createHandler({contentRoot:root,environment:{...environment,FOREST_COLLECTION_PASSWORD:'new-password'}});
 expect((await rotated(request('GET',{cookie}))).status).toBe(401);
});
