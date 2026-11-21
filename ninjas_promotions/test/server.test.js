import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.js';
import { PromotionsRepository } from '../src/repository.js';

const html = '<body>24 produtos<a href="/oferta/one"><p>Produto</p><span class="text-price-small">2,50</span><p>Publicado hoje</p></a></body>';

test('repository validates paths, coalesces requests, caches and marks stale data', async () => {
  let requests = 0;
  let time = 0;
  let offline = false;
  const repository = new PromotionsRepository({ now: () => time, fetcher: async () => {
    requests++;
    if (offline) throw new Error('offline');
    return new Response(html);
  } });
  await Promise.all([repository.get(), repository.get()]);
  assert.equal(requests, 1);
  await repository.get();
  assert.equal(requests, 1);
  await assert.rejects(repository.get('../bad'), { statusCode: 400 });
  time = 310000;
  offline = true;
  assert.equal((await repository.get()).stale, true);
  time = 3700000;
  await assert.rejects(repository.get(), { statusCode: 502 });
});

test('API rejects invalid parameters and image proxy SSRF/traversal', async context => {
  const app = await createApp({ repository: { get: async (category, page) => ({ category, page, products: [] }) } });
  context.after(() => app.close());
  assert.equal((await app.inject('/health')).statusCode, 200);
  const result = await app.inject('/api/promotions');
  assert.deepEqual(result.json(), { category: 'promocoes', page: 1, products: [] });
  for (const path of ['/api/promotions?category=evil', '/api/promotions?page=-1', '/api/promotions?page=1.5', '/api/image?path=https://example.com', '/api/image?path=/api/images/../../secret']) {
    assert.equal((await app.inject(path)).statusCode, 400);
  }
  assert.equal((await app.inject('/api/meta')).json().categories.length, 14);
});

test('Ingress requires actual proxy address, never a spoofed header', async context => {
  const app = await createApp({ ingressOnly: true });
  context.after(() => app.close());
  assert.equal((await app.inject({ url: '/api/meta', headers: { 'x-forwarded-for': '172.30.32.2', 'x-ingress-path': '/test' } })).statusCode, 403);
  assert.equal((await app.inject({ url: '/api/meta', remoteAddress: '172.30.32.2' })).statusCode, 200);
  assert.equal((await app.inject('/health')).statusCode, 200);
});

test('image filenames can contain plus without permitting external URLs', async context => {
  let requested;
  const app = await createApp({ fetcher: async url => {
    requested = url;
    return new Response(Buffer.from('image'), { headers: { 'content-type': 'image/jpeg' } });
  } });
  context.after(() => app.close());
  const path = '/api/images/39159-2-71qzxR+TVlL.jpeg';
  const response = await app.inject(`/api/image?path=${encodeURIComponent(path)}`);
  assert.equal(response.statusCode, 200);
  assert.equal(requested.hostname, 'www.dezcontos.pt');
  assert.equal(requested.pathname, path);
  assert.equal((await app.inject(`/api/image?path=${encodeURIComponent('/api/images/../secret.jpeg')}`)).statusCode, 400);
});