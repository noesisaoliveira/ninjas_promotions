import Fastify from 'fastify';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { CATEGORIES, SORTS, SOURCE } from './source.js';
import { PromotionsRepository } from './repository.js';

export async function createApp({ repository = new PromotionsRepository(), ingressOnly = false, fetcher = fetch, logger = false } = {}) {
  const app = Fastify({ logger, bodyLimit: 1024 });
  const images = new Map();
  app.addHook('onRequest', async (request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('Content-Security-Policy', "default-src 'self'; img-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'");
    if (ingressOnly && request.url !== '/health' && !['172.30.32.2', '::ffff:172.30.32.2'].includes(request.ip)) {
      return reply.code(403).send({ error: 'Ingress required' });
    }
  });
  const files = {
    '/': ['public/index.html', 'text/html; charset=utf-8'],
    '/app.js': ['public/app.js', 'text/javascript; charset=utf-8'],
    '/order.js': ['public/order.js', 'text/javascript; charset=utf-8'],
    '/style.css': ['public/style.css', 'text/css; charset=utf-8'],
    '/icon.png': ['icon.png', 'image/png'],
    '/logo.png': ['logo.png', 'image/png'],
    '/lucide.js': ['node_modules/lucide/dist/umd/lucide.js', 'text/javascript; charset=utf-8'],
  };
  for (const [route, [file, contentType]] of Object.entries(files)) {
    app.get(route, async (_, reply) => reply.type(contentType).send(await readFile(new URL(`../${file}`, import.meta.url))));
  }
  app.get('/health', async () => ({ status: 'ok', name: 'Ninjas Promotions' }));
  app.get('/api/meta', async () => ({ categories: CATEGORIES, sorts: SORTS, version: '0.1.4' }));
  app.get('/api/promotions', {
    schema: { querystring: {
      type: 'object', additionalProperties: false,
      properties: {
        category: { type: 'string', enum: CATEGORIES.map(item => item.id), default: 'promocoes' },
        page: { type: 'integer', minimum: 1, maximum: 1000, default: 1 },
      },
    } },
  }, async request => repository.get(request.query.category, request.query.page));
  app.get('/api/purchase-link', {
    schema: { querystring: {
      type: 'object', required: ['id'], additionalProperties: false,
      properties: { id: { type: 'string', pattern: '^[a-zA-Z0-9_-]+$', minLength: 1, maxLength: 300 } },
    } },
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    return { url: await repository.getPurchase(request.query.id) };
  });
  app.get('/api/buy', {
    schema: { querystring: {
      type: 'object', required: ['id'], additionalProperties: false,
      properties: { id: { type: 'string', pattern: '^[a-zA-Z0-9_-]+$', minLength: 1, maxLength: 300 } },
    } },
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    try {
      const destination = await repository.getPurchase(request.query.id);
      return reply.redirect(destination);
    } catch (error) {
      request.log.error(error);
      return reply.code(502).type('text/html; charset=utf-8').send(`<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Ninjas Promotions</title><link rel="stylesheet" href="../style.css"></head><body><header class="app-header"><a class="brand" href="../"><img src="../icon.png" width="48" height="48" alt=""><strong>Ninjas Promotions</strong></a></header><main><h1>Link da loja indispon&iacute;vel</h1><p>N&atilde;o foi poss&iacute;vel obter o link de compra. Tente novamente mais tarde.</p><a class="primary-button" href="../">Voltar &agrave; app</a></main></body></html>`);
    }
  });
  app.get('/api/image', {
    schema: { querystring: {
      type: 'object', required: ['path'], additionalProperties: false,
      properties: { path: { type: 'string', pattern: '^/api/images/[a-zA-Z0-9_+-]+\\.(png|jpg|jpeg|webp|avif)$', maxLength: 200 } },
    } },
  }, async (request, reply) => {
    const path = request.query.path;
    const cached = images.get(path);
    if (cached && Date.now() - cached.time < 3600000) {
      return reply.type(cached.type).header('Cache-Control', 'private, max-age=3600').send(cached.buffer);
    }
    const response = await fetcher(new URL(path, SOURCE), { signal: AbortSignal.timeout(15000), redirect: 'error' });
    const type = response.headers.get('content-type')?.split(';')[0];
    if (!response.ok || !['image/png', 'image/jpeg', 'image/webp', 'image/avif'].includes(type)) {
      return reply.code(502).send({ error: 'Image unavailable' });
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > 3 * 1024 * 1024) return reply.code(502).send({ error: 'Image too large' });
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    if (images.size >= 32) images.delete(images.keys().next().value);
    images.set(path, { buffer, type, time: Date.now() });
    return reply.type(type).header('Cache-Control', 'private, max-age=3600').send(buffer);
  });
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    reply.code(error.statusCode || 502).send({ error: error.statusCode === 400 ? 'Parametros invalidos.' : 'Servico temporariamente indisponivel. Tente novamente.' });
  });
  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const app = await createApp({ ingressOnly: process.env.INGRESS_ONLY === 'true', logger: true });
  await app.listen({ host: process.env.HOST || '127.0.0.1', port: Number(process.env.PORT || 8099) });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await app.close(); process.exit(0); });
}