import { test } from 'node:test';
import assert from 'node:assert/strict';
import { money, parsePromotions, sortProducts } from '../src/source.js';

test('Portuguese prices retain thousands and decimals', () => {
  assert.equal(money('1.234,56 €'), 1234.56);
});

test('extracts products, not advertising, and deduplicates cards', () => {
  const card = `<a href="/oferta/test"><img alt="Product" src="/_next/image?url=%2Fapi%2Fimages%2Ftest.png&w=640"><p>Produto</p><span class="text-price-small">12,50 €</span><span class="line-through">25,00 €</span><span class="text-discount-badge">-<!-- -->50<!-- -->%</span><p>Publicado ha 10 min</p></a>`;
  const result = parsePromotions(`<body><h1>1 234 produtos</h1>${card}${card}<a href="/moda">Publicidade</a></body>`);
  assert.equal(result.total, 1234);
  assert.equal(result.products.length, 1);
  assert.equal(result.products[0].saving, 12.5);
  assert.equal(result.products[0].discount, 50);
  assert.equal(result.products[0].image, '/api/images/test.png');
});

test('default order preserves source recency; other sorts do not mutate it', () => {
  const products = [{ title: 'Z', price: 10, discount: 20, saving: 3 }, { title: 'A', price: 5, discount: 50, saving: 5 }];
  assert.deepEqual(sortProducts(products), products);
  for (const sort of ['price-asc', 'discount', 'saving', 'name']) {
    assert.equal(sortProducts(products, sort)[0].title, 'A');
  }
  assert.equal(sortProducts(products, 'price-desc')[0].title, 'Z');
  assert.equal(products[0].title, 'Z');
});