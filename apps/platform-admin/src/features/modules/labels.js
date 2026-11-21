// Site modülü metinleri.
export const SOURCE_LABELS = {
  template: "Şablondan oluşturuldu",
  preset: "Site şablonundan oluşturuldu",
  clone: "Kopyalandı",
  edit: "Düzenleme",
  rollback: "Önceki sürüme dönüş",
  upgrade: "Şablon yükseltmesi",
};

export const MODULE_IMPACTS = {
  disable: "Bölüm müşteri panelinden ve yayın API'sinden kalkar. Kayıtlar ve yapı korunur; yeniden açınca kaldığı yerden devam eder.",
  archive: "Bölüm arşivlenir: müşteri panelinden ve yayından kalkar, düzenlenemez. Kayıtlar silinmez; anahtar başka bölüme verilemez.",
  enable: "Bölüm müşteri panelinde görünür ve yayınlanmış kayıtları web sitesine açılır.",
  restore: "Bölüm arşivden çıkar ve kapalı durumda bekler; müşteriye görünmesi için ayrıca açılır.",
};
