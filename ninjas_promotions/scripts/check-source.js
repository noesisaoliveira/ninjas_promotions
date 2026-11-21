import assert from 'node:assert/strict';
import { parsePromotions, SOURCE } from '../src/source.js';

const response = await fetch(`${SOURCE}/promocoes`, { signal: AbortSignal.timeout(20000) });
assert.equal(response.status, 200);
const result = parsePromotions(await response.text());
assert.ok(result.products.length >= 20, 'Expected at least 20 product cards');
assert.ok(result.total >= result.products.length);
assert.ok(result.products.every(product => product.title && product.price > 0 && product.image));
console.log(JSON.stringify({ count: result.products.length, total: result.total, first: result.products[0] }, null, 2));