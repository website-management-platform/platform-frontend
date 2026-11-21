# 14 — Ana ekran, arama, bildirimler, dışa aktarma, işler, dil değişikliği (`operations`)

Şartname §7, §15, §18, §19, §25.4, AT-27, AT-51, AT-62, AT-67.

| Yöntem | Yol (`/api/v1` altında) | Amaç | İzin |
|---|---|---|---|
| GET | `/customer/sites/{siteId}/dashboard` | Ana ekran kartları | Siteye erişim (kart başına ayrıca izin) |
| GET | `/customer/sites/{siteId}/search?q=&limit=` | Site içi arama | Siteye erişim (sonuç izne göre) |
| GET | `/customer/sites/{siteId}/notifications?unread=&page=&size=` | Bildirimler | Siteye erişim (yalnız kendi bildirimleri) |
| GET | `…/notifications/summary` | Okunmamış sayısı | aynı |
| PATCH · DELETE | `…/notifications/{id}` | Okundu/okunmadı · sil | aynı |
| POST | `…/notifications/read-all` | Tümünü okundu say | aynı |
| GET · POST | `/customer/sites/{siteId}/exports` | Dışa aktarmalar / yeni | Türe göre (§4) |
| GET | `…/exports/{exportId}/download` | İndir | Türe göre, her indirmede |
| GET | `/customer/sites/{siteId}/jobs/{jobId}` | İş durumu | İşi başlatan kişi |
| GET | `/platform/jobs?status=&source=` | Bütün kiracıların işleri | `platform.site.read` |
| POST | `/platform/jobs/{jobId}/retry` | Başarısız işi yeniden kuyruğa al | `platform.site.manage` |
| GET | `/platform/health-summary` | Operasyon özeti | `platform.site.read` |
| POST | `/platform/sites/{siteId}/locales/impact` | Dil değişikliği etki raporu | `platform.site.read` |
| PUT | `/platform/sites/{siteId}/locales` | Dil değişikliğini uygula | `platform.site.manage` |

**Durum:** Bütün uçlar backend'de uygulanmıştır: ana ekran, arama, bildirimler, dışa aktarma ve iş işçisi `customer-api` (`com.wmp.customer.operations`, `notifications`, `sites`); platform iş listesi, sağlık özeti ve dil değişikliği `platform-api` (`com.wmp.platform.operations`); backend ADR-0011. Arama tam metin dizini yerine `unaccent` ile Türkçe katlanmış metinde arar ve sonucu yalnız başlık ve aranabilir alanlar belirler. `IMPACT_CHANGED` yanıtı güncel raporu `report` üyesinde taşır. Mock'taki uçlar kaldırıldı.

---

## 1. Ana ekran (dashboard)

Kartlar **sabittir** ve her sitede aşağıdaki sırayla gelir; platformdan kart seçme veya yapılandırma yoktur (ADR-057). Serbest sorgu, SQL veya betik yoktur (şartname §18). Yetkisi olmayan kart dönmez. Kart verileri yalnız o siteye aittir.

| Tür | İzin | Veri |
|---|---|---|
| `siteStatus` | — | Durum, `releaseVersion`, son yayın zamanı, doğrulanmış birincil adres |
| `pendingWork` | `entry.read` | "Yayın bekleyenler": hiç yayınlanmamış veya yayınlanmamış değişikliği olan kayıtlar, son değişen önce; ilk 5. Öğe `state`: `draft` · `changed` |
| `formInbox` | `formSubmission.read` | Form başına okunmamış ve açık başvuru sayısı |
| `quickActions` | `entry.create` | "Yeni kayıt" bağlantıları (site yapısı ve tek kayıtlı modüller hariç, en çok 6) |
| `recentChanges` | `entry.read` | Son değişen 6 kayıt |
| `scheduled` | `entry.read` | En yakın 5 bekleyen plan |
| `mediaUsage` | `asset.read` | Kullanılan / kota, düzey `ok` · `warning` (%80) · `critical` (%95) |

`GET …/dashboard` → `{ widgets: [{ id, type, title: null, data }], generatedAt }`. Panel site değişince yeniden yükler.

Müşteri menüsünün gruplanması yapılandırmayla değil, modülün `area` alanıyla yapılır ([10-site-structure.md](10-site-structure.md) §1).

## 2. Site içi arama

`GET …/search?q=haber&limit=20` → `{ items: [{ type: entry | asset, id, title, module?, isPublished?, kind?, updatedAt, link }], total, query }`

