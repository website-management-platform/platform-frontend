# 10 — Site yapısı: sayfalar, bölümler, menüler, yönlendirmeler, site ayarları (`structure`)

Şartname §9, §16, §25.4, §25.8. Sitenin iskeleti (ayarlar, sayfalar, menüler, yönlendirmeler) ayrı bir API ile değil, **sistem modülleri** olarak kurulur (ADR-041). Bu modüller sıradan içerik modülleridir. [06-content.md](06-content.md) uçları, [08-publishing.md](08-publishing.md) revizyon, inceleme, plan, paket ve önizleme kuralları aynen geçerlidir. Bu belge yalnız onlara özgü kuralları tanımlar.

Sonuç: yeni bir sitenin yapısı panel kodu yazılmadan kurulur. Müşteri panelindeki form, liste, ağaç ve bölüm düzenleyici şemadan üretilir.

**Durum:** Kurallar backend'de uygulanmıştır (`customer-api` `StructureRules`, `core` `PageRoutes`, tablo `route_history`). Tasarım dosyası denetimi (`SECTION_NOT_SUPPORTED`) ve yönlendirme alan adları [12-integrations.md](12-integrations.md) ile bağlıdır.

---

## 1. Sistem modülleri

Bir modülün yapı modülü olup olmadığı, **şablon anahtarından** anlaşılır. Modülün kendi anahtarı (`key`) serbesttir.

| Şablon anahtarı | Tür | Görev | Delivery karşılığı |
|---|---|---|---|
| `site-settings` | singleton | Site adı, logo, iletişim, SEO varsayılanları, robots, analiz, çerez izni, bakım modu | `info`, bundle `settings` |
| `pages` | tree | Sayfalar: adres, bölümler, SEO | `pages/resolve`, `pages/bundle`, `sitemap` |
| `menus` | collection | Üst, alt, mobil ve ikincil menü | `menus/{location}`, bundle `menus` |
| `redirects` | collection | Elle yazılan yönlendirmeler | `pages/resolve`, `redirects` |

| Kural | Ayrıntı |
|---|---|
| Tekillik | Delivery her türden sitenin **ilk açık** (`ENABLED`) modülünü okur. Preset her türden en çok bir tane kurar. |
| Delivery'de içerik ucu | Yapı modülleri `GET /delivery/.../content/{moduleKey}` ile okunamaz (`404`). Yalnız kendi uçlarıyla okunur. |
| Müşteri bootstrap'ı | Modül listesinde `area: "site"` ve `role: "<şablon anahtarı>"`. İçerik modülleri `area: "content"`, `role: null`. Panel menüsü bu alana göre "Site yapısı" ve "İçerik" gruplarına ayrılır. |
| Müşteri şema ucu | `GET /customer/sites/{siteId}/modules/{moduleKey}/schema` yanıtında `module.role` ve `design` (§3) |
| Webhook | Yapı modülündeki yayın ve kaldırma olayı `content.*` değil, `site.config.published` üretir ([12-integrations.md](12-integrations.md) §4) |

### 1.1 Sistem alanları

Delivery'nin okuduğu alanlar **sistem alanıdır**. Şema yayınında bu alanlar silinemez, arşivlenemez ve tipleri değiştirilemez. İhlal edilirse dry-run ve yayın `schemaErrors[]` içinde `code: SYSTEM_FIELD` döner ve yayın bloklanır. Bunların dışındaki alanlar serbestçe eklenir veya çıkarılır.

| Şablon | Alan → tip |
|---|---|
| `site-settings` | `siteName` → `text` |
| `pages` | `title` → `text`, `slug` → `slug`, `isHome` → `boolean`, `sections` → `unionBlocks`, `seoTitle` → `text`, `seoDescription` → `textarea`, `noindex` → `boolean` |
| `menus` | `name` → `text`, `location` → `select`, `items` → `menuTree` |
| `redirects` | `source` → `text`, `destination` → `link`, `statusCode` → `select`, `enabled` → `boolean` |

Delivery'nin isteğe bağlı olarak okuduğu diğer alanlar varsa kullanılır, yoksa atlanır:

- `site-settings`: `publicBaseUrl`, `defaultSeoTitle`, `defaultSeoDescription`, `shareImage`, `robots`, `maintenance`
- `pages`: `shareImage`

## 2. Sayfalar (`pages`)

Sayfa modülü **ağaçtır** (`kind: tree`). Üst sayfa `parentId` ile verilir; taşıma [06-content.md](06-content.md) `move` ucudur.

### 2.1 Adres

