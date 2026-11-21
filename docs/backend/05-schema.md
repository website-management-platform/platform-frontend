# 05 — Alan registry'si, şablonlar, presetler ve şema sürümleri (`schema`)

Şartname §5, §6, §11 ve §25.1–25.3. Bu modül içerik yapısının tek kaynağıdır:

- **Alan registry'si:** Yerleşik alan tipleri, her tipin ayarları ve değer biçimi.
- **Hazır alan grupları:** Sık kullanılan alan kombinasyonları.
- **Modül şablonları** (`ModuleTemplate`) ve değişmez sürümleri (`TemplateVersion`).
- **Site presetleri** ve sürümleri.
- **Site modülleri** (`ModuleInstance`) ve yayınlanmış şema sürümleri (`SchemaVersion`): taslak, doğrulama, fark, dry-run, yayın, geri dönüş, şablon yükseltmesi.

İçerik kayıtlarının uçları (müşteri tarafı CRUD) Aşama 3'te `06-content.md`'de tanımlanacak. Bu modül kayıtları yalnız dry-run ve yayın dönüşümünde okur ve yazar.

> **Referans uygulama:** Şema doğrulama, değer doğrulama, koşul ve ifade motoru, fark ve dry-run mantığı `packages/schema` (`@wmp/schema`) içinde saf JavaScript olarak yazılmıştır. Platform paneli, mock ve bu doküman aynı kodu kullanır. Backend aynı kuralları kendi dilinde uygular. Kuralların davranışı tartışmalıysa bu paket ve buradaki tablolar esastır. Şartname §6 "değerlendirme backend ve FE ortak test vektörleriyle aynı" der; ortak test vektörleri paketin `src/` örneklerinden üretilecek (DECISIONS ADR-009, ADR-019).

## Uçlar

| Yöntem | Yol | Amaç | İzin |
|---|---|---|---|
| GET | `/api/v1/platform/field-types` | Alan registry'si | `platform.library.read` |
| GET | `/api/v1/platform/field-groups` | Hazır alan grupları | `platform.library.read` |
| POST | `/api/v1/platform/field-groups` | Grup oluşturma | `platform.library.manage` |
| GET | `/api/v1/platform/field-groups/{groupId}` | Grup ayrıntısı | `platform.library.read` |
| PATCH | `/api/v1/platform/field-groups/{groupId}` | Grup düzenleme | `platform.library.manage` |
| POST | `/api/v1/platform/field-groups/{groupId}/actions/{archive\|restore}` | Arşiv **[ÖNERİ]** | `platform.library.manage` |
| GET | `/api/v1/platform/templates` | Şablon kütüphanesi | `platform.library.read` |
| POST | `/api/v1/platform/templates` | Şablon oluşturma | `platform.library.manage` |
| GET | `/api/v1/platform/templates/{templateId}` | Şablon ve taslağı | `platform.library.read` |
| PATCH | `/api/v1/platform/templates/{templateId}` | Üst bilgi ve taslak (otomatik kayıt) | `platform.library.manage` |
| GET | `/api/v1/platform/templates/{templateId}/versions` | Sürüm geçmişi | `platform.library.read` |
| POST | `/api/v1/platform/templates/{templateId}/versions` | Taslağı yeni sürüm olarak yayınlar | `platform.library.manage` |
| GET | `/api/v1/platform/templates/{templateId}/versions/{version}` | Sürüm ve şeması **[ÖNERİ]** | `platform.library.read` |
| GET | `/api/v1/platform/templates/{templateId}/usages` | Şablonu kullanan modüller ve presetler **[ÖNERİ]** | `platform.library.read` |
| POST | `/api/v1/platform/templates/{templateId}/actions/{clone\|archive\|restore}` | Kopyalama, arşiv | `platform.library.manage` |
| GET | `/api/v1/platform/presets` | Preset kütüphanesi | `platform.library.read` |
| POST | `/api/v1/platform/presets` | Preset oluşturma (1. sürümle) | `platform.library.manage` |
| GET | `/api/v1/platform/presets/{presetId}` | Preset, güncel modülleri ve sürümleri | `platform.library.read` |
| PATCH | `/api/v1/platform/presets/{presetId}` | Üst bilgi | `platform.library.manage` |
| GET | `/api/v1/platform/presets/{presetId}/versions` | Sürümler | `platform.library.read` |
| POST | `/api/v1/platform/presets/{presetId}/versions` | Yeni sürüm | `platform.library.manage` |
| POST | `/api/v1/platform/presets/{presetId}/actions/{clone\|archive\|restore}` | Kopyalama, arşiv **[ÖNERİ]** | `platform.library.manage` |
| GET | `/api/v1/platform/sites/{siteId}/modules` | Site modülleri | `platform.site.read` |
| POST | `/api/v1/platform/sites/{siteId}/modules` | Şablondan modül ekleme | `platform.site.manage` |
| POST | `/api/v1/platform/sites/{siteId}/presets/apply` | Mevcut siteye presetten seçmeli ekleme **[ÖNERİ]** | `platform.site.manage` |
| GET | `/api/v1/platform/sites/{siteId}/modules/{instanceId}` | Modül, yayındaki şema ve taslak | `platform.site.read` |
| PATCH | `/api/v1/platform/sites/{siteId}/modules/{instanceId}` | Ad, ikon, taslak şema (otomatik kayıt) | `platform.site.manage` |
| POST | `/api/v1/platform/sites/{siteId}/modules/{instanceId}/actions/{enable\|disable\|archive\|restore\|clone\|upgrade\|discard-draft}` | Modül yaşam döngüsü (`restore`, `upgrade`, `discard-draft` **[ÖNERİ]**) | `platform.site.manage` |
| POST | `/api/v1/platform/sites/{siteId}/modules/{instanceId}/schema/validate` | Taslak doğrulama | `platform.site.manage` |
| POST | `/api/v1/platform/sites/{siteId}/modules/{instanceId}/schema/diff` | Yayındaki sürümle fark | `platform.site.manage` |
| POST | `/api/v1/platform/sites/{siteId}/modules/{instanceId}/schema/dry-run` | Kayıt dönüşüm denemesi | `platform.site.manage` |
| POST | `/api/v1/platform/sites/{siteId}/modules/{instanceId}/schema/publish` | Taslağı yeni sürüm olarak etkinleştirir | `platform.site.manage` |
| POST | `/api/v1/platform/sites/{siteId}/modules/{instanceId}/schema/rollback` | Eski sürümden dönüş taslağı | `platform.site.manage` |
| GET | `/api/v1/platform/sites/{siteId}/modules/{instanceId}/schema/versions` | Yayınlanmış sürümler **[ÖNERİ]** | `platform.site.read` |
| GET | `/api/v1/platform/sites/{siteId}/modules/{instanceId}/schema/versions/{version}` | Sürüm şeması **[ÖNERİ]** | `platform.site.read` |
| GET | `/api/v1/customer/sites/{siteId}/modules/{moduleKey}/schema` | Müşterinin gördüğü etkin şema | `entry.read` (sitede) |

**[ÖNERİ]** uçları şartname §15/§25.5 tablosunda adıyla geçmez; şartname §6.2 ("rollback history", "template upgrade her site için açıkça seçilir"), §11 ("version history, dependency usage") ve §25.1 ("mevcut siteye seçmeli ekleme") ekranları için gereklidir. Gerekçe: DECISIONS ADR-016, ADR-022.

