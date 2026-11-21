# 13 — Public formlar ve başvurular (`forms`)

Şartname §17, §25.5, §25.6. Formlar içerik modüllerinden **ayrı bir güvenlik sınıfıdır**:

- Form tanımını platform yöneticisi yapar ve sürümler.
- Başvuruları müşteri yönetir. Başvurular kişisel veri içerir ve ayrı izinle görülür.
- Web sitesi tanımı SDK ile okur, kendi arayüzüyle çizer ve gönderir.

| Yöntem | Yol (`/api/v1` altında) | Amaç | İzin |
|---|---|---|---|
| GET · POST | `/platform/sites/{siteId}/forms` | Form listesi / oluştur | `platform.site.read` / `platform.site.manage` |
| GET · PATCH | `/platform/sites/{siteId}/forms/{formId}` | Ayrıntı / başlık, durum, ayarlar, taslak | aynı |
| POST | `/platform/sites/{siteId}/forms/{formId}/actions/publish` | Taslaktan yeni sürüm | `platform.site.manage` |
| GET | `/customer/sites/{siteId}/forms` | Formlar ve okunmamış sayıları | `formSubmission.read` |
| GET | `/customer/sites/{siteId}/forms/{key}/submissions?status=&q=&page=&size=` | Gelen kutusu | `formSubmission.read` |
| GET · PATCH | `…/forms/{key}/submissions/{submissionId}` | Ayrıntı / durum ve iç not | `formSubmission.read` |
| DELETE | `…/forms/{key}/submissions/{submissionId}` | Kalıcı silme | `formSubmission.delete` |
| POST | `…/forms/{key}/submissions/bulk` | Toplu durum / silme | `formSubmission.read` / `formSubmission.delete` |
| GET | `…/submissions/{submissionId}/attachments/{attachmentId}` | Ek indirme | `formSubmission.read` |
| GET | `/delivery/sites/{publicKey}/forms/{key}?locale=` | Yayındaki tanım | Oturumsuz |
| POST | `/delivery/sites/{publicKey}/forms/{key}/submissions` | Başvuru gönder | Oturumsuz, köken denetimli |
| POST | `/delivery/sites/{publicKey}/forms/{key}/uploads` | Ek yükleme niyeti | Oturumsuz, köken denetimli |
| PUT | `…/uploads/{uploadId}/content` | Ek baytları | `X-Upload-Nonce` |
| POST | `…/uploads/{uploadId}/finalize` | Tür tespiti ve tarama | `{ nonce }` |

Başvuruların CSV dışa aktarması [14-operations.md](14-operations.md) §4'tedir (`formSubmission.export`).

**Durum:** Bütün uçlar backend'de uygulanmıştır: form tanımları `platform-api` (`com.wmp.platform.forms`), web sitesinin uçları ve gelen kutusu `customer-api` (`com.wmp.customer.forms`), ortak kurallar `core` (`com.wmp.core.forms`); backend ADR-0010. Hassas alanlar şifreli saklanır, ek yüklemesi backend üzerinden yapılır (bkz. §4 notu). `form.submitted` bildirimi ve CSV dışa aktarma [14-operations.md](14-operations.md) ile gelir. Panel ekranları:

- Platform: Site → Formlar
- Müşteri: Başvurular
- Örnek site: Kalliope ve Kurumsal iletişim sayfası

---

## 1. Form tanımı

```json
{
  "fields": [
    { "key": "name", "type": "text", "label": { "tr": "Ad soyad" }, "required": true, "maxLength": 120 },
    { "key": "email", "type": "email", "label": { "tr": "E-posta" }, "required": true, "sensitive": true },
    { "key": "area", "type": "select", "label": { "tr": "Konu" }, "options": [ { "value": "is", "label": { "tr": "İş hukuku" } } ] },
    { "key": "document", "type": "file", "label": { "tr": "Belge" }, "allowedFormats": ["pdf", "docx"], "maxBytes": 5242880, "maxFiles": 1 }
  ],
  "consent": { "text": { "tr": "Aydınlatma metnini okudum." }, "privacyUrl": "https://ornek.com/kvkk" },
  "marketingConsent": { "text": { "tr": "Bülten almak istiyorum." } }
}
```