| Kural | Ayrıntı |
|---|---|
| Hesap | Her dil için üst sayfaların `slug` değerleri birleştirilir: `/kurumsal/hakkimizda`. Kök sayfa `/{slug}`. |
| Ana sayfa | `isHome: true` olan sayfanın adresi her dilde `/` olur; `slug` gizlenir ve okunmaz. |
| Dil | `slug` dile bağlıdır. Bir dilde boşsa varsayılan dildeki değer kullanılır. |
| Çözülemeyen | Üstü görünmeyen veya adres parçası olmayan sayfanın adresi yoktur; delivery'de görünmez. |
| Görünüm | Panel adresleri **taslak** değerlerden, delivery **yayın kopyalarından** hesaplar. Üst sayfa yayında değilse alt sayfanın canlı adresi yoktur. |

Müşteri kayıt sunumu ([06-content.md](06-content.md)) sayfa modülünde ek olarak `routes` döner:

```json
{ "routes": { "draft": { "tr": "/kurumsal/hakkimizda", "en": "/about/us" }, "live": { "tr": "/kurumsal/hakkimizda" } } }
```

`live` yayında olmayan sayfada `null` olur. Panel bunu kayıt düzenleyicide "Adres: …" satırı olarak gösterir. Backend bu hesabı istek başına bir kez yapar ve önbelleğe alır.

### 2.2 Doğrulama

Hata biçimi `422 VALIDATION_FAILED` + `errors[]` ([00-conventions.md](00-conventions.md) §5).

| Kod | Yol | Ne zaman | Kip |
|---|---|---|---|
| `HOME_EXISTS` | `isHome` | Başka bir sayfa (taslak dahil) zaten ana sayfa | kayıt + yayın |
| `INVALID` | `isHome` | Ana sayfa bir üst sayfanın altında (oluşturma ve taşıma dahil) | kayıt + yayın |
| `REQUIRED` | `slug.<varsayılan dil>` | Ana sayfa olmayan sayfada varsayılan dilde adres parçası yok | yayın |
| `ROUTE_CONFLICT` | `slug.<dil>` (ana sayfada `isHome`) | Aynı dilde aynı adresi kullanan başka sayfa var. Yayında olmayan sayfanın taslak adresi de adresi ayırır. `HOME_EXISTS` varsa bu denetim yapılmaz. | kayıt + yayın |

Adres çakışması oluşturma, PATCH ve taşımada **yeni üst sayfa** ile hesaplanır.

### 2.3 Adres geçmişi (otomatik yönlendirme)

Yayında bir sayfanın adresi değişince eski adres kaybolmaz (şartname §9):

| Olay | Sonuç |
|---|---|
| Yayında adres değişti (slug, üst sayfa veya taşıma; **alt sayfalar dahil**) | Eski adres `route_history` tablosuna yazılır. Delivery eski adrese `301` ile yeni adresi döner. |
| Sayfa yayından kalktı | Eski adres `410 GONE` döner. |
| Eski adres yeniden bir canlı sayfaya verildi | Geçmiş kaydı silinir; canlı sayfa her zaman önceliklidir. |

Yazım yayın transaction'ındadır. Önceki yayın değerleriyle sonraki yayın değerleri karşılaştırılır. Aynı adres için tek kayıt tutulur; son yazan kazanır.

### 2.4 Bölümler

`sections` alanı `unionBlocks` tipindedir ([05-schema.md](05-schema.md)). Her blok türü bir **bölüm türüdür**. Her bölümün üç ortak alanı vardır:

| Alan | Tip | Anlamı |
|---|---|---|
| `variant` | `select` (`ui.widget: chips`) | Tasarım varyantı. Seçenek **id**'si manifest'teki varyant adıdır. |
| `hidden` | `boolean` | Bölüm saklanır ama sitede gösterilmez. Gizli bölüm manifest denetimine girmez ve delivery'de dönmez. |
| `anchor` | `text` | Menüde `#anchor` bağlantısı için bölüm kimliği |

Hazır bölüm kataloğu (şablon kütüphanesi; platform yöneticisi şablon tasarımcısında değiştirebilir):

| Tür | Varyantlar | Başlıca alanlar |
|---|---|---|
| `hero` | `simple`, `split`, `full`, `background` | `eyebrow`, `title`, `subtitle`, `image`, `button` |
| `richText` | `narrow`, `wide` | `heading`, `body` |
| `contentList` | `grid`, `list`, `carousel`, `tiles`, `quotes`, `people` | `heading`, `intro`, `source` (contentSource), `image`, `button` |
| `features` | `boxes`, `steps` | `heading`, `items[]` (`icon`, `title`, `text`), `image` |
| `mediaText` | `image-left`, `image-right` | `heading`, `body`, `image`, `statValue`, `statLabel`, `button` |
| `statement` | `dark`, `light` | `heading`, `text`, `signature` |
| `cta` | `banner`, `card` | `title`, `text`, `button` |
| `gallery` | `grid`, `masonry` | `heading`, `images` |
| `form` | `card`, `inline` | `eyebrow`, `heading`, `intro`, `formKey` (Aşama 7, [13-forms.md](13-forms.md) §6) |

