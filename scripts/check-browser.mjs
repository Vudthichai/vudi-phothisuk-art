// Optional tooling: install Playwright separately or set PLAYWRIGHT_MODULE to its module URL.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = (process.argv[2] || 'http://localhost:8888').replace(/\/$/, '');
import assert from 'node:assert/strict';
const browser = await chromium.launch({...(new URL(base).protocol === 'https:' && process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {}),...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[];
const googleRequests=[];
const preview = new URL(base).hostname.startsWith('deploy-preview-');
async function blockGoogle(ctx) {
  // Netlify injects a preview-only collaboration toolbar outside this repository.
  // Isolate that platform script; validate real app assets with no Google transport.
  if (preview) await ctx.route('**/.netlify/scripts/cdp', route => route.fulfill({contentType:'application/javascript',body:'/* Netlify preview toolbar excluded from app validation. */'}));
  await ctx.route(/https:\/\/(?:[^/]+\.)?(?:googletagmanager\.com|google-analytics\.com|doubleclick\.net)\//, route => { googleRequests.push(new URL(route.request().url()).origin); return route.abort(); });
}
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
await blockGoogle(context);
const page=await context.newPage();page.on('response',r=>{if(r.status()>=400)console.log('HTTP_ERROR',r.status(),r.url())});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error' && !m.location().url.endsWith('/favicon.ico'))errors.push(m.text()+' '+JSON.stringify(m.location()))});
const routes=['/','/collections/forest-and-flowers/','/collections/forest-and-flowers/mother-nature/','/collections/forest-and-flowers/dragon-lily/','/collections/oceans/','/collections/oceans/beach-day/','/collections/regal-collection/sahara/','/exhibitions/','/about/','/contact/','/available-art/'];
for(const route of routes){
 await page.goto(base+route,{waitUntil:'networkidle'});
 assert(await page.locator('main h1').count());
 const canonicalRoute=route === '/contact/' ? '/about/' : route;
 assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://vudiphothisukart.com'+canonicalRoute);
 assert.equal(await page.locator('meta[property="og:url"]').getAttribute('content'),'https://vudiphothisukart.com'+canonicalRoute);
 const broken=await page.locator('main img').evaluateAll(imgs=>imgs.filter(i=>i.loading!=='lazy' && (!i.complete || i.naturalWidth===0)).map(i=>i.src));assert.deepEqual(broken,[]);
 console.log('DIRECT',route,'OK');
}
await page.goto(new URL('/collections/forest-and-flowers/', base).href,{waitUntil:'networkidle'});
await page.getByRole('link',{name:'View Mother Nature',exact:true}).click();
await page.waitForURL(url => url.pathname.replace(/\/$/, '').endsWith('/mother-nature'));
await page.waitForFunction(()=>document.querySelector('link[rel=canonical]').href.endsWith('/mother-nature/'));
assert((await page.title()).includes('Mother Nature'));
assert((await page.locator('#page-schema').textContent()).includes('VisualArtwork'));
await page.getByRole('button',{name:'Enlarge artwork',exact:true}).click();
assert(await page.getByRole('dialog').isVisible());await page.keyboard.press('Escape');
assert(await page.locator('main a[href^="mailto:"]').count());
console.log('DESKTOP client navigation, schema, enlargement, Escape, inquiry OK');
await page.setViewportSize({width:390,height:844});await page.goto(new URL('/', base).href,{waitUntil:'networkidle'});
const menu=page.getByRole('button',{name:/^Menu/});await menu.click();assert.equal(await menu.getAttribute('aria-expanded'),'true');
await page.getByRole('navigation',{name:'Main navigation',exact:true}).getByRole('link',{name:'Exhibitions',exact:true}).click();
assert.equal(await menu.getAttribute('aria-expanded'),'false');
await page.waitForFunction(()=>document.querySelector('meta[property="og:url"]').content.endsWith('/exhibitions/'));
assert.equal(await page.locator('main').evaluate(e=>e.textContent.includes('3706 Butler Street')),true);
console.log('MOBILE menu, navigation, metadata OK');
await page.goto(new URL('/collections/forest-and-flowers/mother-nature/', base).href,{waitUntil:'networkidle'});await page.getByRole('button',{name:'Enlarge Mother Nature',exact:true}).click();assert(await page.getByRole('dialog').isVisible());await page.keyboard.press('Escape');
console.log('MOBILE artwork viewer OK');
assert.deepEqual(errors,[]);console.log('No browser errors or hydration mismatches');
const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const staticPage=await nojs.newPage();
await staticPage.goto(new URL('/collections/forest-and-flowers/mother-nature/', base).href);assert(await staticPage.getByRole('heading',{name:'Mother Nature',exact:true}).isVisible());assert((await staticPage.locator('main').innerText()).includes('About the painting'));console.log('NO JAVASCRIPT artwork content visible');
if (preview) {
  const saved = await browser.newContext({viewport:{width:390,height:844}});
  await blockGoogle(saved);
  await saved.addInitScript(() => { try { localStorage.setItem('vpa.analytics-consent.v1', JSON.stringify({choice:'granted',time:Date.now()})); } catch {} });
  const p = await saved.newPage();
  await p.goto(base + '/?utm_source=gallery-outreach&utm_medium=email&utm_campaign=forest-flowers-2026&utm_content=gallery-001', {waitUntil:'networkidle'});
  assert.equal(await p.evaluate(() => typeof window.gtag), 'undefined');
  assert.equal(await p.locator('#vpa-google-tag').count(), 0);
  assert.deepEqual(googleRequests, []);
  await saved.close(); console.log('Hosted preview analytics stays disabled, including saved acceptance and approved UTMs.');
}
await browser.close();
