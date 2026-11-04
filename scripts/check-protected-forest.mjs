import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
async function files(dir){return(await Promise.all((await readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?files(join(dir,e.name)):join(dir,e.name)))).flat();}
for(const path of await files('netlify/private/forest')){
 if(!path.endsWith('.enc'))throw Error('Plaintext file in protected package: '+path);
 if((await readFile(path)).subarray(0,4).toString()!=='VFF1')throw Error('Invalid encryption envelope');
}
const forbidden = [process.env.FOREST_COLLECTION_PASSWORD, process.env.FOREST_COLLECTION_CONTENT_KEY].filter(Boolean);
if (forbidden.length === 2) {
 const {default: handler} = await import('../netlify/functions/forest-collection.mjs');
 const response = await handler(new Request('https://local.test/.netlify/functions/forest-collection', {method:'POST',headers:{Origin:'https://local.test','Content-Type':'application/json'},body:JSON.stringify({password:process.env.FOREST_COLLECTION_PASSWORD})}));
 if (!response.ok) throw Error('Cannot validate protected content with configured key');
 const data=await response.json(); forbidden.push(...data.introduction, ...data.artworks.flatMap(a=>a.description));
}
for(const path of await files('dist')){
 if(path.endsWith('.enc')||/IMG_692|Forest-and-Flowers-Descriptions/.test(path))throw Error('Private source emitted into static build');
 if(/\.(js|html|css)$/.test(path)){
  const content=await readFile(path,'utf8');
  for(const text of forbidden)if(content.includes(text))throw Error('Protected text/password/key emitted in static build');
 }
}
console.log('PASS: encrypted package only; no protected descriptions, originals, password or runtime key in static output.');
