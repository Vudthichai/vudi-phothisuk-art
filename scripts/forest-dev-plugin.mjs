import { Buffer } from 'node:buffer';
export default function forestDevPlugin() { return {
name: 'private-forest-local-api',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/.netlify/functions/forest-collection', async (incoming, outgoing) => {
      try {
        const chunks = []; let length = 0;
        for await (const chunk of incoming) { length += chunk.length; if (length > 2048) { outgoing.statusCode = 400; outgoing.end(); return; } chunks.push(Buffer.from(chunk)); }
        const module = await server.ssrLoadModule('/netlify/functions/forest-collection.mjs');
        const headers = new Headers();
        for (const [key,value] of Object.entries(incoming.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(',') : value);
        const body = Buffer.concat(chunks);
        const request = new Request(`http://${incoming.headers.host}/.netlify/functions/forest-collection${incoming.url === '/' ? '' : incoming.url}`, { method: incoming.method, headers, ...(body.length ? { body } : {}) });
        const response = await module.default(request);
        outgoing.statusCode = response.status;
        response.headers.forEach((value,key) => outgoing.setHeader(key,value));
        outgoing.end(Buffer.from(await response.arrayBuffer()));
      } catch { outgoing.statusCode = 503; outgoing.end('{"error":"Private preview unavailable"}'); }
    });
  }
}; }
