import { CATEGORIES, SOURCE, parsePromotions } from './source.js';

export class PromotionsRepository {
  constructor({ fetcher = fetch, now = Date.now, ttl = 300000 } = {}) {
    this.fetcher = fetcher;
    this.now = now;
    this.ttl = ttl;
    this.cache = new Map();
    this.pending = new Map();
  }

  async get(category = 'promocoes', page = 1) {
    if (!CATEGORIES.some(item => item.id === category) || !Number.isInteger(page) || page < 1 || page > 1000) {
      throw Object.assign(new Error('Invalid category or page'), { statusCode: 400 });
    }
    const key = `${category}:${page}`;
    const cached = this.cache.get(key);
    if (cached && this.now() - cached.time < this.ttl) return { ...cached.data, stale: false };
    if (this.pending.has(key)) return this.pending.get(key);
    const request = this.load(category, page, cached).finally(() => this.pending.delete(key));
    this.pending.set(key, request);
    return request;
  }

  async load(category, page, cached) {
    try {
      const url = new URL(`/${category}`, SOURCE);
      url.searchParams.set('page', String(page));
      const response = await this.fetcher(url, {
        headers: { 'User-Agent': 'NinjasPromotions/0.1 (+https://github.com/noesisaoliveira/ninjas_promotions)' },
        signal: AbortSignal.timeout(20000), redirect: 'error',
      });
      if (!response.ok) throw new Error(`Source HTTP ${response.status}`);
      const parsed = parsePromotions(await response.text());
      if (!parsed.products.length && parsed.total > 0) throw new Error('Source layout changed or page unavailable');
      const data = {
        ...parsed, category, page, hasMore: page * 24 < parsed.total,
        fetchedAt: new Date(this.now()).toISOString(),
      };
      if (this.cache.size >= 150) this.cache.delete(this.cache.keys().next().value);
      this.cache.set(`${category}:${page}`, { time: this.now(), data });
      return { ...data, stale: false };
    } catch (error) {
      if (cached && this.now() - cached.time < 3600000) return { ...cached.data, stale: true };
      throw Object.assign(new Error('Nao foi possivel obter as promocoes. Tente novamente mais tarde.', { cause: error }), { statusCode: 502 });
    }
  }
}