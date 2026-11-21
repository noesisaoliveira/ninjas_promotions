import { load } from 'cheerio';
import { isIP } from 'node:net';
export { SORTS, sortProducts } from '../public/order.js';

export const SOURCE = 'https://www.dezcontos.pt';
export const CATEGORIES = [
  ['promocoes', 'Todas as categorias', 'layers'],
  ['tecnologia', 'Tecnologia', 'monitor'],
  ['casa', 'Casa', 'house'],
  ['moda-acessorios', 'Moda e Acess\u00f3rios', 'shirt'],
  ['beleza-saude', 'Beleza e Sa\u00fade', 'heart-pulse'],
  ['bebes-criancas', 'Beb\u00e9s e Crian\u00e7as', 'baby'],
  ['mercearia', 'Mercearia', 'shopping-basket'],
  ['desporto-lazer', 'Desporto e Lazer', 'dumbbell'],
  ['cultura-jogos', 'Cultura e Jogos', 'gamepad-2'],
  ['papelaria', 'Papelaria', 'pencil'],
  ['animais', 'Animais de Estima\u00e7\u00e3o', 'paw-print'],
  ['auto-moto', 'Auto e Moto', 'car'],
  ['bricolage', 'Bricolage', 'hammer'],
  ['presentes', 'Presentes', 'gift'],
].map(([id, label, icon]) => ({ id, label, icon }));
const clean = (text) => text.replace(/\s+/g, ' ').trim();
export const money = (text) => Number(text.replace(/[^\d,]/g, '').replace(',', '.'));

export function parsePurchaseLink(html) {
  const document = load(html);
  let destination = null;
  document('a[href]').each((_, element) => {
    if (destination) return;
    const anchor = document(element);
    if (!/^(Comprar|Ir para a loja)(\s|$)/i.test(clean(anchor.text()))) return;
    try {
      const url = new URL(anchor.attr('href'), SOURCE);
      if (url.protocol !== 'https:' || url.username || url.password || url.port
        || url.hostname === new URL(SOURCE).hostname || isIP(url.hostname)
        || !url.hostname.includes('.') || url.hostname.endsWith('.local')) return;
      destination = url.href;
    } catch {}
  });
  return destination;
}

export function parsePromotions(html) {
  const document = load(html);
  const products = [];
  const seen = new Set();
  document('a[href^="/oferta/"]').each((_, element) => {
    const card = document(element);
    const path = card.attr('href');
    const image = card.find('img').first();
    const title = clean(card.find('p').first().text());
    const priceText = card.find('[class*="text-price-"]').first().text();
    if (!title || !priceText || seen.has(path)) return;
    seen.add(path);
    const price = money(priceText);
    const originalText = card.find('.line-through').first().text();
    const originalPrice = originalText ? money(originalText) : null;
    const discountText = card.find('[class*="text-discount-badge"]').text();
    const discount = Number(discountText.replace(/[^\d]/g, '')) || 0;
    const imageUrl = image.attr('src') ? new URL(image.attr('src'), SOURCE) : null;
    const imagePath = imageUrl?.searchParams.get('url');
    const safeImagePath = imagePath?.startsWith('/api/images/') ? imagePath : null;
    products.push({
      id: path.split('/').pop(), title, description: image.attr('alt') || title,
      price, originalPrice, discount,
      saving: originalPrice === null ? 0 : Math.max(0, Number((originalPrice - price).toFixed(2))),
      image: safeImagePath,
      url: new URL(path, SOURCE).href,
      activity: clean(card.find('p').last().text()),
      expired: /\bExpirado\b/i.test(card.text()),
      tags: card.find('.whitespace-nowrap').map((_, tag) => clean(document(tag).text())).get(),
    });
  });
  const totalMatch = clean(document('body').text()).match(/([\d\s]+)\s*produtos/);
  const total = totalMatch ? Number(totalMatch[1].replace(/\s/g, '')) : products.length;
  return { products, total };
}