| Kural | Ayrıntı |
|---|---|
| Uzunluk | `q` 2–100 karakter; `limit` 1–50 (varsayılan 20). Aksi hâlde `400 MALFORMED_REQUEST`. |
| Kapsam | `entry.read` varsa açık modüllerdeki kayıtlar (taslak dahil; başlık alanı ve `searchable` alanlar). `asset.read` varsa medya (başlık, dosya adı, etiket). Gizli değer alanları aranmaz. |
| Kişisel veri | **Form başvuruları genel aramaya girmez.** Başvurular yalnız gelen kutusunda aranır ([13-forms.md](13-forms.md) §5). |
| Eşleşme | Büyük/küçük harf ve aksan duyarsız: Unicode NFKD + aksan atma + `tr-TR` küçük harf + `ı→i`. Başlıkta eşleşenler önce, sonra son değişiklik. |
| **[Sözleşme]** | Backend PostgreSQL tam metin araması kullanır (Türkçe sözlük ya da `simple` + `unaccent`). Dizin yayınla aynı transaction'da veya outbox ile güncellenir. Panel kısa gecikmeyi kabul eder. |

Panel bu ucu komut paletinde (Ctrl/⌘ K) kullanır: 300 ms gecikme, en çok 12 sonuç.

## 3. Bildirimler

| Tür | Kime | Varsayılan e-posta |
|---|---|---|
| `publish.failed` | `entry.publish` izni olanlar | açık |
| `form.submitted` | `formSubmission.read` izni olanlar | açık |
| `quota.threshold` | `asset.upload` izni olanlar; %80 ve %95 eşiği aşıldığında bir kez | açık |
| `export.ready` | İşi başlatan kişi | kapalı |

| Kural | Ayrıntı |
|---|---|
| Kalıcılık | Bildirim olayla aynı transaction'da yazılır (outbox). Alıcı, o anda sitede erişimi ve izni olan etkin kullanıcılardır. |
| Tekilleştirme | `dedupKey` (ör. `form:<formId>`, `job:<jobId>`, `quota:0.8`): okunmamış aynı anahtarlı bildirim varsa yenisi açılmaz, `count` artar |
| İçerik | Başlık kişisel veri içermez (formun adı, kaydın başlığı; başvuranın adı değil). E-postada yalnız başlık ve panel bağlantısı bulunur. |
| E-posta | Tür başına sabittir (yukarıdaki "Varsayılan e-posta" sütunu); kullanıcı tercihi yoktur (ADR-057). Panel içi bildirim kapatılamaz. |
| Saklama | **[Sözleşme]** Okunmuş bildirimler 90 gün sonra silinir |
| Sunum | `{ id, type, title, body, link, count, actor, read, createdAt, updatedAt }`. Liste `unreadCount` da döner. |

Panel üst çubukta bildirim zili gösterir. Okunmamış sayısı 60 saniyede bir `summary` ucundan okunur. Bildirime tıklanınca okundu sayılır ve bağlantısı açılır.

**[Sözleşme]** E-posta SMTP adaptörüyle gönderilir. Platform tarafının sistem uyarıları (başarısız iş) yalnız platform kullanıcılarına gider; müşteri bildirimine dönüşmez.

## 4. Dışa aktarma

`POST …/exports` (`Idempotency-Key` zorunlu) → `202`. İş kuyruğa alınır; hazır olunca `export.ready` bildirimi gelir.

| `kind` | Biçim | İzin | İçerik |
|---|---|---|---|
| `site` | JSON | `entry.export` | Bütün açık modüller: şema sürümü ve alan listesi, kayıtlar (taslak değerleri, `published`, `parentId`, `position`), medya listesi (bayt yok), sayılar ve özet |
| `module` | CSV | `entry.export` | Tek modül; dile bağlı alan dil başına sütun (`baslik.tr`); dizi/nesne JSON metni |
| `formSubmissions` | CSV | `formSubmission.export` | Onay kodu, tarih, durum, dil, onay sürümü ve zamanı, pazarlama izni, alanlar, ek adları; spam hariç |

