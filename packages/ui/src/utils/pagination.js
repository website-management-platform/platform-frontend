// İstemci tarafı sayfalama: sayfa numarası geçerli aralığa çekilir (süzgeç sonrası sayfa sayısı azalsa da boş sayfa
// görünmez). Sayfa durumu URL'de tutulan listeler bunu doğrudan kullanır.
export const pageOf = (items, page, pageSize) => {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, Number(page) || 1), pageCount);
  const start = (current - 1) * pageSize;
  return {
    page: current,
    pageCount,
    rows: items.slice(start, start + pageSize),
    from: items.length === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, items.length),
    total: items.length,
  };
};
