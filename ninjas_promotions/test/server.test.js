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

test('buy action fetches only the source, caches the CTA, and redirects to the merchant', async context => {
  let requests = 0;
  const repository = new PromotionsRepository({ fetcher: async url => {
    requests++;
    assert.equal(url.href, 'https://www.dezcontos.pt/oferta/product-1');
    return new Response('<a href="https://www.amazon.es/dp/B01wBswyf">Comprar na Amazon</a>');
  } });
  const app = await createApp({ repository });
  context.after(() => app.close());
  const responses = await Promise.all([app.inject('/api/buy?id=product-1'), app.inject('/api/buy?id=product-1')]);
  for (const response of responses) {
    assert.equal(response.statusCode, 302);
    assert.equal(response.headers.location, 'https://www.amazon.es/dp/B01wBswyf');
    assert.equal(response.headers['cache-control'], 'no-store');
  }
  await app.inject('/api/buy?id=product-1');
  assert.equal(requests, 1);
  for (const path of ['/api/buy?id=../secret', '/api/buy?id=https://example.com', '/api/buy']) {
    assert.equal((await app.inject(path)).statusCode, 400);
  }
  await assert.rejects(repository.getPurchase('../secret'), { statusCode: 400 });
});

test('unavailable merchant link shows a branded error instead of opening the source', async context => {
  const repository = new PromotionsRepository({ fetcher: async () => new Response('<h1>Sem link</h1>') });
  const app = await createApp({ repository });
  context.after(() => app.close());
  const response = await app.inject('/api/buy?id=product-1');
  assert.equal(response.statusCode, 502);
  assert.equal(response.headers.location, undefined);
  assert.match(response.body, /Ninjas Promotions/);
  assert.match(response.body, /Link da loja indispon/);
});

test('authenticated Ingress can resolve a merchant URL without navigating outside its session', async context => {
  const repository = new PromotionsRepository({ fetcher: async () => new Response('<a href="https://www.amazon.es/dp/B01wBswyf">Comprar na Amazon</a>') });
  const app = await createApp({ repository, ingressOnly: true });
  context.after(() => app.close());
  const response = await app.inject({ url: '/api/purchase-link?id=product-1', remoteAddress: '172.30.32.2' });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { url: 'https://www.amazon.es/dp/B01wBswyf' });
  assert.equal(response.headers.location, undefined);
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal((await app.inject('/api/purchase-link?id=product-1')).statusCode, 403);
  assert.equal((await app.inject({ url: '/api/purchase-link?id=../secret', remoteAddress: '172.30.32.2' })).statusCode, 400);
});

test('Amazon short links expand on the server without changing product or affiliate parameters', async () => {
  const requested = [];
  const finalUrl = 'https://www.amazon.es/dp/B0049U0DMC?th=1&tag=partner-21&ascsubtag=original';
  const repository = new PromotionsRepository({ fetcher: async (url, options) => {
    requested.push(url.href);
    if (url.hostname === 'www.dezcontos.pt') return new Response('<a href="https://link.amazon/example">Comprar na Amazon</a>');
    assert.equal(options.redirect, 'manual');
    if (url.hostname === 'link.amazon') return new Response(null, { status: 302, headers: { location: 'https://amzlinks.in/example' } });
    return new Response(null, { status: 302, headers: { location: finalUrl } });
  } });
  const results = await Promise.all([repository.getPurchase('product-1'), repository.getPurchase('product-1')]);
  assert.deepEqual(results, [finalUrl, finalUrl]);
  await repository.getPurchase('product-1');
  assert.deepEqual(requested, ['https://www.dezcontos.pt/oferta/product-1', 'https://link.amazon/example', 'https://amzlinks.in/example']);
});

test('Amazon expansion rejects private, unrelated and native-app redirects before following them', async () => {
  for (const location of ['https://127.0.0.1/private', 'https://evil.example/amazon', 'https://amazon.es.evil.example/product', 'amazonmobile://product', 'http://www.amazon.es/dp/product', 'https://user:password@www.amazon.es/dp/product']) {
    let requests = 0;
    const repository = new PromotionsRepository({ fetcher: async url => {
      requests++;
      if (url.hostname === 'www.dezcontos.pt') return new Response('<a href="https://amzn.to/example">Comprar na Amazon</a>');
      return new Response(null, { status: 302, headers: { location } });
    } });
    await assert.rejects(repository.getPurchase('product-1'), { statusCode: 502 });
    assert.equal(requests, 2);
  }
});

test('global search queries the complete source search and isolates cached query pages', async context => {
  const requested = [];
  const repository = new PromotionsRepository({ fetcher: async url => {
    requested.push(url.href);
    if (url.pathname === '/promocoes') return new Response(html);
    return new Response('<body>30 produtos<a href="/oferta/shelly"><p>Shelly 1 Gen3</p><span class="text-price-small">12,50</span><p>Publicado hoje</p></a></body>');
  } });
  const app = await createApp({ repository });
  context.after(() => app.close());
  await app.inject('/api/promotions');
  const response = await app.inject('/api/promotions?q=shelly');
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().products[0].title, 'Shelly 1 Gen3');
  assert.equal(response.json().total, 30);
  assert.equal(response.json().hasMore, true);
  await app.inject('/api/promotions?q=shelly');
  assert.equal(requested.length, 2);
  await app.inject('/api/promotions?q=shelly&page=2');
  await app.inject('/api/promotions?q=another');
  assert.deepEqual(requested.map(url => new URL(url).pathname), ['/promocoes', '/pesquisa', '/pesquisa', '/pesquisa']);
  assert.equal(new URL(requested[1]).searchParams.get('q'), 'shelly');
  assert.equal(new URL(requested[2]).searchParams.get('page'), '2');
  assert.equal(new URL(requested[3]).searchParams.get('q'), 'another');
  assert.equal((await app.inject('/api/promotions?q=' + 'a'.repeat(201))).statusCode, 400);
  assert.equal((await app.inject('/api/promotions?category=tecnologia&q=shelly')).statusCode, 400);
});

test('global search supports an empty result without showing the recent feed', async () => {
  const repository = new PromotionsRepository({ fetcher: async () => new Response('<body>0 produtos</body>') });
  const result = await repository.get('promocoes', 1, 'no-result');
  assert.equal(result.total, 0);
  assert.deepEqual(result.products, []);
  assert.equal(result.hasMore, false);
});

test('global search preserves known joined and reordered Only & Sons queries', async () => {
  let requests = 0;
  const repository = new PromotionsRepository({ fetcher: async url => {
    requests++;
    assert.equal(url.searchParams.get('q'), 'only sons');
    return new Response(html);
  } });
  for (const query of ['onlysons', 'only sons', 'Only & Sons', 'sons only', 'ONLY&SONS']) {
    await repository.get('promocoes', 1, query);
  }
  assert.equal(requests, 1);
});

test('Amazon expansion bounds loops and leaves other stores unchanged', async () => {
  let requests = 0;
  const repository = new PromotionsRepository({ fetcher: async () => {
    requests++;
    return new Response(null, { status: 302, headers: { location: 'https://link.amazon/loop' } });
  } });
  await assert.rejects(repository.resolveAmazonLink('https://link.amazon/loop'), /Too many/);
  assert.equal(requests, 4);
  const store = 'https://www.worten.pt/product?partner=original';
  assert.equal(await repository.resolveAmazonLink(store), store);
  assert.equal(requests, 4);
});