Bütün uçlar backend'de uygulanmıştır (`platform-api`, `customer-api`). Ortak test vektörleri, alan registry'si ve başlangıç kütüphanesi `@wmp/schema`'dan üretildi ve backend'de sabit kaynak olarak durur (backend ADR-0005). Şartname tablosundaki `config/draft` ve `config/{validate,publish}` (pano düzeni) uçları tanımlanmadı: ana ekran sabittir (ADR-057). `GET /platform/sites/{siteId}/schema-migrations/{id}` ve `.../{cancel,retry}` (büyük migration'ların arka plan işi) Aşama 8'de eklenecek. Müşteri menüsünün gruplanması Aşama 6'dan itibaren modül alanından (`area`) türetilir; ayrı config gerekmez (ADR-031, ADR-041). Bugünkü yayın tek transaction'da senkron çalışır (§10, "Büyük migration").

---

## 1. Kavramlar ve yaşam döngüsü

```text
ModuleTemplate ──(yayın)──▶ TemplateVersion v1, v2 … (değişmez)
                                   │ modül ekleme (kopya, yeni alan kimlikleri)
                                   ▼
Site ── ModuleInstance (anahtar, ad, durum) ── SchemaVersion v1 (PUBLISHED)
                         │                       v2 (PUBLISHED) → v1 SUPERSEDED …
                         └── taslak (draft) ──(validate → diff → dry-run → publish)──▶ yeni SchemaVersion
```

- **Şablon** platform genelindedir. Taslağı (`draft`) serbestçe düzenlenir ve otomatik kaydedilir. Yayın, taslağın değişmez bir kopyasını `TemplateVersion` olarak saklar. İlk sürüm yayınlanmadan şablon siteye eklenemez.
- **Site modülü** bir şablon sürümünün **bağımsız kopyasıdır** (şartname §5.1, AT-21, AT-42):
  - Şablonun sonraki sürümleri modülü değiştirmez.
  - Yükseltme her modül için açıkça seçilir (`actions/upgrade`).
  - Aynı şablon bir sitede birden çok kez eklenebilir. Her modülün anahtarı, kayıtları, yetkileri ve API adresi ayrıdır (AT-03).
- **Şema sürümü** modülün yayınlanmış yapılandırmasıdır ve değişmezdir. Durumları:

| Durum | Anlamı |
|---|---|
| `PUBLISHED` | Etkin sürüm. Modül başına tek bir tane vardır (`module_instances.active_schema_id`). |
| `SUPERSEDED` | Yeni sürüm yayınlanınca önceki sürüm bu duruma geçer. Okunabilir kalır; geri dönüşte kaynak olarak kullanılır. |

  Şartname §6.2'deki `draft → validated` adımları satır olarak tutulmaz. Taslak modül satırında durur; doğrulama yayında yeniden yapılır.
- **Taslak müşteriye yansımaz** (AT-60). Müşteri uçları yalnız `active_schema_id` sürümünü okur. Taslağı olan modülde `GET .../modules/{id}` hem `activeSchema` hem `draft` döner. Taslak yoksa `draft` alanı etkin şemanın kopyasıdır ve `hasDraft: false` olur.
- **Modül durumu:**

| Durum | Müşteri paneli | Yayın API'si | Düzenleme |
|---|---|---|---|
| `ENABLED` | Görünür | Açık (Aşama 6) | Var |
| `DISABLED` | Görünmez | Kapalı | Var |
| `ARCHIVED` | Görünmez | Kapalı | Yok. Anahtar başka modüle verilemez (şartname §25.5: soft-delete key reuse yasak). |

## 2. Şema biçimi

Şema JSONB olarak saklanır ve en fazla 256 KiB olabilir.

```json
{
  "kind": "collection",
  "fields": [ { "id": "uuid", "key": "fullName", "type": "text", "label": { "tr": "Ad soyad" }, "required": true, "…": "…" } ],
  "ui": {
    "form": { "layout": "single", "groups": [ { "id": "uuid", "label": { "tr": "Temel bilgiler" } } ] },
    "list": { "view": "cards", "titleField": "uuid", "subtitleField": "uuid", "imageField": "uuid", "columns": ["uuid"], "sort": [ { "field": "position", "direction": "asc" } ], "pageSize": 20 }
  },
  "behavior": { "workflow": "direct", "allowDuplicate": true, "allowReorder": true, "softDelete": true, "maxEntries": null }
}
```

| Alan | Kural |
|---|---|
| `kind` | `singleton` (tek kayıt), `collection` (liste), `tree` (ağaç) |
| `ui.form.layout` | `single` veya `two-column` |
| `ui.form.groups` | En çok 30 grup. Alan `ui.group` ile bağlanır (yalnız üst düzey alanlarda). Grup `collapsed: true` taşırsa müşteri formunda "İsteğe bağlı ayarlar" altında katlı gelir; hatalı alanı varsa kendiliğinden açılır (Aşama 6, ADR-042). |
| `ui.list.view` | `table`, `cards`, `compact`, `gallery`, `tree` (`tree` yalnız `kind=tree` iken; `gallery` görsel alanı ister) |
| `ui.list.titleField` | `singleton` dışında zorunludur. Metin, sayı, seçim veya tarih tipinde, arşivlenmemiş bir alan olmalı. |
| `ui.list.columns` | En çok 8 kolon; aynı tipte (skaler) alanlar |
| `ui.list.sort` | En çok 3 madde. `field` değeri `position`, `updatedAt` veya `sortable: true` olan bir alanın kimliğidir. |
| `ui.list.pageSize` | 5–100 |
| `behavior.workflow` | İsteğe bağlı ve kullanılmaz; yeni şemalarda yazılmaz. Eski şemalarda varsa yalnız `direct` olabilir (ADR-056, ADR-058). |
| `behavior.maxEntries` | `null` veya 1–100000. `singleton` için `null` veya 1. |

- **Kimlikle başvuru:** Arayüz başvuruları (`titleField`, `columns`, `sort`, `group`, koşullar) alan **kimliğiyle** yapılır. API anahtarı değişince bu başvurular bozulmaz (şartname §6.1: "config referansları field ID'ye normalize edilir").
- **Sınırlar:**
  - Bir şemada iç içe olanlar dahil en çok 200 alan bulunabilir.
  - İç içe derinlik en çok 4'tür.
  - Etiket en çok 120, yardım metni en çok 500 karakterdir.
  - Bir alanda en çok 200 seçenek ve 20 blok türü olabilir.
  - Bir koşulda en çok 10 kural olabilir.

## 3. Alan tanımı

| Özellik | Tür | Kural |
|---|---|---|
| `id` | UUID | Değişmez. Şema içinde benzersizdir. Kopyalanan alan yeni kimlik alır. Taşıma ve sıralama kimliği korur (şartname §25.2). |
| `key` | string | API anahtarı, `^[a-z][a-zA-Z0-9_]{0,63}$`. Aynı düzeydeki kardeşler arasında benzersizdir. Yasak anahtarlar: `id meta tenantId siteId __proto__ constructor prototype position parentId status createdAt updatedAt createdBy updatedBy publishedAt version locale schemaVersion revision`. |
| `type` | string | Registry'deki tip kimliği (§4). Bilinmeyen veya kullanıma kapalı tip yayınlanamaz. |
| `label` | `{ tr, …}` | `tr` zorunludur; diğer diller isteğe bağlıdır. |
| `help`, `placeholder` | `{ tr, …}` | İsteğe bağlı |
| `required` | boolean | Boş sayılan değerler: eksik, `null`, `""`, `[]`. `false` ve `0` geçerli değerdir. |
| `requiredOn` | `publish` \| `save` | `publish` (varsayılan): taslakta boş kalabilir, yayında zorunludur. `save`: her kayıtta zorunludur. |
| `defaultValue` | tipin değeri | Değer doğrulamasından geçmeli. `defaultable=false` tiplerde ve dile bağlı alanda tanımlanamaz. |
| `localized` | boolean | Yalnız `localizable` tiplerde kullanılabilir. Değer `{ "tr": …, "en": … }` biçiminde saklanır. |
| `nullable` | boolean | Açıkça `null` yazılabilir mi |
| `readOnly` | boolean | Müşteri değiştiremez. Zorunlu ve salt okunur alanın varsayılan değeri olmalı. |
| `hidden` | boolean | Formda gösterilmez. Değer korunur. |
| `public` | boolean | `false` ise yayın çıktısında hiçbir derinlikte görünmez. |
| `sensitive` | boolean | Hassas veri. `public: true` ile birlikte kullanılamaz. |
| `unique` | `none` \| `site` \| `locale` | Yalnız `unique` yetenekli tiplerde ve üst düzeyde. `locale` yalnız dile bağlı alanda. |
| `searchable`, `filterable`, `sortable` | boolean | Tip yeteneği olmalı ve alan üst düzeyde olmalı. Filtre yalnız bu alanlarda çalışır (şartname §15: "only indexed/allowed fields"). |
| `settings` | object | Tipin ayarları (§4). Tanımsız ayar anahtarı reddedilir. |
| `ui` | `{ width, widget, group }` | `width`: `full` \| `half`. `widget`: tipin widget listesinden. Widget değişikliği veri taşımaz. |
| `condition` | kural ağacı \| null | Koşullu görünürlük (§6). Yalnız üst düzey alanlarda. |
| `permissions` | nesne \| yok | Kullanılmaz; yeni alanlarda yazılmaz. Eski şemalardan gelirse nesne olması yeterlidir, içeriği yok sayılır (ADR-056, ADR-058). Alan düzeyinde yazma kısıtı yalnız `readOnly` ile yapılır. |
| `archived` | boolean | Arşivli alan formda ve yayında görünmez; değeri ve geçmişi korunur. Yayınlanmış alan silinemez, arşivlenir (`FIELD_REMOVED`). |
| `fields` | alan[] | `object` ve `repeater` tiplerinin alt alanları (en az bir etkin alt alan) |
| `blocks` | `[{ id, key, label, maxItems, fields }]` | `unionBlocks` blok türleri. Blok anahtarı alanla aynı desene uyar ve benzersizdir. `maxItems` 1–200 arasındadır. |
| `templateFieldId` | UUID | Modül alanının kopyalandığı şablon alanının kimliği. Şablon yükseltmesinde eşleme için kullanılır. Panel değiştirmez. |
| `retainWhenHidden`, `publishWhenHidden` | boolean | Şartname §25.2. `publishWhenHidden` özel (`public: false`) alanda kullanılamaz. |

## 4. Alan registry'si (`GET /platform/field-types`)

Yanıt: `{ "families": [ { id, label } ], "items": [ tip ] }`. Tip nesnesi:

```json
{
  "id": "text", "family": "text", "label": "Kısa metin", "description": "…", "valueKind": "string",
  "settings": [ { "key": "maxLength", "kind": "integer", "label": "En çok karakter", "min": 1, "max": 10000, "default": 255 } ],
  "widgets": [ { "id": "input", "label": "Tek satır" } ],
  "localizable": true, "unique": true, "filterable": true, "sortable": true, "searchable": true,
  "operators": ["eq", "ne", "in", "contains", "startsWith", "exists"],
  "container": null, "multiple": false, "contexts": ["content"], "availability": "available", "unavailableReason": null,
  "readOnly": false, "defaultable": true
}
```

Ayar türleri (`settings[].kind`) ve kuralları:

| `kind` | Değer | Kural |
|---|---|---|
| `integer`, `number` | sayı | `min`/`max` dahil. En küçük değer en büyük değeri geçemez (`RANGE_CONFLICT`). |
| `boolean` | boolean | |
| `text`, `date` | string | En çok 200 karakter; `pattern` varsa ona uyar |
| `pattern` | string | Güvenli regex alt kümesi (§6) |
| `multiEnum` | string[] | `options` içinden en az bir değer, tekrarsız |
| `stringList` | string[] | En çok 50 öğe; `itemPattern` varsa ona uyar |
| `options` | `[{ id, label, archived? }]` | En az bir seçenek; `id` `^[a-z0-9][a-z0-9_-]{0,63}$` desenine uyar ve benzersizdir. Kayıtta seçenek `id`'si saklanır. Yayınlanmış seçenek silinmez, arşivlenir. |
| `moduleRef` | string | Aynı sitedeki modül anahtarı. Yoksa `BROKEN_RELATION` döner. |
| `expression` | string | Hesaplanan alan ifadesi (§6) |

`availability: "disabled"` olan tip (`externalReference`) kullanılamaz (şartname §21: isteğe bağlı özellikler açıkça kapalı işaretlenir). `contexts` içinde `content` olmayan tip (`secret`) içerik modülünde kullanılamaz (`TYPE_NOT_ALLOWED`).

### Tip tablosu

Bu tablo registry'den üretilmiştir.

| Tip | Ad | Aile | Değer | Ayarlar | Widget | Dil | Benz. | Süz. | Sır. | Ara | Kullanım |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `text` | Kısa metin | Metin | `string` | `minLength`, `maxLength`, `pattern`, `trim`, `counter` | `input` | ✓ | ✓ | ✓ | ✓ | ✓ | İçerik |
| `textarea` | Uzun metin | Metin | `string` | `minLength`, `maxLength`, `rows`, `counter` | `textarea` | ✓ |  |  |  | ✓ | İçerik |
| `richText` | Zengin metin | Metin | `richText` | `maxLength`, `allowedNodes` | — | ✓ |  |  |  | ✓ | İçerik |
| `email` | E-posta | Metin | `string` | — | `input` |  | ✓ | ✓ | ✓ |  | İçerik |
| `phone` | Telefon | Metin | `string` | `defaultCountry` | — |  | ✓ | ✓ |  |  | İçerik |
| `url` | Web adresi | Metin | `string` | `allowedProtocols` | — | ✓ | ✓ | ✓ |  |  | İçerik |
| `slug` | Adres parçası (slug) | Metin | `string` | `maxLength` | — | ✓ | ✓ | ✓ | ✓ |  | İçerik |
| `integer` | Tam sayı | Sayı | `integer` | `min`, `max`, `step` | — |  | ✓ | ✓ | ✓ |  | İçerik |
| `decimal` | Ondalıklı sayı | Sayı | `decimal` | `min`, `max`, `precision` | — |  |  | ✓ | ✓ |  | İçerik |
| `percentage` | Yüzde | Sayı | `decimal` | `precision` | — |  |  | ✓ | ✓ |  | İçerik |
| `money` | Para tutarı | Sayı | `money` | `currencies`, `precision` | — |  |  | ✓ | ✓ |  | İçerik |
| `boolean` | Evet / hayır | Seçim | `boolean` | `trueLabel`, `falseLabel` | `switch`, `checkbox` |  |  | ✓ | ✓ |  | İçerik |
| `select` | Tek seçim | Seçim | `optionId` | `options` | `dropdown`, `radio`, `chips` |  |  | ✓ | ✓ |  | İçerik |
| `multiselect` | Çoklu seçim | Seçim | `optionIds` | `options`, `minItems`, `maxItems` | `dropdown`, `checkboxes`, `chips` |  |  | ✓ |  |  | İçerik |
| `date` | Tarih | Tarih ve saat | `date` | `minDate`, `maxDate` | — |  |  | ✓ | ✓ |  | İçerik |
| `time` | Saat | Tarih ve saat | `time` | — | — |  |  | ✓ | ✓ |  | İçerik |
| `datetime` | Tarih ve saat | Tarih ve saat | `datetime` | — | — |  |  | ✓ | ✓ |  | İçerik |
| `dateRange` | Tarih aralığı | Tarih ve saat | `dateRange` | `allowOpenEnd` | — |  |  | ✓ |  |  | İçerik |
| `image` | Görsel | Medya ve dosya | `asset` | `allowedFormats`, `maxSizeMb`, `altRequiredOnPublish`, `captionEnabled`, `minWidth`, `minHeight`, `aspectRatio` | `dropzone`, `library` | ✓ |  |  |  |  | İçerik |
| `imageGallery` | Görsel galerisi | Medya ve dosya | `assetList` | `allowedFormats`, `maxSizeMb`, `altRequiredOnPublish`, `captionEnabled`, `minItems`, `maxItems`, `aspectRatio` | `dropzone`, `library` | ✓ |  |  |  |  | İçerik |
| `video` | Video | Medya ve dosya | `asset` | `maxSizeMb`, `posterRequired`, `subtitlesRequired` | `dropzone`, `library` | ✓ |  |  |  |  | İçerik |
| `videoGallery` | Video listesi | Medya ve dosya | `assetList` | `maxSizeMb`, `posterRequired`, `subtitlesRequired`, `minItems`, `maxItems` | `dropzone`, `library` | ✓ |  |  |  |  | İçerik |
| `audio` | Ses | Medya ve dosya | `asset` | `maxSizeMb` | `dropzone`, `library` | ✓ |  |  |  |  | İçerik |
| `document` | Belge | Medya ve dosya | `asset` | `allowedFormats`, `maxSizeMb` | `dropzone`, `library` | ✓ |  |  |  |  | İçerik |
| `file` | Dosya | Medya ve dosya | `asset` | `allowedFormats`, `maxSizeMb` | `dropzone`, `library` | ✓ |  |  |  |  | İçerik |
| `mediaGallery` | Karma medya galerisi | Medya ve dosya | `assetList` | `allowedKinds`, `altRequiredOnPublish`, `minItems`, `maxItems` | `dropzone`, `library` | ✓ |  |  |  |  | İçerik |
| `embed` | Gömülü video | Medya ve dosya | `embed` | `providers` | — | ✓ |  |  |  |  | İçerik |
| `link` | Bağlantı | Bağlantı ve ilişki | `link` | `allowInternal`, `allowExternal`, `allowedProtocols` | — | ✓ |  |  |  |  | İçerik |
| `button` | Düğme (CTA) | Bağlantı ve ilişki | `button` | `variants`, `allowedProtocols` | — | ✓ |  |  |  |  | İçerik |
| `contentSource` | İçerik kaynağı | Bağlantı ve ilişki | `contentSource` | `modes`, `maxItems` (12, en çok 50) | — |  |  |  |  |  | İçerik (Aşama 6) |
| `menuTree` | Menü öğeleri | Bağlantı ve ilişki | `menuTree` | `maxDepth` (1–5, 3), `maxItems` (60, en çok 200) | — |  |  |  |  |  | İçerik (Aşama 6) |
| `relation` | İlişki | Bağlantı ve ilişki | `entryRef` | `targetModule`, `displayField` | `picker`, `cards` |  |  | ✓ |  |  | İçerik |
| `relationList` | Çoklu ilişki | Bağlantı ve ilişki | `entryRefList` | `targetModule`, `displayField`, `minItems`, `maxItems` | `picker`, `cards` |  |  | ✓ |  |  | İçerik |
| `object` | Alan grubu | Yapı | `object` | — | — |  |  |  |  |  | İçerik |
| `repeater` | Tekrarlanan satırlar | Yapı | `rows` | `minItems`, `maxItems` | `stack`, `table` |  |  |  |  |  | İçerik |
| `unionBlocks` | Esnek bloklar | Yapı | `blocks` | `minItems`, `maxItems` | — |  |  |  |  |  | İçerik |
| `keyValue` | Anahtar–değer listesi | Yapı | `keyValueRows` | `uniqueKeys`, `maxItems` | — | ✓ |  |  |  |  | İçerik |
| `specificationTable` | Özellik tablosu | Yapı | `specRows` | `grouped`, `maxItems` | — | ✓ |  |  |  |  | İçerik |
| `address` | Adres | Konum ve saat | `address` | `requireCountry` | — |  |  |  |  |  | İçerik |
| `geo` | Koordinat | Konum ve saat | `geo` | — | — |  |  |  |  |  | İçerik |
| `openingHours` | Çalışma saatleri | Konum ve saat | `openingHours` | `allowExceptions` | — |  |  |  |  |  | İçerik |
| `color` | Renk | Görünüm | `color` | `palette` | — |  |  | ✓ |  |  | İçerik |
| `icon` | İkon | Görünüm | `icon` | — | — |  |  | ✓ |  |  | İçerik |
| `typographyToken` | Yazı stili | Görünüm | `token` | `tokens` | — |  |  |  |  |  | İçerik |
| `json` | JSON | Teknik | `json` | `maxBytes` | — |  |  |  |  |  | İçerik |
| `computed` | Hesaplanan alan | Teknik | `computed` | `expression` | — |  |  |  | ✓ |  | İçerik |
| `externalReference` | Dış kaynak referansı | Teknik | `externalRef` | — | — |  |  |  |  |  | Kapalı: Bu kurulumda etkin dış kaynak adaptörü yok. |
| `secret` | Gizli değer | Teknik | `secret` | — | — |  |  |  |  |  | Yalnız entegrasyon |

### Değer biçimleri (saklama)

Değerler alan **kimliğiyle** saklanır: `values: { "<alan uuid>": değer }`. Grup ve satırların içinde de aynı kural geçerlidir. API'nin anahtarlı biçime çevirmesi Aşama 3'te tanımlanacak. Dile bağlı alanın değeri `{ "<locale>": değer }` biçimindedir ve yalnız sitenin dilleri kabul edilir (`UNKNOWN_LOCALE`).

| `valueKind` | Biçim | Örnek |
|---|---|---|
| `string` | string. `email` küçük harfle saklanır; `phone` E.164 biçimindedir (`+905321234567`); `url` yalnız izinli protokolleri kabul eder; `slug` `^[a-z0-9]+(-[a-z0-9]+)*$`; `text` tek satırdır. | `"Ayşe Demir"` |
| `richText` | `{ type: "doc", content: [düğüm] }`. Düğümler: `paragraph text heading bulletList orderedList listItem link table tableRow tableCell image video blockquote codeBlock hardBreak`. Aile izni `allowedNodes` ile verilir, en çok 12 düzey olabilir. Bağlantılarda yalnız `https`, `http`, `mailto` ve `tel` kabul edilir. Ham HTML yoktur. | |
| `integer` | Güvenli tam sayı | `42` |
| `decimal` | Ondalık **metin**: `^-?\d{1,18}(\.\d{1,10})?$`, basamak sayısı en çok `precision`. `percentage` 0–100 arasıdır. | `"12.50"` |
| `money` | `{ amount: ondalık metin, currency }` | `{ "amount": "1250.00", "currency": "TRY" }` |
| `boolean` | boolean | `false` |
| `optionId` / `optionIds` | Seçenek `id`'si / tekrarsız liste | `"finans"` |
| `date` · `time` · `datetime` | `YYYY-MM-DD` · `HH:MM[:SS]` · ISO 8601, saat dilimli | `"2026-11-16T09:30:00Z"` |
| `dateRange` | `{ start, end }`. `end` ancak `allowOpenEnd` ise `null` olabilir; `start ≤ end`. | |
| `asset` | `{ assetId, alt?, caption?, focalPoint?, crop?, kind? }` | Asset doğrulaması (varlık, tür, boyut) Aşama 4'te eklenecek. |
| `assetList` | `[{ id: satır uuid, assetId, … }]`; sayısı `minItems`–`maxItems` arasında | |
| `embed` | `{ provider: youtube\|vimeo, externalId: ^[A-Za-z0-9_-]{4,64}$ }`. Ham iframe yoktur. | |
| `link` / `button` | `{ kind: internal\|external, label?, ref?\|path?\|url?, target?: _self\|_blank, rel?: [] }`. `button` ayrıca `label` ve `variant` ister. | |
| `entryRef` / `entryRefList` | Kayıt UUID'si / tekrarsız UUID listesi. Hedefin varlığı ve modülü Aşama 3'te denetlenir. | |
| `contentSource` | `{ mode: collection\|singleton\|entries, module, limit?, sort?: position\|newest, entryIds? }`. `limit`/`sort` yalnız `collection`, `entryIds` (tekrarsız UUID, en az 1) yalnız `entries` kipinde. Hedefin varlığı ve yayın durumu [10-site-structure.md](10-site-structure.md) §2.5. | |
| `menuTree` | `[{ id: uuid, kind: page\|entry\|external\|anchor\|group, label: { dil: metin }, pageId?, entry?: { module, id }, url?, anchor?, newTab?, hidden?, cta?, children?: [] }]`. Öğe kimliği menü içinde tektir; dış adres `https`, `http`, `mailto`, `tel`. Hedef kuralları [10-site-structure.md](10-site-structure.md) §4. | |
| `object` | `{ "<alt alan uuid>": değer }` | |
| `rows` | `[{ id: satır uuid, values: { … } }]`. Satır kimliği kararlıdır (sıralama ve çoğaltmada korunur). | |
| `blocks` | `[{ id, type: blok anahtarı, values: { … } }]`. Blok başına `maxItems` sınırı uygulanır. | |
| `keyValueRows` / `specRows` | `[{ id, key, value }]` / `[{ id, group?, key, value }]`; anahtar en çok 120, değer en çok 2000 karakter | |
| `address` | `{ line1, line2?, district?, city, postalCode?, country: ISO-2 }` | |
| `geo` | `{ lat: -90..90, lng: -180..180 }` | |
| `openingHours` | `{ weekly: [{ day: 1..7, closed, open?, close? }], exceptions: [{ date, closed, open?, close?, note? }] }` | |
| `color` · `icon` · `token` | `#RRGGBB` veya izinli renk · `^[a-z0-9-]{1,64}$` · izinli stil | |
| `json` | Herhangi bir JSON, en çok `maxBytes` | |
| `computed` | **Saklanmaz.** Yazılırsa `READ_ONLY` hatası döner; okunurken hesaplanır. | |
| `secret` | Şifrelenmiş saklanır, hiçbir çıktıda dönmez | |

Bilinmeyen alan anahtarı `UNKNOWN_FIELD` ile reddedilir. Arşivli alanın değeri korunur ama doğrulanmaz.

## 5. Yayın öncesi şema doğrulaması

Taslak hatalı olabilir; yayın olamaz (şartname §6.1). Aynı doğrulama `schema/validate`, `schema/publish`, şablon sürümü yayını ve alan grubu kaydında çalışır. Hatalar `errors[]` dizisinde döner: `{ path, code, message, fieldId? }`. `path` şema içi yoldur (`fields.2.settings.maxLength`, `ui.list.titleField`). Panel hataya tıklanınca ilgili alanı seçer.

| Kod | Ne zaman |
|---|---|
| `INVALID_ID` · `DUPLICATE_ID` | Alan kimliği UUID değil veya şemada tekrar ediyor |
| `INVALID_KEY` · `RESERVED_KEY` · `DUPLICATE_KEY` | Anahtar desene uymuyor, yasak bir anahtar veya kardeşler arasında tekrar ediyor |
| `LABEL_REQUIRED` · `LABEL_INVALID` | Türkçe etiket yok veya etiket çok uzun |
| `UNKNOWN_TYPE` · `TYPE_NOT_ALLOWED` | Registry'de olmayan tip; kapalı veya bu bağlamda izinsiz tip |
| `UNKNOWN_PROPERTY` · `UNKNOWN_SETTING` | Tanımsız alan özelliği veya tip ayarı |
| `OUT_OF_RANGE` · `RANGE_CONFLICT` · `INVALID` | Ayar aralık dışında; en küçük değer en büyük değeri geçiyor; biçim hatası |
| `UNSAFE_PATTERN` | Regex güvenli alt kümede değil |
| `OPTIONS_REQUIRED` · `CHILDREN_REQUIRED` | Seçenek yok; grup, satır veya blok alanında etkin alt alan yok |
| `NOT_SUPPORTED` | Tipin desteklemediği özellik (dil, benzersizlik, süzme, sıralama, arama, varsayılan değer) ya da iç içe alanda üst düzey özelliği |
| `SETTING_CONFLICT` | Çelişen ayarlar. Örnekler: hassas ve herkese açık; hesaplanan ve zorunlu; salt okunur ve zorunlu olup varsayılanı yok; her zaman gizli ve zorunlu olup varsayılanı yok; dil kapsamlı benzersiz ama dile bağlı değil; site içi ve dış bağlantının ikisi de kapalı. |
| `INVALID_DEFAULT` | Varsayılan değer alanın kendi doğrulamasından geçmiyor |
| `INVALID_CONDITION` · `INVALID_REFERENCE` · `CONDITION_CYCLE` | Koşul biçimi bozuk; koşul olmayan, kendisine veya arşivli bir alana bağlı; koşullar döngü oluşturuyor |
| `PERMISSION_CONFLICT` | Herkese açık alanın koşulu ya da hesaplaması hassas alana bağlı (şartname §25.2: koşul sonucu yetkisiz bağlamda değer sızdırmamalı) |
| `INVALID_EXPRESSION` · `COMPUTED_CYCLE` | Hesaplanan alan ifadesi geçersiz veya hesaplanan alanlar döngüsel |
| `BROKEN_RELATION` | İlişki hedefi modül sitede yok (yalnız site modülünde denetlenir; şablonda hedef anahtar serbesttir) |
| `FIELDS_REQUIRED` | Hiç etkin alan yok |
| `TOO_MANY_FIELDS` · `TOO_DEEP` · `TOO_MANY` · `TOO_LARGE` | Sınır aşımı |
| `FIELD_REMOVED` | Yayınlanmış alan taslakta yok; silmek yerine arşivlenmeli. Şablonda son sürüme, modülde etkin sürüme göre denetlenir. |
| `REQUIRED` | `ui.list.titleField` yok, galeri görünümünde görsel alanı yok, zorunlu ayar boş |

## 6. Koşullar, ifadeler ve güvenli regex

**Koşullu görünürlük** (şartname §6, §25.2):

```json
{ "all": [ { "field": "<uuid>", "op": "eq", "value": "evet" }, { "not": { "field": "<uuid>", "op": "exists" } } ] }
```

- Gruplar `all`, `any` ve `not`, en çok 3 düzey iç içe olabilir.
- Kural `{ field, op, value }` biçimindedir. İşleçler: `eq ne in exists gt gte lt lte`. `in` liste ister; `exists` için `value: false` "boş" anlamına gelir.
- Çok değerli alanlarda `eq` "içerir", `ne` "içermez" anlamına gelir. Sayısal karşılaştırmada ondalık metinler sayıya çevrilir.
- Koşul yalnız aynı düzeydeki (üst düzey) alanlara bağlanır. Dile bağlı alanda varsayılan dilin değeri kullanılır.
- **Backend koşulu her yazmada değerlendirir:**
  - Görünmeyen alanın zorunluluğu yayını engellemez.
  - Değeri korunur.
  - Yayın çıktısından çıkarılır; `publishWhenHidden: true` ise çıkarılmaz.

**Hesaplanan alan ifadesi** (eval yoktur):

- Dilbilgisi:

  ```text
  ifade := terim (("+"|"-") terim)*
  terim := çarpan (("*"|"/") çarpan)*
  çarpan := sayı | "metin" | alanAnahtarı | fonksiyon(argümanlar) | (ifade) | -çarpan
  ```

- Fonksiyonlar ve argüman sayıları: `concat` (1–10), `coalesce` (1–10), `upper` (1), `lower` (1), `trim` (1), `round` (1–2).
- Sınırlar: ifade en çok 500 karakter, en çok 100 düğüm olabilir.
- `+` yalnız sayılarda çalışır; metin birleştirmek için `concat` kullanılır.
- Sıfıra bölme ve sayıya çevrilemeyen işlenen `null` döndürür.
- Başvurulan anahtarlar var olmalı ve arşivlenmemiş olmalı. Hesaplanan alanlar arasında döngü olamaz.

**Güvenli regex** (`pattern` ayarı, şartname §6 ReDoS koruması). Reddedilen yapılar:

- geri başvuru (`\1`, `\k<…>`)
- lookahead ve lookbehind
- 4 basamaklı tekrar sayısı
- iç içe tekrar (`(a+)+`)
- alternatif içeren tekrar eden grup (`(a|ab)+`)
- 200 karakterden uzun desen

Desen `u` bayrağıyla derlenir. Backend ayrıca zaman sınırlı veya doğrusal zamanlı bir motor (RE2) kullanmalıdır.

---

## 7. Alan grupları

Sunum:

```json
{ "id": "uuid", "key": "seo", "label": { "tr": "SEO bilgileri" }, "description": "…", "fields": [ alan ], "status": "ACTIVE", "createdAt": "…", "updatedAt": "…", "version": "\"1\"" }
```

- **`POST`**:
  - Gövde: `{ key, label, description?, fields }`.
  - `Idempotency-Key` zorunludur.
  - `key` `^[a-z][a-z0-9-]{1,62}$` desenine uyar ve gruplar arasında benzersizdir.
  - `fields` en az bir alan içerir ve §5'teki alan doğrulamasından geçer (`SCHEMA_INVALID`).
- **`PATCH`**:
  - Gövde: `{ label?, description?, fields? }`, `If-Match` zorunludur.
  - Arşivli grup düzenlenemez (`409 INVALID_STATE_TRANSITION`).
- **Kopyalama kuralı** (şartname §25.2, AT-43):
  - Grup bir şablona veya modüle eklenince alanlar **yeni kimliklerle** kopyalanır.
  - Grubun sonradan değişmesi eklenmiş kopyaları değiştirmez.
  - Kopyalama panelde yapılır. Sonuç normal taslak kaydıyla sunucuya gelir.
- **Arşiv:** `actions/archive` ve `actions/restore` ile, `If-Match` zorunlu. Arşivli grup palette görünmez.
- **Liste:**
  - Parametreler `status` ve `q`.
  - Sayfalama yoktur; grup sayısı yönetim ölçeğindedir.
  - Sıralama Türkçe etikete göredir.

## 8. Şablonlar

**Özet sunum** (liste):

```json
{
  "id": "uuid", "key": "team", "label": { "tr": "Ekip" }, "description": "…", "category": "Kişiler", "icon": "users",
  "kind": "collection", "status": "ACTIVE", "latestVersion": 2, "fieldCount": 7,
  "hasUnpublishedChanges": false, "usageCount": 4, "updatedAt": "…"
}
```

Ayrıntı sunumu bu alanlara ek olarak şunları taşır: `draft` (şema), `draftUpdatedAt`, `draftUpdatedBy`, `createdAt`, `version` (ETag).

| Uç | Kural |
|---|---|
| `GET /templates` | Parametreler: `q` (ad, anahtar, açıklama), `category`, `status` (`ACTIVE`/`ARCHIVED`), `page`, `size` (varsayılan 50). Yanıt sayfalı listedir ve ayrıca `categories` taşır (kategori listesi: `Site Tanıtım Kişiler İçerik Medya İletişim Etkinlik Kariyer Özel`). |
| `POST /templates` | Gövde: `{ key, label, description?, category, icon, kind }`, `Idempotency-Key` zorunlu. Taslak boş şemayla başlar, `latestVersion: 0` olur. |
| `PATCH /templates/{id}` | Gövde: `{ label?, description?, category?, icon?, draft? }`, `If-Match` zorunlu. Taslak yalnız yapısal olarak denetlenir: `{ kind, fields[], ui{}, behavior{} }`, 256 KiB. İçerik hataları taslakta kalabilir. Arşivli şablon düzenlenemez. Panel taslağı ~1,2 sn beklemeyle otomatik kaydeder; 412 alınca sessizce üzerine yazmaz, kullanıcıya güncel taslağı yükletir (şartname §25.2). |
| `POST /templates/{id}/versions` | Gövde: `{ changelog? }` (≤500), `If-Match` zorunlu. Taslak §5 doğrulamasından geçer (diller `tr`, `en`; taban son sürüm). Taslak son sürümle aynıysa `409 NO_CHANGES` döner. Yanıt `201` + şablon ayrıntısıdır. **Kullanan modüller değişmez.** |
| `GET /templates/{id}/versions` | Sürümler yeniden eskiye: `{ id, templateId, version, checksum, changelog, fieldCount, kind, createdAt, createdBy }` |
| `GET /templates/{id}/versions/{n}` | Aynı sunum ve `schema` |
| `GET /templates/{id}/usages` | Yanıt: `{ items: [{ instanceId, key, label, status, templateVersion, site: { id, displayName, status, tenantName } }], presets: [{ id, label, status }] }` |
| `actions/clone` | Gövde: `{ key, label }`, `Idempotency-Key` zorunlu. Son sürümün şeması (sürüm yoksa taslak) **yeni alan kimlikleriyle** yeni şablonun taslağı olur; `latestVersion: 0`. |
| `actions/archive` · `restore` | `If-Match` zorunlu. Arşivli şablon yeni modüle ve presete eklenemez; onu kullanan modüller etkilenmez. |

`checksum` şemanın kararlı JSON'unun (anahtarlar sıralı) FNV-1a 64 bit özetidir. Backend aynı fonksiyonu kullanmak zorunda değildir; değer yalnız aynı içeriği tanımak için kullanılır.

## 9. Presetler

Sunum:

```json
{
  "id": "uuid", "key": "kurumsal", "label": { "tr": "Kurumsal / holding / KOBİ" }, "description": "…", "family": "Kurumsal",
  "status": "ACTIVE", "latestVersion": 1, "moduleCount": 10, "usageCount": 1,
  "modules": [ { "templateId": "uuid", "templateKey": "team", "templateVersion": 1, "key": "ekip", "label": { "tr": "Ekibimiz" }, "templateLabel": "Ekip", "templateStatus": "ACTIVE", "kind": "collection" } ],
  "versions": [ { "id": "uuid", "version": 1, "modules": [ … ], "changelog": "…", "createdAt": "…", "createdBy": { … } } ],
  "createdAt": "…", "updatedAt": "…", "version": "\"1\""
}
```

`versions` yalnız ayrıntıda döner. `usageCount` bu presetle oluşturulmuş site sayısıdır.

- **Modül listesi** (`modules`):
  - En çok 40 madde. Her madde `{ templateId, templateVersion, key, label }` biçimindedir.
  - Şablon var ve etkin olmalı; sürümü var olmalı.
  - `key` `^[a-z][a-z0-9-]{1,62}$` desenine uyar ve preset içinde benzersizdir.
  - Aynı şablon birden çok kez kullanılabilir.
- **`POST /presets`**:
  - Gövde: `{ key, label, description?, family, modules }`, `Idempotency-Key` zorunlu.
  - 1. sürüm birlikte oluşur.
- **`POST /presets/{id}/versions`**:
  - Gövde: `{ modules, changelog? }`, `If-Match` zorunlu.
  - Liste aynıysa `409 NO_CHANGES` döner.
  - Presetle kurulmuş siteler değişmez.
- **`PATCH /presets/{id}`**: yalnız `label`, `description`, `family` değişir.
- **`actions/clone`**: güncel sürümün modülleriyle 1. sürümü olan yeni preset oluşturur.
- **`archive`** ve **`restore`**: arşivli preset site oluşturmada önerilmez ve uygulanamaz.

### Preset seçimi

Site oluşturma (`02-tenancy.md`, `preset` alanı) ve mevcut siteye ekleme aynı biçimi kullanır:

```json
{ "presetId": "uuid", "version": 1, "modules": [ { "key": "ekip", "include": true, "targetKey": "danismanlar", "label": { "tr": "Danışmanlar" } }, { "key": "sponsorlar", "include": false } ] }
```

| Madde alanı | Kural |
|---|---|
| `key` | Presetin o sürümündeki modül anahtarı (zorunlu) |
| `include` | `false` ise atlanır. Varsayılan `true`. |
| `targetKey` | Sitede oluşacak anahtar. Varsayılan `key`. Sitede (arşivdekiler dahil) veya aynı istekte kullanılmışsa `KEY_CONFLICT` döner. |
| `label` | Varsayılan presetteki ad |

**Mevcut modül hiçbir koşulda değiştirilmez veya silinmez** (şartname §25.1, AT-41). Çakışmada kullanıcı yeniden adlandırır veya atlar. Seçilen her modül §10'daki "modül ekleme" kuralıyla oluşur.

`POST /platform/sites/{siteId}/presets/apply`:

- Gövde yukarıdaki biçimdedir; `Idempotency-Key` zorunludur.
- Arşivli sitede `409 INVALID_STATE_TRANSITION` döner.
- En az bir modül seçilmelidir. Seçim yoksa `422` (`modules REQUIRED`) döner.
- Site sınırı sitede en çok 60 etkin modüldür (`409 QUOTA_EXCEEDED`).
- Site daha önce presetsiz kurulduysa `site.preset` bu presetle doldurulur.
- Yanıt `201` ve `{ items: [modül özeti] }`.
- Audit olayı: `site.presetApplied`.

---

## 10. Site modülleri

**Özet sunum:**

```json
{
  "id": "uuid", "siteId": "uuid", "key": "ekip", "label": { "tr": "Ekibimiz" }, "icon": "users", "kind": "collection",
  "status": "ENABLED", "order": 5120,
  "template": { "id": "uuid", "key": "team", "label": { "tr": "Ekip" }, "version": 1, "latestVersion": 2, "status": "ACTIVE" },
  "activeVersion": 3, "hasDraft": false, "entryCount": 4, "updatedAt": "…"
}
```

Ayrıntı sunumu bu alanlara ek olarak şunları taşır:

| Alan | İçerik |
|---|---|
| `activeSchema` | Yayındaki şema |
| `draft` | Taslak; taslak yoksa yayındaki şemanın kopyası |
| `draftSource` | `null` veya `{ type: "rollback", toVersion }` ya da `{ type: "upgrade", fromTemplateVersion, toTemplateVersion }` |
| `draftUpdatedAt`, `draftUpdatedBy` | Taslağın son kaydı |
| `pendingChanges` | Taslak ile yayındaki şema arasında fark var mı |
| `createdAt`, `version` | Oluşturma zamanı ve ETag |

Liste `order` sonra `createdAt` ile sıralanır. Yeni modül en sona eklenir (`order` boşluklu artar: +1024).

**Modül ekleme** — `POST /sites/{siteId}/modules`:

- Gövde: `{ templateId, templateVersion, key, label, enabled? }`. `Idempotency-Key` zorunludur.
- Kurallar:
  - Şablon etkin ve sürümü var olmalı.
  - `key` `^[a-z][a-z0-9-]{1,62}$` desenine uyar ve sitede benzersizdir (arşivdekiler dahil, `NOT_UNIQUE`).
  - `label.tr` zorunlu.
  - `enabled` varsayılan `true`.
- Tek transaction'da yapılanlar:
  1. Şablon sürümünün şeması kopyalanır. Her alan **yeni UUID** alır; `templateFieldId` şablondaki kimliği tutar. Arayüz başvuruları yeni kimliklere çevrilir.
  2. Modül satırı oluşur.
  3. Şema `v1` `PUBLISHED` olarak yazılır, `source: { type: "template" }`. Şablon sürümleri yayında doğrulanmış olduğu için yeniden doğrulanmaz.
  4. Audit `module.created` yazılır.
- Hatalar:
  - Sitede en çok 60 etkin modül olabilir (`409 QUOTA_EXCEEDED`).
  - Arşivli site `409 INVALID_STATE_TRANSITION` döner.

**Taslak** — `PATCH .../modules/{instanceId}`:

- Gövde: `{ label?, icon?, draft? }`, `If-Match` zorunlu.
- `draft` yapısal olarak denetlenir (şablon taslağıyla aynı).
- Ad değişikliği audit'e yazılır (`module.renamed`). Taslak kaydı audit'e yazılmaz; yayın yazılır.
- Arşivli modül ve arşivli site düzenlenemez.

**İşlemler** — `POST .../actions/{action}`:

| İşlem | Geçerli durum → hedef | Gövde | Not |
|---|---|---|---|
| `enable` | `DISABLED` → `ENABLED` | `{ reason? }` | Müşteriye görünür |
| `disable` | `ENABLED` → `DISABLED` | `{ reason? }` | |
| `archive` | `ENABLED`/`DISABLED` → `ARCHIVED` | `{ reason }` (5–500, zorunlu) | Başka bir modülün ilişki hedefiyse `409 DEPENDENCY_CONFLICT` döner. |
| `restore` | `ARCHIVED` → `DISABLED` | `{ reason? }` | Aynı anahtarla etkin modül varsa `409 KEY_CONFLICT`; kapasite denetlenir. |
| `clone` | — | `{ key, label }` | `Idempotency-Key` zorunlu. Yayındaki şema yeni alan kimlikleriyle `v1` olur, kayıtlar kopyalanmaz, kopya `DISABLED` başlar. |
| `upgrade` | — | `{ templateVersion }` | Hedef sürüm, modülün kullandığından yeni olmalı. Şablon sürümü taslağa alınır (aşağıda); yayın normal akışla yapılır. |
| `discard-draft` | — | `{}` | Taslağı siler; yayındaki şema aynen kalır. |

`clone` dışındaki işlemlerde `If-Match` zorunludur. Durum değişiklikleri `module.{action}` olarak audit'e yazılır: `metadata: { from, to, reason }`.

**Şablon yükseltmesi** (`upgrade`). Taslak şöyle hazırlanır:

1. Şablondaki her alan, modüldeki eşiyle (`templateFieldId`) eşleşirse modül alanının **kimliğini korur**. Tanım şablondan gelir.
2. Şablonda yeni olan alan yeni kimlik alır.
3. Modüle özel alanlar (`templateFieldId` yok) aynen korunur.
4. Şablondan kalkan alanlar silinmez, arşivlenir.
5. Arayüz ve davranış şablondan gelir.

Sonuç fark ve dry-run'dan geçer. Yayınlanınca modülün `templateVersion` değeri güncellenir.

### Şema yaşam döngüsü uçları

Hepsi taslak (`draft`) ile yayındaki şemayı (`activeSchema`) karşılaştırır. Diller sitenin dilleri, ilişki hedefleri sitenin arşivlenmemiş modül anahtarlarıdır.

**`schema/validate`** — yan etkisizdir. Yanıt: `{ "valid": false, "errors": [ { path, code, message, fieldId } ] }`.

**`schema/diff`** — yanıt:

```json
{
  "baseVersion": 2,
  "changes": [
    { "fieldId": "uuid", "key": "title", "label": "Unvan", "type": "text", "change": "modified", "impact": "migration",
      "details": [ { "property": "localized", "from": true, "to": false, "impact": "migration" } ] }
  ],
  "sections": [ { "section": "ui", "impact": "none" } ],
  "impact": "migration",
  "compatibility": "requiresDryRun",
  "hasChanges": true
}
```

- `change`: `added`, `removed`, `archived`, `restored`, `modified`.
- `key`: iç içe alanlarda nokta ile ayrılmış yol (`socialLinks.url`).
- `sections`: `kind`, `ui`, `behavior`, `order`.

**Değişiklik sınıfları** (şartname §6.2, §25.3):

| Değişiklik | Etki (`impact`) |
|---|---|
| Etiket, yardım, yer tutucu, görünüm, widget, sıra, grup, koşul, gizli, düzenleme yetkisi, arama/süzme/sıralama, varsayılan değer | `none` |
| İsteğe bağlı alan ekleme; varsayılan değeri olan zorunlu alan ekleme; arşivleme ve arşivden çıkarma; zorunluluğu kaldırma; benzersizliği kaldırma; yayından çıkarma (`public: false`) ya da yayına açma; hassas işareti | `compatible` |
| Varsayılan değeri olmayan zorunlu alan ekleme; zorunlu yapma; `requiredOn` değişimi; dil stratejisi değişimi; dönüştürülebilir tip değişimi; benzersizlik ekleme; `nullable: false`; doğrulama ayarları (uzunluk, aralık, seçenekler, biçim…); blok türleri; içerik türü (`kind`); kayıt sınırı | `migration` (kayıtlar denetlenir) |
| API anahtarı değişimi; dönüştürülemeyen tip değişimi; ilişki hedefi değişimi; alanın başka gruba taşınması; yayınlanmış alanın silinmesi | `breaking` (açık onay gerekir; silme ayrıca `FIELD_REMOVED` ile reddedilir) |

`compatibility` değeri en ağır etkiye göre belirlenir: `compatible`, `requiresDryRun` (migration) veya `breaking`.

**Tip dönüşümleri.** Boş değer her tipe dönüşür; dolu değer için:

| Kaynak → hedef | Dönüşüm |
|---|---|
| `text ↔ textarea` | Doğrudan. `textarea → text` satır sonu varsa `MULTILINE_VALUE` |
| `text/textarea → richText` | Paragraflara sarılır |
| `integer → decimal/percentage` · `decimal ↔ percentage` | Doğrudan |
| `decimal/percentage → integer` | Kesirli değer varsa **`FRACTION_LOSS`** (AT-46) |
| `select → multiselect` · `relation → relationList` · `image → imageGallery/mediaGallery` · `video → videoGallery` | Tek değer listeye konur (satır kimliği üretilir) |
| `multiselect → select` · `relationList → relation` · `imageGallery → image` · `videoGallery → video` | 0–1 değer doğrudan. Daha fazlası **`MULTIPLE_VALUES`**; plan `pick: "first"` ile ilk değer korunur (AT-46) |
| `date → datetime` | `T00:00:00Z` eklenir |
| `email/url/phone/slug → text` | Doğrudan |
| Diğerleri | `TYPE_CHANGE_UNSUPPORTED` |

**Dil stratejisi:**

- **Ortak → dile bağlı:** Değer plandaki `targetLocales`'a kopyalanır. Plan yoksa yalnız varsayılan dile kopyalanır.
- **Dile bağlı → ortak:**
  - Doluluğu olan dillerin değerleri aynıysa doğrudan dönüşür.
  - Farklıysa **`LOCALE_CONFLICT`** döner (AT-46). Plan `sourceLocale` ile kaynak dil seçilir.
  - Seçilmeyen dillerin değerleri yeni sürümde kullanılmaz (uyarı `LOCALE_VALUES_DROPPED`) ama geçmişte kalır.

**`schema/dry-run`** — gövde: `{ plan? }`. Hiçbir şey yazmaz.

Plan biçimi:

```json
{ "fields": { "<alan uuid>": { "sourceLocale": "tr", "targetLocales": ["tr", "en"], "pick": "first" } } }
```

Yanıt:

```json
{
  "baseSchemaId": "uuid", "baseVersion": 2,
  "configChecksum": "…", "baseChecksum": "…", "dataWatermark": "…", "migrationPlanHash": "…",
  "counts": { "entries": 4, "changed": 3, "failed": 0, "backfilled": 0 },
  "errors": [ { "entryId": "uuid", "entryLabel": "Deniz Arslan", "path": "title", "fieldId": "uuid", "code": "LOCALE_CONFLICT", "message": "…" } ],
  "warnings": [ { "fieldId": "uuid", "code": "LOCALE_VALUES_DROPPED", "message": "…", "count": 2 } ],
  "schemaErrors": [],
  "diff": { "…": "schema/diff yanıtı" },
  "compatibilityStatus": "compatible"
}
```

Her kayıt için yapılanlar:

1. Değerleri yeni şemaya dönüştürülür.
2. Varsayılan değeri olan yeni zorunlu alanlar doldurulur (`backfilled`).
3. Yeni şemaya göre doğrulanır. Yayındaki kayıt `publish`, taslaktaki kayıt `save` kipinde doğrulanır; koşulla gizli alanların zorunluluğu atlanır.

Bütün kayıtlar üzerinde ayrıca şunlar denetlenir:

- Benzersizlik (`DUPLICATE_VALUE`).
- Tek kayda geçişte kayıt sayısı (`TOO_MANY_ENTRIES`).
- Kayıt sınırı.
- Silinmiş yayın alanı (`FIELD_REMOVED`).

`errors` en çok 100 madde içerir.

`compatibilityStatus` şu değerlerden birini alır:

| Değer | Anlamı |
|---|---|
| `blocked` | Kayıt hatası veya şema hatası var |
| `requiresConfirmation` | Kırıcı değişiklik var; kayıtlar dönüşüyor |
| `compatible` | Yayına hazır |

Özet alanları:

- `dataWatermark`: modül kayıtlarının (kimlik, `row_version`) özeti.
- `migrationPlanHash`: taban şema, hedef şema ve planın özeti.

**`schema/publish`** — `If-Match` zorunludur.

```json
{ "plan": { … }, "migrationPlanHash": "…", "dataWatermark": "…", "confirmBreaking": true, "changelog": "Unvan ortak yapıldı" }
```

Kontroller, sırasıyla:

1. Taslak yoksa veya fark yoksa `409 NO_CHANGES`.
2. Şema hatası varsa `422 SCHEMA_INVALID` (`errors` şema yollarıyla).
3. Dry-run sunucuda **aynı plan ve güncel veriyle yeniden çalıştırılır**. `dataWatermark` veya `migrationPlanHash` istekteki değerle uyuşmazsa `409 DRY_RUN_STALE` döner (şartname §25.3: "Apply aynı checksum/watermark ile çalışır; veri değişmişse tekrar dry-run"). Panel bu durumda dry-run'ı kendiliğinden yineler.
4. Dönüştürülemeyen kayıt varsa `409 MIGRATION_BLOCKED`. `errors` alanında ilk 20 madde döner: `path` = `entries.{entryId}.{alan}`. **Canlı veri değişmez.**
5. Kırıcı değişiklik varsa ve `confirmBreaking !== true` ise `409 CONFIRMATION_REQUIRED`.

Başarılı yayın **tek transaction**'dır:

1. Yeni `SchemaVersion` yazılır: `version = önceki + 1`, `status: PUBLISHED`. Kaydedilenler: `source` (`edit`, `rollback` veya `upgrade`), `summary` (`{ impact, changes, entries, changedEntries, backfilled }`), `priorVersionId`, `publishedBy`.
2. Önceki sürüm `SUPERSEDED` olur.
3. Dönüştürülen kayıtlar yeni şema sürümüne bağlanır: her kayda `migration` revizyonu yazılır, bekleyen planlar iptal edilir, yayın kopyaları dönüştürülür ([08-publishing.md](08-publishing.md) §8, AT-48).
4. Modülün `active_schema_id` değeri güncellenir, taslak temizlenir. Yükseltmeyse `templateVersion` güncellenir.
5. Audit `module.schemaPublished` yazılır: `metadata: { version, impact, changes, entries, changedEntries, backfilled, confirmBreaking }`.

Yanıt: `200` ve modül ayrıntısı.

> **Mock ile gerçek backend farkı:** Mock dönüştürülen değerleri kayıt satırına doğrudan yazar. Gerçek backend şartname §6.2 ve §25.3'teki gibi çalışır:
> - Her kayıt için yeni **değişmez revizyon** ve gerekirse staged snapshot üretir. Eski revizyonlar eski şemayla okunabilir kalır.
> - Yayın; şema işaretçisini, revizyon/snapshot işaretçilerini, projeksiyonları (benzersizlik, rota, ilişki, arama) ve outbox'ı aynı transaction'da günceller.
> - Büyük modüllerde dönüşüm arka plan işinde stage edilir; son geçiş atomiktir. Bu süreçte uçlar `schema-migrations/{id}` ile izlenir (Aşama 8).
> - Yayın sırasında aynı modüle kayıt yazımı ya engellenir ya da `row_version` ile yeniden denetlenir.

**`schema/rollback`** — gövde `{ toVersion }`, `If-Match` zorunlu. Hedef, yayındaki sürümden eski olmalıdır.

- Hedef sürümün şeması taslağa alınır.
- Hedefte olmayan güncel alanlar **arşivli** olarak eklenir; değerleri korunur (şartname §6.2: "Rollback yeni değişiklikleri sessizce silmez").
- `draftSource: { type: "rollback", toVersion }` yazılır.
- Yayın normal akışla (fark, dry-run, onay) yapılır.
- Audit: `module.rollbackDrafted`.

**`schema/versions`** — sürümler yeniden eskiye: `{ id, version, status, checksum, changelog, source, summary, publishedAt, publishedBy }`. Tek sürüm sorgusu ayrıca `schema` döner.

---

### Site yapısı modülleri (Aşama 6)

- **Sistem alanları:** Şablonu `site-settings`, `pages`, `menus` veya `redirects` olan modülde delivery'nin okuduğu alanlar silinemez, arşivlenemez ve tipi değiştirilemez. Dry-run `schemaErrors[]` içinde `code: SYSTEM_FIELD` (+ `fieldId`) döner ve `compatibilityStatus: blocked` olur. Liste [10-site-structure.md](10-site-structure.md) §1.1.
- **Manifest denetimi:** Dry-run raporu `manifest: { status: compatible | warning | blocked, manifestVersion, supported? }` taşır. Etkin manifest modülü bildiriyor ve yeni sürüm (`baseVersion + 1`) `schemaVersions` listesinde değilse kırıcı değişiklik `blocked`, diğerleri `warning` olur. `blocked` yayını `409 MANIFEST_INCOMPATIBLE` ile reddeder.
- Yayın başarılı olunca `schema.published` webhook olayı yazılır ([12-integrations.md](12-integrations.md) §4).

## 11. Müşterinin gördüğü şema

`GET /api/v1/customer/sites/{siteId}/modules/{moduleKey}/schema` — müşteri realm'i, sitede `entry.read` gerekir.

```json
{
  "module": { "key": "ekip", "label": { "tr": "Ekibimiz" }, "icon": "users", "role": null },
  "design": { "sections": [ { "key": "hero", "variants": ["split", "background"] } ] },
  "schemaVersion": 3,
  "kind": "collection",
  "fields": [ { "id": "uuid", "key": "fullName", "type": "text", "label": { "tr": "Ad soyad" }, "required": true, "editable": true, "…": "…" } ],
  "ui": { … },
  "behavior": { … }
}
```

- **Görünen modüller:** Yalnız `ENABLED` ve yayınlanmış şeması olan modüller. Yoksa, kapalıysa, arşivdeyse veya başka bir siteye aitse `404` döner. Taslak hiçbir durumda dönmez (AT-60).
- **Çıkarılan alanlar:** Arşivli alanlar ve `secret` alanlar. İç alanlar (`templateFieldId`, `permissions`, `archived`) gönderilmez.
- **`editable` hesaplaması:** `editable = !readOnly && tip computed değil && hesapta entry.update var`.
- **`module.role`:** Yapı modülünde şablon anahtarı (`site-settings`, `pages`, `menus`, `redirects`), diğerlerinde `null` ([10-site-structure.md](10-site-structure.md) §1).
- **`design`:** Sitenin etkin frontend manifest'indeki bölüm türleri ve varyantları; manifest yoksa `null`. Bölüm düzenleyici yalnız bunları sunar ([10-site-structure.md](10-site-structure.md) §3).
- **`ETag`:** `"<instanceId>:<schemaVersion>"`. Şema değişince değişir (şartname §25.3: "ETag'ler schema/config değişiminde invalidate edilir").

## 12. Audit olayları

| Olay | Ne zaman |
|---|---|
| `fieldGroup.created` · `fieldGroup.updated` · `fieldGroup.archive` · `fieldGroup.restore` | Alan grubu işlemleri |
| `template.created` · `template.versionPublished` · `template.cloned` · `template.archive` · `template.restore` | Şablon işlemleri (`metadata.version`, `metadata.sourceTemplateId`) |
| `preset.created` · `preset.updated` · `preset.versionPublished` · `preset.cloned` · `preset.archive` · `preset.restore` | Preset işlemleri |
| `site.presetApplied` | Mevcut siteye presetten modül eklendi (`metadata: { presetKey, version, keys }`) |
| `module.created` · `module.renamed` · `module.cloned` | Modül ekleme, ad, kopya |
| `module.enable` · `module.disable` · `module.archive` · `module.restore` | Durum (`metadata: { from, to, reason }`) |
| `module.upgradeDrafted` · `module.rollbackDrafted` | Yükseltme ve dönüş taslağı hazırlandı |
| `module.schemaPublished` | Şema sürümü yayınlandı (özet ve onay bilgisi) |

Hepsi `realm: platform` ile yazılır. Site kapsamlı olaylar `tenantId` ve `siteId` taşır. Taslak otomatik kayıtları audit'e yazılmaz; yayın ve durum değişiklikleri yazılır.

## 13. Hata kodları

| HTTP | Kod | Uç |
|---|---|---|
| 409 | `NO_CHANGES` | Şablon/preset sürümü, şema yayını |
| 409 | `DRY_RUN_STALE` · `MIGRATION_BLOCKED` · `CONFIRMATION_REQUIRED` | Şema yayını |
| 409 | `KEY_CONFLICT` · `DEPENDENCY_CONFLICT` | Modül `restore` · `archive` |
| 409 | `QUOTA_EXCEEDED` | Modül ekleme, kopya, preset uygulama, `restore` (sitede en çok 60 etkin modül) |
| 409 | `INVALID_STATE_TRANSITION` | Arşivli şablon, preset, alan grubu, modül veya site üzerinde değişiklik; geçersiz durum geçişi |
| 409 | `MANIFEST_INCOMPATIBLE` | Şema yayını: etkin frontend manifest'i yeni sürümü desteklemiyor ve değişiklik kırıcı ([12-integrations.md](12-integrations.md) §5, AT-53) |
| 422 | `SCHEMA_INVALID` | Şema/alan doğrulaması (§5 kodları `errors[].code`'da) |
| 422 | `VALIDATION_FAILED` | Üst bilgi alanları; preset modül listesi; `KEY_CONFLICT` alan kodu; dönüşüm planı biçimi |

## 14. Veri modeli

Tablolar [09-data-model.md](09-data-model.md) "Aşama 2" bölümündedir: `field_groups`, `module_templates`, `template_versions`, `presets`, `preset_versions`, `module_instances`, `schema_versions`; `sites.preset_*` kolonları; `entries.schema_version_id`.

## Değişiklik geçmişi

| Tarih | Değişiklik |
|---|---|
| 16 Kas 2026 | İlk sürüm (Aşama 2): alan registry'si (46 tip), alan grupları, şablon ve preset sürümleri, site modülleri, şema doğrulama, fark, dry-run, yayın, geri dönüş, şablon yükseltmesi, preset uygulama, müşterinin gördüğü şema. |
| 17 Kas 2026 | Aşama 6: `contentSource` ve `menuTree` tipleri (48 tip); grup `collapsed`; yapı modüllerinde sistem alanları (`SYSTEM_FIELD`); dry-run `manifest` denetimi ve `MANIFEST_INCOMPATIBLE`; müşteri şemasında `module.role` ve `design`. |
| 18 Kas 2026 | Sade yetki modeli (ADR-056): `behavior.workflow` yalnız `direct`; `permissions.editRoles` uygulanmaz. |
| 18 Kas 2026 | Uçlar backend'e taşındı; ortak test vektörleri (422 örnek) ve registry dışa aktarım betiği eklendi. |
| 18 Kas 2026 | ADR-058: yeni alanlarda `permissions`, yeni şemalarda `behavior.workflow` yazılmaz; koşulda rol kısıtı çatışma denetimi (`PERMISSION_CONFLICT` rol durumu) kalktı. |