| Kural | Ayrıntı |
|---|---|
| Alan tipleri | `text`, `textarea`, `email`, `phone`, `select`, `checkbox`, `date`, `file`. Hesaplanan, gizli değer ve ilişki gibi tipler public formda yoktur. |
| Alan sayısı | 1–30 |
| Anahtar | `^[a-z][a-zA-Z0-9_]{0,39}$`, tekrarsız; `website` honeypot için ayrılmıştır |
| Etiket | Dile göre; varsayılan dilde zorunlu, en çok 120 karakter |
| `maxLength` | `text` 1–500 (varsayılan 200), `textarea` 1–5000 (varsayılan 2000) |
| `select` | 1–50 seçenek; değer `^[a-z0-9][a-z0-9-]{0,39}$`, tekrarsız |
| `file` | Yalnız formda `settings.allowFiles: true` ise (`FILES_DISABLED`). Biçimler `pdf`, `docx`, `jpeg`, `png`; boyut 1 KB–10 MB; dosya sayısı 1–3. |
| `sensitive` | Gelen kutusunda "Kişisel veri" işareti. **[Sözleşme]** Saklamada zarf anahtarıyla şifrelenir. Dışa aktarmada izinle gelir. |
| `consent` | Zorunlu. Metin varsayılan dilde zorunlu (en çok 2000). `privacyUrl` https. |
| `marketingConsent` | İsteğe bağlı ayrı onay kutusu. İşaretlenmeden de gönderim yapılır. |
| Tanınmayan anahtar | `UNKNOWN_FIELD` |

**Ayarlar** (`settings`): `allowFiles` (varsayılan `false`), `retentionDays` 7–730 (varsayılan 90), `successMessage` (dile göre, en çok 300).

- Taslakta dosya alanı varken `allowFiles: false` yapılamaz: `FILES_IN_USE`.
- Form başlığı varsayılan dilde zorunludur.
- Anahtar `^[a-z][a-z0-9-]{1,39}$` biçimindedir, site içinde tektir ve değiştirilemez.
- Site başına en çok 20 form olabilir.
- Yeni form başlangıç tanımıyla açılır: ad, e-posta, mesaj ve onay metni.

**Sürümler:**

| Kural | Ayrıntı |
|---|---|
| Yayın | `actions/publish` taslağı doğrular ve değişmez bir `form_versions` satırı yazar; taslak yayındakiyle aynıysa `409 NO_CHANGES` |
| Onay sürümü | Onay metni veya adresi değişirse `consentVersion` bir artar. Her başvuru kabul ettiği sürümü saklar. |
| Web sitesi | Yalnız yayındaki sürümü görür. Kapalı (`status: disabled`) veya hiç yayınlanmamış form delivery'de `404` döner. |
| Eşzamanlılık | PATCH ve publish `If-Match` ister |

Audit: `form.created` · `form.updated` · `form.published`.

## 2. Web sitesinin okuduğu tanım

`GET /delivery/sites/{publicKey}/forms/{key}?locale=tr`

```json
{
  "data": {
    "key": "danisma", "version": 2, "title": "Ön görüşme talebi",
    "fields": [ { "key": "name", "type": "text", "label": "Ad soyad", "help": null, "placeholder": null, "required": true, "maxLength": 120 } ],
    "consent": { "version": 1, "text": "…", "privacyUrl": "https://…" },
    "marketingConsent": null,
    "honeypotField": "website",
    "successMessage": "Talebiniz alındı."
  },
  "meta": { "requestedLocale": "tr" }
}
```

- Alıcılar, saklama süresi ve iç ayarlar dönmez.
- Metinler istenen dildedir; yoksa varsayılan dildedir.
- `Cache-Control: public, max-age=60`.
- Delivery hız sınırı (IP + site 100/dk) ve özel mod kuralı ([11-delivery.md](11-delivery.md) §1) geçerlidir.

## 3. Başvuru gönderimi

`POST /delivery/sites/{publicKey}/forms/{key}/submissions` — `Idempotency-Key` zorunlu.

```json
{
  "formVersion": 2,
  "locale": "tr",
  "values": { "name": "…", "email": "…", "document": ["<uploadId>"] },
  "consent": { "accepted": true, "version": 1 },
  "marketingConsent": false,
  "website": "",
  "nonce": "<16–128 karakter, ekler varsa zorunlu>"
}
```

Yanıt `201`:

```json
{ "data": { "confirmationId": "F-991F8EA9AA", "message": "Talebiniz alındı." } }
```

Yalnız opak onay kodu ve mesaj döner; başvuru kimliği ve içeriği yansıtılmaz.

