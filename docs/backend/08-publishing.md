# 08 — Revizyon, yayın, planlı yayın ve önizleme (`publishing`)

Şartname §7, §10, §15, §25.3–§25.5. Bu belge [06-content.md](06-content.md)'deki kayıt sözleşmesini **revizyon** ve **yayın kopyası** modeliyle genişletir. Kural tek cümlededir: **canlı içerik yalnız bir yayın olayıyla değişir.** Düzenleme, geri yükleme ve şema dönüşümü yalnız taslağı değiştirir.

| Yöntem | Yol | Amaç | İzin (sitede) |
|---|---|---|---|
| POST | `/api/v1/customer/sites/{siteId}/modules/{moduleKey}/entries/{entryId}/actions/publish` · `unpublish` | Yayınla / yayından kaldır | `entry.publish` |
| POST | `…/entries/{entryId}/actions/schedule` · `cancel-schedule` | Planlı yayın / kaldırma | `entry.publish` |
| GET | `…/entries/{entryId}/revisions` | Revizyon listesi | `entry.read` |
| GET | `…/entries/{entryId}/revisions/{revisionId}` | Revizyon değerleri | `entry.read` |
| POST | `…/entries/{entryId}/revisions/{revisionId}/restore` | Eski revizyondan yeni taslak | `entry.restore` |
| GET · POST | `/api/v1/customer/sites/{siteId}/preview-tokens` | Önizleme belirteçleri | `entry.read` |
| DELETE | `/api/v1/customer/sites/{siteId}/preview-tokens/{tokenId}` | Belirteci iptal et | `entry.read` |
| GET | `/api/v1/preview/sites/{publicKey}/content/{moduleKey}/{entryId}?locale=` | Önizleme okuma (oturumsuz, belirteçli) | Belirteç |

**Durum:** Bütün uçlar backend'de uygulanmıştır (`customer-api`); medya referansı denetimi 07 ile, sayfa adresi kuralları 10 ile, webhook olayları 12 ile bağlanır. Yayın olayları webhook outbox'ına yazılır ([12-integrations.md](12-integrations.md) §4); delivery **yalnız yayın kopyasını** okur ([11-delivery.md](11-delivery.md)). Sayfa ve bundle önizlemesi [11-delivery.md](11-delivery.md) §9'dadır.

---

## 1. Revizyon modeli

Her kayıt değişikliği değişmez bir **revizyon** üretir. Kaydın iki işaretçisi vardır:

| İşaretçi | Anlamı |
|---|---|
| `draftRevisionId` | Panelde düzenlenen güncel hâl |
| `publishedRevisionId` · `publishedSnapshotId` | Ziyaretçinin gördüğü hâl. Yayında değilse `null`. |

Revizyon üreten olaylar (`source.type`):

| `source.type` | Ne zaman |
|---|---|
| `create` | Kayıt oluşturma |
| `edit` | `PATCH` (değer gerçekten değiştiyse); `source.locale` yazılan dil |
| `duplicate` | Kopyanın ilk revizyonu; `source.entryId` kaynak |
| `restore` | Eski revizyonun geri yüklenmesi; `source.revisionNumber` |
| `migration` | Şema yayını sonrası dönüştürülmüş değerler; `source.schemaVersion` |
| `import` | İçe aktarmayla oluşturulan veya güncellenen taslak ([14-operations.md](14-operations.md) §5) |

Revizyon sunumu:

```json
{
  "id": "uuid",
  "number": 3,
  "author": { "realm": "customer", "id": "uuid", "displayName": "Mert Aydın" },
  "source": { "type": "edit", "locale": "tr" },
  "changed": ["tr", "shared"],
  "createdAt": "…",
  "isDraft": true,
  "isPublished": false
}
```

- `changed`: Önceki revizyona göre değişen kapsamlar. `shared` ortak (dile bağlı olmayan) alanlardır; diğerleri dil kodudur.
- Tek revizyon ucu ayrıca `values` (etkin şemaya göre anahtarlı), `schemaVersionId` ve `outdatedSchema` döner.
- Revizyonlar **silinmez ve değişmez**. Saklama politikası (ör. 200 revizyondan eskisini özetle) Aşama 8'de belirlenecek; yayınlanmış revizyonlar her zaman saklanır.

**Geri yükleme** (`…/revisions/{revisionId}/restore`, `If-Match` zorunlu):

