import { sortProducts } from './order.js';

const element = id => document.getElementById(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const currency = value => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
const number = value => new Intl.NumberFormat('pt-PT').format(value);
const icon = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;
const icons = () => globalThis.lucide?.createIcons();
let saved = [];
try {
  const stored = JSON.parse(localStorage.getItem('ninjas.saved.v1') || '[]');
  if (Array.isArray(stored)) saved = stored.filter(product => product && typeof product.id === 'string' && typeof product.title === 'string' && Number.isFinite(product.price)).slice(0, 500);
} catch {}
const state = { products: [], meta: { categories: [], sorts: [] }, category: 'promocoes', page: 0, total: 0, hasMore: false, loading: false, favorites: false, stale: false, fetchedAt: null, error: '', view: 'grid' };
let controller;
let toastTimer;

function toast(message) {
  element('toast').textContent = message;
  element('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { element('toast').hidden = true; }, 3000);
}

function filteredProducts() {
  const query = element('search').value.trim().toLocaleLowerCase('pt');
  const maximum = element('max-price').value === '' ? Infinity : Number(element('max-price').value);
  const minimum = Number(element('min-discount').value);
  const tag = element('tag').value;
  return sortProducts((state.favorites ? saved : state.products).filter(product =>
    `${product.title} ${product.description}`.toLocaleLowerCase('pt').includes(query)
    && product.price <= maximum && product.discount >= minimum
    && (!tag || product.tags?.includes(tag))
    && (!element('hide-expired').checked || !product.expired)
  ), element('sort').value);
}

function offerUrl(product) {
  return /^[a-zA-Z0-9_-]{1,300}$/.test(product.id) ? `./api/buy?id=${encodeURIComponent(product.id)}` : '#';
}

function imageUrl(product) {
  return product.image ? `./api/image?path=${encodeURIComponent(product.image)}` : './icon.png';
}

function renderCard(product) {
  const isSaved = saved.some(item => item.id === product.id);
  return `<article class="product" data-id="${escape(product.id)}">
    ${product.discount ? `<span class="discount">-${escape(product.discount)}%</span>` : ''}
    <button class="icon-button save-button ${isSaved ? 'saved' : ''}" data-save="${escape(product.id)}" title="${isSaved ? 'Remover dos guardados' : 'Guardar produto'}" aria-label="${isSaved ? 'Remover dos guardados' : 'Guardar produto'}: ${escape(product.title)}" aria-pressed="${isSaved}">${icon('bookmark')}</button>
    <a class="product-media" href="${escape(offerUrl(product))}" target="_blank" rel="noopener noreferrer" aria-label="Comprar na loja: ${escape(product.title)}"><img src="${escape(imageUrl(product))}" alt="${escape(product.title)}" loading="lazy" width="200" height="160"></a>
    <div class="product-body"><h2 class="product-title" title="${escape(product.title)}"><a href="${escape(offerUrl(product))}" target="_blank" rel="noopener noreferrer">${escape(product.title)}</a></h2>
    <div class="price-row"><span class="price">${escape(currency(product.price))}</span>${product.originalPrice ? `<del class="original">${escape(currency(product.originalPrice))}</del>` : ''}</div>
    <p class="saving">${product.saving > 0 ? `Poupa ${escape(currency(product.saving))}` : ''}</p>
    ${product.expired ? '<span class="tag-label expired-label">Expirado</span>' : product.tags?.length ? `<span class="tag-label">${escape(product.tags[0])}</span>` : ''}
    <div class="product-footer"><span class="activity">${escape(product.activity)}</span><div class="product-actions"><button class="icon-button" data-details="${escape(product.id)}" title="Ver detalhes" aria-label="Ver detalhes: ${escape(product.title)}">${icon('scan-eye')}</button><a class="icon-button" href="${escape(offerUrl(product))}" target="_blank" rel="noopener noreferrer" title="Comprar na loja" aria-label="Comprar na loja: ${escape(product.title)}">${icon('arrow-up-right')}</a></div></div></div>
  </article>`;
}

function render() {
  const category = state.meta.categories.find(item => item.id === state.category);
  element('heading').textContent = state.favorites ? 'Guardados' : state.category === 'promocoes' ? 'Todas as promo\u00e7\u00f5es' : category?.label || 'Promo\u00e7\u00f5es';
  const products = filteredProducts();
  element('products').className = `products ${state.view === 'list' ? 'list' : ''}`;
  element('products').setAttribute('aria-busy', String(state.loading));
  element('products').innerHTML = state.loading && !state.products.length && !state.favorites
    ? Array.from({ length: 8 }, () => '<div class="skeleton" aria-hidden="true"></div>').join('')
    : products.length ? products.map(renderCard).join('') : `<div class="empty">${icon(state.favorites ? 'bookmark' : 'search-x')}<div>${state.favorites ? 'Nenhum produto guardado com estes filtros.' : 'Nenhum produto encontrado nos resultados carregados.'}</div></div>`;
  element('count').textContent = state.favorites
    ? `${number(products.length)} guardados`
    : `${number(products.length)} vis\u00edveis / ${number(state.products.length)} carregados / ${number(state.total)} dispon\u00edveis`;
  element('updated').textContent = state.favorites ? 'Pre\u00e7os guardados na data de sele\u00e7\u00e3o' : state.fetchedAt ? `Consultado \u00e0s ${new Date(state.fetchedAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}` : '';
  element('status').hidden = !state.error && !state.stale;
  element('status').className = `status ${state.error ? 'error' : ''}`;
  element('status').textContent = state.error || 'Fonte indispon\u00edvel. A mostrar a \u00faltima consulta em cache.';
  element('connection').textContent = state.loading ? 'A atualizar' : state.error || state.stale ? 'Sem atualiza\u00e7\u00e3o' : 'Radar ativo';
  element('connection').className = `connection ${state.error || state.stale ? 'error' : state.loading ? '' : 'live'}`;
  element('load-more').hidden = state.favorites || !state.hasMore;
  element('load-more').disabled = state.loading;
  element('refresh').disabled = state.loading;
  element('favorite-count').textContent = saved.length;
  for (const [id, selected] of [['all-tab', !state.favorites], ['favorites-tab', state.favorites], ['grid-view', state.view === 'grid'], ['list-view', state.view === 'list']]) {
    element(id).setAttribute('aria-pressed', String(selected));
    element(id).classList.toggle(id.endsWith('tab') ? 'active' : 'selected', selected);
  }
  document.querySelectorAll('[data-category]').forEach(button => {
    const selected = button.dataset.category === state.category && !state.favorites;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-current', selected ? 'page' : 'false');
  });
  icons();
}

function updateTags() {
  const previous = element('tag').value;
  const tags = [...new Set((state.favorites ? saved : state.products).flatMap(product => product.tags || []))].sort();
  element('tag').innerHTML = '<option value="">Todas as etiquetas</option>' + tags.map(tag => `<option value="${escape(tag)}">${escape(tag)}</option>`).join('');
  element('tag').value = tags.includes(previous) ? previous : '';
}

async function load(reset = false) {
  controller?.abort();
  const current = new AbortController();
  controller = current;
  state.loading = true;
  state.error = '';
  if (reset) {
    state.products = []; state.page = 0; state.total = 0; state.hasMore = false; state.fetchedAt = null; state.stale = false;
  }
  render();
  try {
    const params = new URLSearchParams({ category: state.category, page: state.page + 1 });
    const response = await fetch(`./api/promotions?${params}`, { signal: current.signal });
    if (!response.ok) throw new Error('Nao foi possivel consultar a fonte.');
    const data = await response.json();
    if (controller !== current) return;
    const byId = new Map(state.products.map(product => [product.id, product]));
    data.products.forEach(product => byId.set(product.id, product));
    state.products = [...byId.values()];
    Object.assign(state, { page: data.page, total: data.total, hasMore: data.hasMore, stale: state.stale || data.stale, fetchedAt: data.fetchedAt });
    updateTags();
  } catch (error) {
    if (error.name !== 'AbortError') state.error = 'N\u00e3o foi poss\u00edvel obter as promo\u00e7\u00f5es. Tente atualizar novamente.';
  } finally {
    if (controller === current) { state.loading = false; render(); }
  }
}

function chooseCategory(category) {
  state.category = category;
  state.favorites = false;
  element('category-select').value = category;
  element('search').value = '';
  element('tag').value = '';
  load(true);
}

function toggleSave(id) {
  const product = [...state.products, ...saved].find(item => item.id === id);
  if (!product) return;
  const exists = saved.some(item => item.id === id);
  if (!exists && saved.length >= 500) return toast('Limite de 500 produtos guardados.');
  const next = exists ? saved.filter(item => item.id !== id) : [...saved, { ...product, savedAt: new Date().toISOString() }];
  try { localStorage.setItem('ninjas.saved.v1', JSON.stringify(next)); } catch { return toast('N\u00e3o foi poss\u00edvel guardar neste navegador.'); }
  saved = next;
  if (state.favorites) updateTags();
  render();
  toast(exists ? 'Produto removido dos guardados.' : 'Produto guardado.');
}

function showDetails(id) {
  const product = [...state.products, ...saved].find(item => item.id === id);
  if (!product) return;
  element('details-content').innerHTML = `<img class="detail-image" src="${escape(imageUrl(product))}" alt="${escape(product.title)}"><h2 class="detail-title" id="detail-title">${escape(product.title)}</h2><div class="price-row"><span class="price">${escape(currency(product.price))}</span>${product.originalPrice ? `<del class="original">${escape(currency(product.originalPrice))}</del>` : ''}</div><p class="detail-description">${escape(product.description)}</p>${product.tags?.length ? `<p class="detail-description">${product.tags.map(escape).join(' / ')}</p>` : ''}<p class="detail-note">${escape(product.activity)}${product.expired ? ' / Expirado' : ''}</p><a class="primary-button" href="${escape(offerUrl(product))}" target="_blank" rel="noopener noreferrer">${icon('external-link')}Comprar na loja</a><p class="detail-note">Confirme o pre\u00e7o final, portes e condi\u00e7\u00f5es na loja. Podem existir cup\u00f5es ou requisitos de compra.</p>`;
  element('details').setAttribute('aria-labelledby', 'detail-title');
  element('details').showModal();
  icons();
}

async function init() {
  try {
    const response = await fetch('./api/meta');
    if (!response.ok) throw new Error('Metadata unavailable');
    state.meta = await response.json();
    element('categories').innerHTML = state.meta.categories.map(category => `<button class="category-button" data-category="${escape(category.id)}">${icon(category.icon)}<span>${escape(category.label)}</span></button>`).join('');
    element('category-select').innerHTML = state.meta.categories.map(category => `<option value="${escape(category.id)}">${escape(category.label)}</option>`).join('');
    element('sort').innerHTML = state.meta.sorts.map(sort => `<option value="${escape(sort.id)}">${escape(sort.label)}</option>`).join('');
    await load(true);
  } catch {
    state.error = 'N\u00e3o foi poss\u00edvel iniciar a app. Tente atualizar novamente.';
    state.loading = false;
    render();
  }
}

document.addEventListener('click', event => {
  const category = event.target.closest('[data-category]');
  const save = event.target.closest('[data-save]');
  const details = event.target.closest('[data-details]');
  if (category) chooseCategory(category.dataset.category);
  if (save) toggleSave(save.dataset.save);
  if (details) showDetails(details.dataset.details);
});
element('products').addEventListener('error', event => {
  if (event.target instanceof HTMLImageElement) {
    event.target.replaceWith(Object.assign(document.createElement('span'), { className: 'missing', textContent: 'Imagem indispon\u00edvel' }));
  }
}, true);
element('category-select').addEventListener('change', event => chooseCategory(event.target.value));
element('refresh').addEventListener('click', () => state.meta.categories.length ? load(true) : init());
element('load-more').addEventListener('click', () => load());
element('all-tab').addEventListener('click', () => { state.favorites = false; updateTags(); render(); });
element('favorites-tab').addEventListener('click', () => { state.favorites = true; updateTags(); render(); });
for (const id of ['search', 'max-price', 'min-discount', 'tag', 'hide-expired', 'sort']) element(id).addEventListener('input', render);
element('filters').addEventListener('submit', event => event.preventDefault());
element('clear').addEventListener('click', () => {
  element('filters').reset(); element('search').value = ''; element('sort').value = 'recent'; render();
});
for (const view of ['grid', 'list']) element(`${view}-view`).addEventListener('click', () => { state.view = view; render(); });
element('close-details').addEventListener('click', () => element('details').close());
element('details').addEventListener('click', event => { if (event.target === element('details')) element('details').close(); });
setInterval(() => { if (!document.hidden && !state.loading && !state.favorites) load(true); }, 300000);
icons();
init();