| Denetim | Kural | Hata |
|---|---|---|
| Kaynak | `Origin` sitenin izinli kökenlerinden veya doğrulanmış alan adlarından biri olmalı. Kökensiz istek (sunucu tarafı vekil) yalnız sitenin `delivery:read` anahtarıyla kabul edilir. CORS güvenlik sınırı değildir; denetim sunucudadır. | `403 ORIGIN_NOT_ALLOWED` |
| Hız sınırı | IP + form başına 10 istek/dk. **Hatalı denemeler de sayılır.** | `429 RATE_LIMITED` |
| Boyut | Gövde en çok 64 KB (ekler ayrı) | `413 PAYLOAD_TOO_LARGE` |
| Sürüm | `formVersion` yayındaki sürüm olmalı; site tanımı yeniden okur | `409 FORM_VERSION_CHANGED` |
| Onay | `consent.accepted: true` ve `consent.version` güncel onay sürümü | `422`, `consent` `CONSENT_REQUIRED` |
| Değerler | Yalnız tanımdaki anahtarlar (`UNKNOWN_FIELD`). Metinler NFC normalize edilir ve kırpılır. Denetim karakteri yasak. `text`, `email` ve `phone` alanlarında satır sonu yasak (e-posta başlık enjeksiyonu). E-posta küçük harfe çevrilir. | `422` alan kodları: `REQUIRED`, `INVALID`, `TOO_LONG`, `TOO_MANY` |
| Ekler | Her yükleme bu siteye, forma, sürüme ve alana bağlı olmalı; aynı `nonce` ile yapılmış, `ready`, süresi dolmamış ve kullanılmamış olmalı | `422`, `values.<alan>.<i>` `UPLOAD_INVALID` |
| Honeypot | `website` doluysa başvuru `spam` durumunda saklanır. Yanıt aynıdır; bota ipucu verilmez. Bildirim gitmez. | — |
| Idempotency | Aynı anahtar ve gövde ilk yanıtı tekrarlar (`Idempotent-Replayed: true`); farklı gövde `409 IDEMPOTENCY_KEY_REUSED` | — |

**Kayıt:** Başvuru şu bilgilerle yazılır:

- onay sürümü ve onay zamanı,
- pazarlama izni,
- dil,
- IP adresinin günlük tuzlu özeti: ham IP saklanmaz, özet 7 gün sonra silinir,
- `deleteAfter` = gönderim + saklama süresi.

Aynı transaction'da yapılanlar:

- Kullanılan yüklemeler `consumed` olur ve başvuruya bağlanır.
- Spam olmayan başvuru için `form.submitted` bildirimi yazılır ([14-operations.md](14-operations.md) §3).
- Audit `formSubmission.received` yazılır (aktör yok, içerik yok).

**[Sözleşme]** CAPTCHA adaptörü isteğe bağlıdır ve bu sürümde kapalıdır. Otomatik e-posta yanıtı bu sürümde yoktur.

## 4. Form ekleri

Ekler başvurudan önce yüklenir (şartname §25.6). Akış üç adımdır:

1. `POST …/uploads`: `{ formVersion, fieldKey, fileName, size, nonce }` → `201 { data: { uploadId, expiresAt } }`. Hız sınırı IP + form 20/dk. Boyut alanın `maxBytes` sınırını aşamaz.
2. `PUT …/uploads/{uploadId}/content`: ham bayt, `X-Upload-Nonce: <nonce>`. Bayt sayısı bildirilenle aynı olmalı (`SIZE_MISMATCH`).
3. `POST …/uploads/{uploadId}/finalize`: `{ nonce }`. Gerçek tür baytlardan tespit edilir; alanın izin verdiği biçim olmalı. Zararlı içerik `MALWARE_DETECTED` ile, uygun olmayan biçim `FORMAT_NOT_ALLOWED` ile reddedilir. Reddedilen yükleme silinir.

| Kural | Ayrıntı |
|---|---|
| Bağlama | Yükleme site, form, form sürümü, alan ve `nonce` özetine bağlıdır. Nonce uyuşmazlığı `404` döner; başka bir ziyaretçinin yüklemesinin varlığı sızmaz (AT-57). |
| Ömür | 30 dakika. Gönderilmeyen (yetim) yükleme süresi dolunca silinir. |
| Tek kullanım | Başvuruya bağlanan yükleme ikinci kez kullanılamaz |
| Saklama | Özel alanda saklanır; **medya kütüphanesine hiçbir zaman girmez**. Başvuru silinince ekleri de silinir. |
| İndirme | Yalnız müşteri panelinden, oturumla. `Content-Disposition: attachment`, `nosniff`, `no-store`. Her indirme audit'e yazılır: `formSubmission.attachmentDownloaded`. |