Bölüm sayısı en çok 30'dur (`settings.maxItems`).

### 2.5 İçerik kaynağı (`contentSource`)

Bölüm, gösterilecek kayıtları kopyalamaz; **hangi modülden** geleceğini söyler. Kayıtlar kendi modülünde düzenlenir.

```json
{ "mode": "collection", "module": "avukatlar", "limit": 6, "sort": "position" }
{ "mode": "singleton", "module": "hakkimizda" }
{ "mode": "entries", "module": "hizmetler", "entryIds": ["uuid", "uuid"] }
```

| Kural | Kod | Kip |
|---|---|---|
| Modül sitede olmalı, arşivli ve yapı modülü olmamalı | `INVALID_REFERENCE` | kayıt + yayın |
| `singleton` kipi yalnız tek kayıtlı modülde; tek kayıtlı modülde yalnız `singleton` kipi | `INVALID_REFERENCE` | kayıt + yayın |
| Modül açık (`ENABLED`) olmalı | `INVALID_REFERENCE` | yayın |
| `entries` kipinde her kayıt var olmalı | `INVALID_REFERENCE` | kayıt + yayın |
| `entries` kipinde her kayıt yayında olmalı | `RELATION_NOT_PUBLISHED` | yayın |

Değer biçimi ve sınırları ([05-schema.md](05-schema.md) §4): `limit` ve `sort` yalnız `collection` kipinde; `limit` 1–`settings.maxItems` (tip varsayılanı 12, en çok 50; bölüm kataloğunda 50). Değer verilmezse delivery 12 kayıt döner. `sort`: `position` (modüldeki sıra) veya `newest` (yayın zamanı). `entryIds` yalnız `entries` kipinde; en az 1, tekrarsız, en çok `settings.maxItems`. Tanınmayan anahtar reddedilir.

Delivery kaynağı **okuma anında** çözer: modülün o anki yayındaki kayıtları döner, yayında olmayan atlanır ([11-delivery.md](11-delivery.md) §5).

## 3. Frontend manifest'iyle bölüm uyumu

Her sitenin frontend'i, çizebildiği bölüm türlerini ve varyantlarını bir **manifest** ile bildirir ([12-integrations.md](12-integrations.md) §5). Etkin manifest varsa:

| Yer | Davranış |
|---|---|
| Müşteri şema ucu | `design: { sections: [{ key, variants[] }] }` döner; manifest yoksa `null` |
| Bölüm düzenleyici | Yalnız manifest'teki türler eklenebilir. Varyant seçicide yalnız manifest'teki varyantlar görünür. Yeni bölüm ilk desteklenen varyantla başlar. Manifest'te olmayan mevcut bölüm uyarıyla gösterilir. |
| Yayın doğrulaması | Gizli olmayan her bölüm için tür manifest'te olmalı, varyant manifest'in listesinde olmalı. Aksi hâlde `422`, yol `sections.<index>`, kod `SECTION_NOT_SUPPORTED` (AT-22). Kayıt kipinde denetlenmez; taslak saklanabilir. |

Manifest yoksa bölümler serbesttir.

## 4. Menüler (`menus`)

| Alan | Kural |
|---|---|
| `location` | `header` · `footer` · `mobile` · `secondary`. Her yerde en çok bir menü (taslak dahil). Aksi hâlde `LOCATION_TAKEN`. |
| `items` | `menuTree` tipi: en çok 3 düzey, en çok 60 öğe |

Menü öğesi:

```json
{
  "id": "uuid",
  "kind": "page",
  "label": { "tr": "Hakkımızda", "en": "About" },
  "pageId": "uuid",
  "newTab": false,
  "hidden": false,
  "cta": false,
  "children": []
}
```

| `kind` | Hedef alanı | Kural |
|---|---|---|
| `page` | `pageId` | Sayfa modülünde var olmalı (`INVALID_REFERENCE`); yayında gizli olmayan öğenin sayfası yayında olmalı (`RELATION_NOT_PUBLISHED`) |
| `entry` | `entry: { module, id }` | Aynı kurallar; adresi manifest kalıbından gelir ([11-delivery.md](11-delivery.md) §6) |
| `external` | `url` | `https`, `http`, `mailto` veya `tel` (değer doğrulaması `@wmp/schema`) |
| `anchor` | `anchor` | Sayfadaki bölümün `anchor` değeri |
| `group` | — | Yalnız alt öğe taşır, bağlantısı yoktur |