| Kural | Ayrıntı |
|---|---|
| Hiçbir zaman | Kullanıcılar, oturumlar, API anahtarları, webhook sırları, gizli değer alanları |
| Hassas alanlar | Varsayılan olarak çıkarılır. `options.includeSensitive: true` yalnız `site.settings.update` iznine sahip kişi içindir (sade modelde müşteri hesabında vardır). |
| CSV güvenliği | UTF-8 BOM (varsayılan; `options.bom: false` ile kapatılır). `=`, `+`, `-`, `@`, sekme veya satır başıyla başlayan hücrenin başına `'` eklenir (formül enjeksiyonu). |
| JSON biçimi | `format: "wmp-site-export"`, `formatVersion: 1`, `generatedAt`, `source { siteId, siteKey, locales, defaultLocale, timezone }`, `modules[]`, `media[]`, `counts`, `checksum` (SHA-256, kanonik JSON) |
| Eşzamanlılık | Site başına en çok 2 hazırlanan dışa aktarma (`409 QUOTA_EXCEEDED`) |
| Saklama | Dosya hazır olduktan sonra 24 saat indirilebilir, sonra silinir (`expired`). **[Sözleşme]** Özel ve şifreli nesne deposunda saklanır. |
| İndirme | İzin **her indirmede yeniden** denetlenir; izin kalkmışsa `404` (AT-62). Süresi dolan dosya `410 EXPORT_EXPIRED`, hazır olmayan `409 EXPORT_NOT_READY`. `Content-Disposition: attachment`, `no-store`, `nosniff`. Her indirme audit'e yazılır. |
| Liste | Kullanıcının izni olan türlerdeki son 50 dışa aktarma: `{ id, kind, format, fileName, status (pending · ready · failed · expired), size, rowCount, checksum, options, expiresAt, createdBy, createdAt, job }` |

Audit: `export.requested` · `export.downloaded`.

## 5. İçe aktarma

İçe aktarma yoktur (ADR-057). `imports/**` uçları `404` döner. Site JSON dışa aktarması yedek olarak saklanır.

## 6. İşler ve işçi

| Kural | Ayrıntı |
|---|---|
| Tür | `export` |
| Durum | `queued` → `running` → `succeeded` · `failed`; ayrıca `cancelled` |
| Adalet | Her işçi turunda kiracı başına en çok bir iş, toplam en çok 4 (AT-67). Mock: 5 saniyelik tur. |
| Yeniden deneme | Altyapı hatasında en çok 3 deneme; site etkin değilse yeniden denenmez. Başarısız iş platformdan elle yeniden kuyruğa alınır (`POST /platform/jobs/{id}/retry`, audit `job.retried`). |
| Müşteri | `GET …/jobs/{id}` yalnız işi başlatan kişiye döner |

**[Sözleşme]** Backend işçisi `FOR UPDATE SKIP LOCKED` ve kira ile çalışır, kiracı başına eşzamanlılık sınırı uygular ve zehirli işi ayırır. İş satırı istekle aynı transaction'da yazılır.

## 7. Platform: iş kuyruğu ve sağlık özeti

`GET /platform/jobs` üç kaynağı birlikte listeler: aktarma işleri, planlı yayınlar, bekleyen ve ölü webhook teslimleri. Son 200 kayıt döner. Kişisel veri ve dosya içeriği yoktur. Süzgeç: `status`, `source` (`transfer` · `scheduler` · `webhook`).

`GET /platform/health-summary`:

```json
{
  "status": "ok",
  "checks": [ { "key": "scheduler", "label": "Planlı yayın işçisi", "status": "ok" }, { "key": "jobs", "status": "ok" }, { "key": "webhooks", "status": "ok" }, { "key": "storage", "status": "ok" } ],
  "queues": { "transferQueued": 0, "schedulePending": 0, "webhookPending": 0, "webhookDead": 0 },
  "failedLast24h": 0,
  "storageWarnings": [ { "siteId": "…", "displayName": "…", "ratio": 0.83 } ],
  "maxJobAttempts": 3,
  "generatedAt": "…"
}
```

Bir denetim `degraded` olur: vadesi 1 dakikadan fazla geçmiş plan, 5 dakikadan uzun kuyrukta bekleyen iş, son 24 saatte ölü webhook teslimi veya %95 üstü depolama.

**[Sözleşme]** Backend ayrıca DB, nesne deposu, SMTP ve tarayıcı bağlantılarını denetler.

## 8. Site dillerinin değişimi (AT-51)

Dil ekleme, dil arşivleme ve varsayılan dil değişimi site PATCH'iyle yapılmaz ([02-tenancy.md](02-tenancy.md)). Bu ayrı uç etki raporu okunmadan uygulanamaz.

`POST …/locales/impact` `{ locales, defaultLocale }` → rapor:

```json
{
  "added": ["en"], "removed": [], "defaultChange": null,
  "errors": [ { "code": "LOCALE_UNSUPPORTED", "message": "…" } ],
  "warnings": [ { "code": "TRANSLATION_MISSING", "locale": "en", "count": 29, "message": "…" } ],
  "canApply": false,
  "impactToken": "…"
}
```