- Eski revizyonun değerlerinden **yeni** bir taslak revizyon üretir. Canlı değişmez (şartname §15).
- Değerler etkin şemada kayıt kipinde doğrulanır; uymazsa `422 VALIDATION_FAILED`.
- Güncel taslak zaten bu revizyonsa `409 NO_CHANGES`.
- İş akışı durumu taslağa döner. Audit: `entry.revisionRestored`.

## 2. Kayıt durumları

Durum (`status`) taslağın konumudur; yayında olup olmamak ayrı bir işarettir.

| `status` | Anlamı |
|---|---|
| `DRAFT` | Düzenleniyor |
| `PUBLISHED` | Güncel taslak yayında |
| `TRASHED` | Çöp kutusunda |

| Ek alan | Kural |
|---|---|
| `isPublished` | `publishedRevisionId != null` |
| `hasUnpublishedChanges` | Yayında ve `publishedRevisionId != draftRevisionId` |
| `revision` | Güncel taslağın numarası |
| `translation` | Kaynak dil dışındaki her dil için `missing` · `outdated` · `current` (§7) |
| `schedules` | Yalnız ayrıntıda: bekleyen planlar (§4) |

Yayındaki kayıt düzenlenince `isPublished: true` kalır, `status: DRAFT` olur ve `hasUnpublishedChanges: true` döner. Liste süzgeci `status` şu değerleri alır: `PUBLISHED` (yayında), `DRAFT` (hiç yayında değil), `UNPUBLISHED_CHANGES`.

## 3. Yayın akışı

İnceleme/onay akışı yoktur (ADR-056). Müşteri hesabı kaydı kaydeder ve doğrudan yayınlar:

```
DRAFT ──publish──▶ PUBLISHED ──düzenleme──▶ DRAFT (yayın kopyası değişmez, hasUnpublishedChanges)
```

- `publish` öncesi sunucu değerleri yayın kipinde doğrular ([06-content.md](06-content.md)); çöp kutusundaki kayıt yayınlanamaz (`409 INVALID_STATE_TRANSITION`).
- Şemadaki `behavior.workflow` yalnız `direct` değerini alır ([05-schema.md](05-schema.md) §2).
- Kaldırılan uçlar: `actions/submit`, `actions/approve`, `actions/request-changes`, `…/comments`, `…/review-queue`. Bu yollar `404` döner.

## 4. Yayın ve planlı yayın

**Yayın** (`publish`):

1. İş akışı kuralı (§3) denetlenir.
2. Taslak revizyon **yayın kipinde** doğrulanır: `requiredOn: publish`, benzersizlik, medya (`ready`, alt metin) ve ilişki.
3. **İlişki kuralı:** Ziyaretçiye açık (`public`) ilişki alanının hedef kaydı yayında olmalı (`422`, alan kodu `RELATION_NOT_PUBLISHED`).
4. Değişmez bir yayın kopyası (`published_snapshots`) yazılır ve işaretçiler ona geçer.
5. Sitenin `releaseVersion` sayacı bir artar (delivery önbellek anahtarı, [00-conventions.md](00-conventions.md)).
6. Sayfa yayınında adres değişmişse adres geçmişi yazılır ([10-site-structure.md](10-site-structure.md) §2.3). Webhook olayı (`content.published` veya yapı modülünde `site.config.published`) outbox'a yazılır.

**Yayından kaldırma** (`unpublish`): Yayındaki başka bir kaydın yayın kopyası bu kayda ilişki veriyorsa `409 DEPENDENCY_CONFLICT`. Kopyalar geçmişte kalır. Çöpe taşıma yayından kaldırmayı ve bekleyen planların iptalini içerir.

**Plan** (`schedule`):

```json
{ "type": "publish", "at": "2026-12-01T09:00:00+03:00" }
```

| Kural | Ayrıntı |
|---|---|
| Zaman biçimi | Saat dilimi ofseti **zorunlu** (`Z` veya `±hh:mm`). Ofsetsiz yerel saat `422 INVALID` döner. Panel tarih ve saati **site saat diliminde** alır ve UTC anına çevirir; yaz saati belirsizliği istemcide çözülür. |
| Aralık | En az 1 dakika sonrası, en çok 1 yıl içi (`422 OUT_OF_RANGE`) |
| Sabitleme | `publish` planı o anki **taslak revizyonu** sabitler. Plandan sonra yapılan düzenleme plana girmez. `unpublish` planı o anki **yayın kopyasını** sabitler. |
| Tekillik | Kayıt başına her türden en çok bir bekleyen plan (`409 SCHEDULE_EXISTS`) |
| Ön denetim | `publish` planı oluşturulurken iş akışı ve yayın doğrulaması yapılır; uygulama anında yeniden yapılır |
| İptal | `cancel-schedule` `{ jobId }` |

