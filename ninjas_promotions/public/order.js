export const SORTS = [
  { id: 'recent', label: 'Mais recentes' },
  { id: 'price-asc', label: 'Menor pre\u00e7o' },
  { id: 'price-desc', label: 'Maior pre\u00e7o' },
  { id: 'discount', label: 'Maior desconto' },
  { id: 'saving', label: 'Maior poupan\u00e7a' },
  { id: 'name', label: 'Nome: A a Z' },
];

export function sortProducts(products, sort = 'recent') {
  const comparators = {
    'price-asc': (first, second) => first.price - second.price,
    'price-desc': (first, second) => second.price - first.price,
    discount: (first, second) => second.discount - first.discount,
    saving: (first, second) => second.saving - first.saving,
    name: (first, second) => first.title.localeCompare(second.title, 'pt'),
  };
  return comparators[sort] ? [...products].sort(comparators[sort]) : [...products];
}