**[Sözleşme]** Bayt yüklemesi backend üzerinden yapılır (ziyaretçi her müşteri sitesinin kökeninden gelir; özel bucket her siteye açılmaz). Tarama gerçek bir antivirüs adaptörüyle tamamlama sırasında yapılır; tarama bitmeden ek `ready` olmaz, tarayıcıya ulaşılamazsa `503 SCAN_UNAVAILABLE` döner ve site yeniden dener.

## 5. Gelen kutusu (müşteri)

**Durumlar:** `unread` → `read` → `in_progress` → `resolved`; ayrıca `spam` ve `archived`. Geçişler serbesttir. Panel, okunmamış başvuru açılınca `read` yapar.

| Liste süzgeci (`status`) | Kapsam |
|---|---|
| verilmezse | `spam` ve `archived` dışındakiler |
| `open` | `unread`, `read`, `in_progress` |
| durum adı | Yalnız o durum |

- `q`: onay kodu ve başvurunun metin değerlerinde arar (en az 2 karakter). Bu arama yalnız gelen kutusundadır; başvurular genel site aramasına girmez.
- Sayfalama [00-conventions.md](00-conventions.md) §9 admin sayfalamasıdır. Liste öğesi: `{ id, confirmationId, status, title (ad · e-posta), locale, formVersion, attachmentCount, spamReason, createdAt, updatedAt }`.
- Ayrıntı ayrıca şunları içerir:
  - `fields[]`: her alanın anahtarı, tipi, etiketi, `sensitive` işareti, değeri ve seçimde seçeneğin etiketi,
  - `attachments[]`, `consent`, `marketingConsent`, `note`, `deleteAfter`, `handledBy`, `version`.
- PATCH `{ status?, note? }` (not en çok 2000 karakter). `If-Match` zorunlu. `read` dışındaki durum değişiklikleri audit'e yazılır: `formSubmission.statusChanged`.
- Toplu işlem: `{ ids (1–100), action: status | delete, status? }`. Silme `formSubmission.delete` ister.
- Kalıcı silme ekleri de siler. Audit'e yalnız onay kodu yazılır: `formSubmission.deleted`.

**Saklama:** Zamanlayıcı, `deleteAfter` tarihi geçmiş başvuruları ve eklerini siler. Yasal saklama yoktur (ADR-057).

## 6. Sayfadaki form bölümü

Sayfa bölüm kataloğunda `form` türü vardır ([10-site-structure.md](10-site-structure.md) §2.4):

- Alanlar: `formKey`, `heading`, `intro`; varyantlar `card` ve `inline`.
- Yayında form bu sitede olmalı, açık olmalı ve yayınlanmış sürümü olmalı. Aksi hâlde `INVALID_REFERENCE`.
- Delivery bölüme `form: { key } | null` ekler; tanım ayrıca okunur.

## 7. Hata kodları

| HTTP | Kod | Ne zaman |
|---|---|---|
| 403 | `ORIGIN_NOT_ALLOWED` | Gönderim veya yükleme izinli olmayan kökenden ya da anahtarsız sunucudan |
| 409 | `FORM_VERSION_CHANGED` | Gönderilen sürüm yayındaki sürüm değil |
| 409 | `NO_CHANGES` | Taslak yayındakiyle aynı |
| 409 | `QUOTA_EXCEEDED` | Site başına 20 form |
| 413 | `PAYLOAD_TOO_LARGE` | Gövde 64 KB'den büyük |
| 422 | `VALIDATION_FAILED` | Alan kodları: `CONSENT_REQUIRED`, `UPLOAD_INVALID`, `FILES_DISABLED`, `FILES_IN_USE`, `TOO_MANY`, `MALWARE_DETECTED`, `FORMAT_NOT_ALLOWED`, `SIZE_MISMATCH` |
| 503 | `SCAN_UNAVAILABLE` | Ek şu an taranamıyor; `Retry-After` sonra tamamlama yeniden denenir |

## 8. Veri modeli

[09-data-model.md](09-data-model.md) "Aşama 7": `forms`, `form_versions`, `form_submissions`, `form_uploads`.

## Değişiklik geçmişi

| Tarih | Değişiklik |
|---|---|
| 18 Kas 2026 | İlk sürüm (Aşama 7): form tanımı ve sürümleri, public tanım, başvuru gönderimi ve kötüye kullanım denetimleri, form ekleri, gelen kutusu, saklama, form bölümü. |
| 18 Kas 2026 | Sadeleştirme (ADR-057): başvurularda `legalHold` kaldırıldı. |
| 20 Kas 2026 | Backend'e taşındı (ADR-0010). Ek baytları backend üzerinden yüklenir; tarama tamamlamada eşzamanlıdır (`503 SCAN_UNAVAILABLE`). Mock form uçları kaldırıldı. |