| Kod | Tür | Ne zaman |
|---|---|---|
| `LOCALE_UNSUPPORTED` | hata | Etkin frontend manifest'i dili desteklemiyor ([12-integrations.md](12-integrations.md) §5) |
| `ROUTE_MISSING` | hata | Yeni varsayılan dilde adres parçası olmayan yayındaki sayfalar adressiz kalır |
| `ROUTES_REMOVED` | uyarı | Arşivlenen dildeki yayındaki sayfa adresleri yayından kalkar |
| `VALUES_ARCHIVED` | uyarı | Arşivlenen dildeki değerleri olan kayıtlar: değerler silinmez, görünmez |
| `FORM_TEXTS` | uyarı | Arşivlenen dildeki form metinleri kullanılmaz |
| `TRANSLATION_MISSING` | uyarı | Eklenen dilde çevirisi olmayan yayındaki kayıtlar (geri dönüş kuralına göre görünür) |
| `PUBLISH_BLOCKED` | uyarı | Yeni varsayılan dilde zorunlu metni boş kayıtlar yeniden yayınlanamaz |
| `SEO_DEFAULT` | uyarı | `x-default` ve site haritası yeni varsayılan dile geçer |
| `SCHEDULES_PENDING` | uyarı | Bekleyen planlar uygulanırken yeni dil ayarıyla doğrulanır |

`PUT …/locales` `{ locales, defaultLocale, impactToken }` (`If-Match` zorunlu):

- Rapor yeniden hesaplanır. `impactToken` güncel raporunkiyle aynı değilse `409 IMPACT_CHANGED` döner; yanıt yeni raporu taşır.
- Hata varsa `409 LOCALE_CHANGE_BLOCKED`, değişiklik yoksa `409 NO_CHANGES`.
- Uygulamada:
  - Kaldırılan diller `sites.archived_locales` listesine girer; değerler silinmez, dil yeniden eklenince geri gelir.
  - `releaseVersion` artar.
  - `site.config.published` webhook olayı yazılır.
  - Audit `site.localesChanged` (önce/sonra ve uyarı kodları).

Panelde Platform → Site → Genel → "Dilleri değiştir" penceresi kullanılır: dilleri seç, etkiyi denetle, uyarıları onayla, uygula.

## 9. Hata kodları

| HTTP | Kod | Ne zaman |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | Arama sorgusu uzunluğu, `limit` |
| 409 | `EXPORT_NOT_READY` | Dosya hazırlanıyor |
| 410 | `EXPORT_EXPIRED` | 24 saat geçti |
| 409 | `IMPACT_CHANGED` | Dil raporu güncel değil |
| 409 | `LOCALE_CHANGE_BLOCKED` | Dil değişikliğini engelleyen sorun |
| 409 | `QUOTA_EXCEEDED` | Aynı anda 2'den fazla dışa aktarma |
| 409 | `NO_CHANGES` · `INVALID_STATE_TRANSITION` | Dil değişmedi · iş durumu uygun değil |
| 422 | `VALIDATION_FAILED` | Alan kodları: `INVALID_REFERENCE`, `OUT_OF_RANGE` |

## 10. Veri modeli

[09-data-model.md](09-data-model.md) "Aşama 7":

- tablolar: `notifications`, `exports`, `jobs`,
- kolon: `sites.archived_locales`.

## Değişiklik geçmişi

| Tarih | Değişiklik |
|---|---|
| 18 Kas 2026 | İlk sürüm (Aşama 7): ana ekran ve yapılandırması, site içi arama, bildirimler ve tercihler, dışa aktarma, aşamalı ve atomik içe aktarma, işler ve adalet, iş kuyruğu ve sağlık özeti, etki raporlu dil değişikliği. |
| 18 Kas 2026 | Sade yetki modeli (ADR-056): `review.*` bildirim türleri kaldırıldı; `pendingWork` kartı "Yayın bekleyenler" oldu. Alıcı, müşterinin tek hesabıdır. |
| 18 Kas 2026 | Sadeleştirme (ADR-057): ana ekran sabit (platform yapılandırması, `config/**` uçları ve `contentCounts` kartı kaldırıldı); içe aktarma (`imports/**`, `import.*` işleri ve bildirimi, `IMPORT_NOT_VALIDATED`) ve bildirim tercihleri (`notification-preferences`) kaldırıldı. |
| 20 Kas 2026 | Backend'e taşındı (ADR-0011): arama `unaccent` + Türkçe katlama; `IMPACT_CHANGED` problem yanıtında `report`. Mock uçları ve mock arka plan işçisi kaldırıldı. |
