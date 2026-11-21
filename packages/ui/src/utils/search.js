// Panelin tek arama kuralı: Türkçe büyük/küçük harf ve aksan farkı yok sayılır ("ŞUBE", "şube" ve "sube" aynı sonucu
// verir). Bütün listeler aramayı buradan yapar; sayfadan sayfaya farklı eşleşme olmaz.
export const normalizeSearch = (text) => String(text ?? "")
  .toLocaleLowerCase("tr-TR")
  .replace(/ı/g, "i")
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .trim();

// Boş arama her şeyle eşleşir; alanlardan biri aramayı içeriyorsa eşleşir (dizi alanlar düzleştirilir).
export const matchesSearch = (query, ...fields) => {
  const needle = normalizeSearch(query);
  return !needle || fields.flat().some((field) => normalizeSearch(field).includes(needle));
};
