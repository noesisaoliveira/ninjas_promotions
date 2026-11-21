import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { createApp } from '../src/server.js';

test('Home Assistant metadata and assets agree with the application', async context => {
  const config = parse(await readFile(new URL('../config.yaml', import.meta.url), 'utf8'));
  const repository = parse(await readFile(new URL('../../repository.yaml', import.meta.url), 'utf8'));
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(config.version, manifest.version);
  assert.equal(config.ingress, true);
  assert.equal(config.ingress_port, 8099);
  assert.equal(config.init, true);
  assert.deepEqual(config.arch, ['aarch64', 'amd64']);
  assert.equal(repository.url, config.url);
  const app = await createApp();
  context.after(() => app.close());
  assert.equal((await app.inject('/api/meta')).json().version, config.version);
  for (const path of ['/', '/app.js', '/order.js', '/style.css', '/lucide.js', '/icon.png', '/logo.png']) {
    const result = await app.inject(path);
    assert.equal(result.statusCode, 200, path);
    assert.ok(result.headers['content-security-policy']);
  }
  const html = (await app.inject('/')).body;
  assert.ok(!html.includes('dezcontos'));
  assert.ok(!/\b(?:src|href)="\//.test(html), 'Assets must be relative for Ingress');
  const icon = (await app.inject('/icon.png')).rawPayload;
  assert.equal(icon.readUInt32BE(16), 128);
  assert.equal(icon.readUInt32BE(20), 128);
});

test('purchase UI resolves inside Ingress instead of opening a protected route in a new window', async () => {
  const script = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.ok(script.includes('./api/purchase-link?'));
  assert.ok(script.includes("credentials: 'same-origin'"));
  assert.ok(!script.includes('./api/buy?'));
  assert.ok(!script.includes('window.open('));
  assert.ok(script.includes('escape(destination.href)'));
});