Plan sunumu (`schedules[]`):

```json
{ "id": "uuid", "type": "publish", "target": "entry", "executeAt": "2026-12-01T06:00:00.000Z", "status": "pending", "revisionId": "uuid", "revisionNumber": 3, "createdBy": { … }, "createdAt": "…", "finishedAt": null, "failure": null }
```

### 4.1 Zamanlayıcı (worker)

| Kural | Ayrıntı |
|---|---|
| Seçim | `status = pending AND execute_at <= now()` görevleri `FOR UPDATE SKIP LOCKED` ile kilitlenir; `lease_until = now() + 60 sn` yazılır |
| Tek uygulama | `idempotency_key` (`entryId:type:revisionId:executeAt`) `unique`. Yayın işlemi ve görevin `done` olması aynı transaction'dadır. İki worker aynı görevi yayınlayamaz (AT-17). |
| Kurtarma | Worker açılışta ve periyodik olarak (mock: 5 sn) vadesi geçmiş görevleri işler; kapalıyken kaçan görev açılınca uygulanır. Süresi dolmuş kira yeniden alınabilir. |
| Uygulama | `publish`: sabitlenen revizyon yayınlanır. Revizyonun şeması etkin şemadan farklıysa `SCHEMA_CHANGED` ile başarısız olur. `unpublish`: yayın kopyası değiştiyse `STALE_SCHEDULE` ile başarısız olur. |
| Hata | Veri kaynaklı hata (doğrulama, şema) yeniden denenmez: `failed` + `failure { code, message }`. Altyapı hatası en çok 3 kez denenir. |
| Audit | Aktör `null` (sistem); `metadata.scheduledBy` planı yapan kişi, `metadata.jobId`, `requestId = job_<id>`. Başarısızlıkta `schedule.failed`. |

## 5. Yayın paketi

Yayın paketi yoktur (ADR-057). Her kayıt kendi başına yayınlanır veya planlanır. `releases/**` uçları `404` döner. `releaseVersion` site yayın sayacı olarak kalır ve her yayın olayında artar ([11-delivery.md](11-delivery.md)).

## 6. Önizleme

| Kural | Ayrıntı |
|---|---|
| Kapsam | Belirteç **tek site, tek dil** ve tek kayıt revizyonu (`{ entryId, revisionId? }`, varsayılan güncel taslak) içindir |
| Ömür | 15 dakika; `DELETE` ile iptal. Panel önizleme penceresi kapanınca belirteci iptal eder. |
| Saklama | Yalnız SHA-256 özeti saklanır. Ham belirteç (`pv_…`) yalnız oluşturma yanıtında bir kez döner. |
| Okuma | `Authorization: Bearer <belirteç>` (veya `X-Preview-Token`). Çerez kullanılmaz. |
| Hata | Belirteç yok, başka siteye ait, süresi dolmuş veya iptal edilmiş → hepsi `401 PREVIEW_TOKEN_INVALID` (ayrım sızdırılmaz). Başka dil veya başka kayıt → `403 PREVIEW_SCOPE_DENIED`. |
| Yanıt başlıkları | `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow`, `Referrer-Policy: no-referrer` |
| Yanıt | Delivery ile aynı public projeksiyon (gizli, hassas, `public: false` alanlar çıkmaz) + `meta.preview: true`, `meta.source`: `revision` |

Delivery **hiçbir koşulda** taslak döndürmez; önizleme ayrı uç ve ayrı yetkilendirmedir (AT-19).

## 7. Çeviri durumu

Kaydın her dili için son değiştiği revizyon numarası (`entries.locale_versions`) tutulur. Kaynak dil sitenin varsayılan dilidir.

| Durum | Kural |
|---|---|
| `missing` | Kaynak dilde dolu, bu dilde boş en az bir görünür dile bağlı alan var |
| `outdated` | Kaynak dil, bu dilden daha yeni bir revizyonda değişti |
| `current` | Diğer durumlar |

Ortak alan değişikliği dile bağlı durumları etkilemez. Yayın kayıt bütünüdür: dillerin ayrı ayrı yayınlanması bu sürümde yoktur (ADR-037). Eksik dilin delivery'de davranışı sitenin `localeFallback` ayarıdır ([11-delivery.md](11-delivery.md) §4).

## 8. Şema yayınının etkisi (AT-48)

Modül şeması yeni sürüme geçtiğinde ([05-schema.md](05-schema.md) §9), aynı transaction'da:

1. Her kayıt dönüştürülmüş değerlerle bir `migration` revizyonu alır.
2. Bekleyen kayıt planları `cancelled` olur (`failure.code: SCHEMA_CHANGED`).
3. Yayında olup taslağı yayınla aynı olan kayıt, dönüştürülmüş revizyonla yeniden yayınlanır. Taslağı farklı olanın yayın kopyası ayrıca dönüştürülür ve yeni bir kopya yazılır. Canlı içeriğin anlamı değişmez; yalnız biçimi yeni şemaya uyar.
4. Eski şemaya ait bir taslak yayınlanamaz; eski revizyonu sabitlemiş plan `SCHEMA_CHANGED` hatası verir.

## 9. Hata kodları

| HTTP | Kod | Ne zaman |
|---|---|---|
| 401 | `PREVIEW_TOKEN_INVALID` | Önizleme belirteci geçersiz |
| 403 | `PREVIEW_SCOPE_DENIED` | Belirteç başka dil veya kayıt için |
| 409 | `SCHEDULE_EXISTS` | Aynı türde bekleyen plan var |
| 409 | `NO_CHANGES` | Geri yüklenen revizyon zaten güncel taslak |
| 409 | `DEPENDENCY_CONFLICT` | Yayındaki başka kayıt bu kayda bağlı |
| 422 | `VALIDATION_FAILED` | Alan kodları ayrıca: `RELATION_NOT_PUBLISHED`, `OUT_OF_RANGE` (`at`) |

Plan başarısızlık kodları (`failure.code`, `errors[].code`): `SCHEMA_CHANGED`, `STALE_SCHEDULE`, `REVISION_NOT_FOUND`, `ENTRY_UNAVAILABLE`, `NOT_PUBLISHED`, `CANCELLED`.

## 10. Panel davranışı

- **Kayıt düzenleyici:** Durum rozetleri ("Taslak" + "Yayında" + "Yayınlanmamış değişiklik" + "Planlı"). Ana düğmeler "Kaydet" ve "Yayınla"dır. Diğer işlemler "Diğer" menüsündedir: önizle, yayını planla, kopyala, yayından kaldır, sil.
- Bekleyen planlar sayfanın üstünde zamanı (site saat diliminde), revizyon numarası ve iptal düğmesiyle görünür.
- **Sekmeler:** İçerik · Geçmiş (revizyonlar, görüntüleme, geri yükleme). Sekme adreste saklanır (`?sekme=`).
- **Dil seçici:** Eksik alan sayısı ve "kaynak değişti" (`outdated`) işareti.
- **Ana ekran:** "Yayın bekleyenler" kartı: hiç yayınlanmamış veya yayınlanmamış değişikliği olan kayıtlar ([14-operations.md](14-operations.md) §1).

## 11. Veri modeli

[09-data-model.md](09-data-model.md) "Aşama 5": `entry_revisions`, `published_snapshots`, `scheduled_jobs`, `preview_tokens`; `entries` ek kolonları.

## Değişiklik geçmişi

| Tarih | Değişiklik |
|---|---|
| 17 Kas 2026 | İlk sürüm (Aşama 5): revizyonlar ve geri yükleme, inceleme akışı ve görev kutusu, planlı yayın ve worker, yayın paketi (atomik yayın, plan, geri alma), önizleme belirteçleri, çeviri durumu, şema yayınının iş akışına etkisi. |
| 17 Kas 2026 | Aşama 6: yayında adres geçmişi ve webhook outbox'ı; dil geri dönüşü ve sayfa önizlemesi bağlantıları. Panelde `publishingTools: basic` sitede planlama, paket ve yorum sekmesi gizlenir (ADR-042). |
| 18 Kas 2026 | Aşama 7: revizyon kaynağı `import`. İnceleme bildirimleri ([14-operations.md](14-operations.md) §3). |
| 18 Kas 2026 | Sade yetki modeli (ADR-056): inceleme akışı (gönder, onayla, değişiklik iste), yorumlar, görev kutusu, `IN_REVIEW`/`CHANGES_REQUESTED`/`APPROVED` durumları, `review`/`approval`/`workflow` alanları ve `APPROVAL_REQUIRED`, `STALE_REVISION`, `SELF_APPROVAL_FORBIDDEN` kodları kaldırıldı. |
| 18 Kas 2026 | Sadeleştirme (ADR-057): yayın paketi (uçlar, paket önizlemesi, paket planı, `RELEASE_INVALID`, `ROLLBACK_BLOCKED`) ve `publishingTools` kaldırıldı; planlı yayın her sitede açık. |