- Etiket alanlarındaki diller sitede olmalı (`UNKNOWN_LOCALE`).
- Yayında her öğenin varsayılan dilde etiketi olmalı (`REQUIRED`).
- Öğe kimliği (`id`, UUID) menü içinde tektir; tanınmayan öğe anahtarı reddedilir. Döngü yapısal olarak oluşamaz, çünkü öğeler iç içe dizidir; derinlik ve sayı sınırı şema tipindedir.

Delivery dönüşümü [11-delivery.md](11-delivery.md) §6'dadır.

## 5. Yönlendirmeler (`redirects`)

| Alan | Kural |
|---|---|
| `source` | `/` ile başlar; boşluk, `?`, `#`, `//` içermez; `*` yalnız sonda (önek eşleşmesi: `/eski-blog/*`). En çok 300 karakter. Site içinde tektir (`NOT_UNIQUE`). Biçim hatası `INVALID_VALUE`. |
| `destination` | `link` tipi: iç sayfa (`ref` sayfa kimliği), iç yol (`path`) veya dış adres (`url`, yalnız https) |
| `statusCode` | `301` · `308` · `302` · `307` (varsayılan `301`) |
| `enabled` | Kapalı kural delivery'de kullanılmaz |

| Kod | Ne zaman |
|---|---|
| `REDIRECT_TARGET_NOT_ALLOWED` | Dış hedefin alan adı ne sitenin `redirectHosts` listesinde ne doğrulanmış alan adlarında (açık yönlendirme koruması). Yalnız tam ad eşleşir. |
| `REDIRECT_LOOP` | İç hedef kaynağın kendisi, ya da yayından sonra iç hedefler zinciri kaynağa geri dönüyor |

Döngü denetimi yalnız yayında ve iç yol hedeflerinde yapılır.

## 6. Site ayarları (`site-settings`)

Tek kayıtlıdır. Delivery `info` ve bundle bu kaydın public projeksiyonunu döner. Gruplar panelde katlı başlar: "Arama motorları ve analiz", "Çerez izni", "Bakım modu" (`ui.form.groups[].collapsed`, [05-schema.md](05-schema.md) §2).

| Alan | Delivery etkisi |
|---|---|
| `publicBaseUrl` | `sitemap.meta.baseUrl` ve `robots.sitemap` |
| `defaultSeoTitle`, `defaultSeoDescription`, `shareImage` | Sayfanın kendi değeri yoksa `seo` nesnesinde kullanılır |
| `robots` (`index` · `noindex`) | `noindex` ise bütün sayfalar `seo.noindex: true`, site haritası boş, `robots.index: false` |
| `analyticsProvider`, `analyticsId` | Yalnız kimlik saklanır. Betik frontend'dedir; panelden kod girilemez. Kimlik deseni `^[A-Za-z0-9._-]{1,64}$`. |
| `maintenance`, `maintenanceMessage` | `info.data.maintenance: true` döner; frontend bakım sayfası gösterir |

## 7. Panel davranışı

- Menü: "Site yapısı" grubu (ayarlar, sayfalar, menüler, yönlendirmeler) ve "İçerik" grubu ayrıdır.
- Sayfa düzenleyici: adres satırı, katlanabilir bölüm listesi (başlıkta bölüm türü ve asıl başlık, "sitede gizli" etiketi), bölüm ekleme penceresi (yalnız manifest'teki türler), varyant kutucukları.
- İçerik kaynağı alanında "Bu bölümdeki kayıtlar X bölümünden gelir → Kayıtları düzenle" bağlantısı.
- Menü düzenleyici: yukarı/aşağı, içeri/dışarı, tür, etiket, hedef, yeni sekme, gizli, öne çıkan.
- Hatalı alanı olan bölüm ve katlı grup kendiliğinden açılır.

## 8. Veri modeli

[09-data-model.md](09-data-model.md) "Aşama 6": `route_history`; yapı modüllerinin kayıtları `entries` ve revizyon tablolarındadır, ayrı tablo yoktur.

## Değişiklik geçmişi

| Tarih | Değişiklik |
|---|---|
| 17 Kas 2026 | İlk sürüm (Aşama 6): sistem modülleri ve sistem alanları, sayfa adresleri ve adres geçmişi, bölüm kataloğu, içerik kaynağı, manifest uyumu, menüler, yönlendirmeler, site ayarları. |
| 18 Kas 2026 | Aşama 7: `form` bölümü; yayında form açık ve yayınlanmış olmalı (`INVALID_REFERENCE`). |
