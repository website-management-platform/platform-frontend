# 06 — İçerik kayıtları (`content`)

Şartname §3, §5.1, §10, §14, §15 ve §25.4. Müşteri panelinin kayıt uçlarıdır. Kayıtlar, modülün **yayınlanmış (etkin)** şemasına göre doğrulanır. Şemanın kendisi ve değer biçimleri [05-schema.md](05-schema.md)'dedir.

Bu modülde kayıt **tek satırdır**: taslak değerler ve son yayınlanan değerlerin kopyası aynı satırda durur. Şartname §14'teki değişmez revizyonlar (`entry_revisions`), dil bazlı iş akışı, planlı yayın ve release Aşama 5'te bu modelin yerine geçecek (ADR-029). Uç adresleri ve istemci davranışı değişmeyecek.

| Yöntem | Yol | Amaç | İzin (sitede) |
|---|---|---|---|
| GET | `/api/v1/customer/sites/{siteId}/modules/{moduleKey}/schema` | Etkin şema ve alanın düzenlenebilirliği | `entry.read` |
| GET | `/api/v1/customer/sites/{siteId}/modules/{moduleKey}/entries` | Liste, arama, süzgeç, sıralama, çöp kutusu | `entry.read` |
| POST | `/api/v1/customer/sites/{siteId}/modules/{moduleKey}/entries` | Kayıt oluşturma | `entry.create` |
| GET | `/api/v1/customer/sites/{siteId}/modules/{moduleKey}/entries/{entryId}` | Kayıt ayrıntısı | `entry.read` |
| PATCH | `/api/v1/customer/sites/{siteId}/modules/{moduleKey}/entries/{entryId}` | Değer değişikliği (`set`/`unset`/`locale`) | `entry.update` |
| POST | `/api/v1/customer/sites/{siteId}/modules/{moduleKey}/entries/{entryId}/actions/{publish\|unpublish}` | Yayın | `entry.publish` |
| POST | `…/entries/{entryId}/actions/duplicate` | Kopyalama | `entry.create` |
| POST | `…/entries/{entryId}/actions/trash` | Çöp kutusuna taşıma | `entry.delete` |
| POST | `…/entries/{entryId}/actions/restore` | Çöp kutusundan geri alma | `entry.restore` |
| POST | `…/entries/{entryId}/actions/move` | Ağaçta üst kayıt ve konum değişikliği **[ÖNERİ]** | `entry.update` |
| POST | `/api/v1/customer/sites/{siteId}/modules/{moduleKey}/reorder` | Kardeş kayıtların sırası | `entry.update` |
| POST | `/api/v1/customer/sites/{siteId}/modules/{moduleKey}/bulk` | Toplu yayın, yayından kaldırma, çöp, geri alma | İşlemin izni |

Bütün uçlar backend'de uygulanmıştır (`customer-api`); medya referansı denetimi 07 ile, sayfa adresi kuralları 10 ile, webhook olayları 12 ile bağlanır. Şartname tablosundaki `actions/{submit,approve,request-changes,schedule,cancel-schedule,archive}`, `revisions` ve `comments` uçları Aşama 5'te eklenecek. Kalıcı silme ucu yoktur: silme çöp kutusuna taşımadır; kalıcı silme saklama süresi dolunca sistem işidir (şartname §10).

`move` gerekçesi: Şartname §14 ağaçta "parent aynı instance, döngü denetimi" ister. Üst kaydı değiştirmek ile sıralamak tek atomik işlem olmalıdır; `reorder` tek düzeyin sırasını değiştirdiği için yeterli değildir (DECISIONS ADR-030).

---

## 1. Erişim ve kapsam

- **Erişim sırası** ([00-conventions.md](00-conventions.md) §6):
  1. Site erişimi. Yoksa `404`.
  2. Modülün görünürlüğü: `ENABLED` ve yayınlanmış şeması olmalı. Değilse `404`.
  3. İşlem izni. Yoksa `403 PERMISSION_DENIED`.
  4. Kayıt bu modüle ait olmalı. Değilse `404`.

  Başka sitenin veya modülün kayıt kimliği her zaman `404` döner (AT-02).
- **Alan düzeyinde yazma** (şartname §6, AT-06):
  - Değiştirilmek istenen alan `readOnly` ise istek `403 FIELD_WRITE_DENIED` ile reddedilir. `errors` alanında `values.<anahtar>` yolu döner. Rol bazlı alan kısıtı yoktur (ADR-056).
  - Okuma kısıtlanmaz. Gizli değer (`secret`) alanları hiçbir yanıtta yer almaz.
- **Hesaplanan alan:** Yazılamaz (`READ_ONLY`). Yanıtta `computed` nesnesinde ayrıca döner.

## 2. Kayıt sunumu

```json
{
  "id": "uuid",
  "status": "DRAFT",
  "isPublished": true,
  "hasUnpublishedChanges": true,
  "workflow": "direct",
  "revision": 4,
  "draftRevisionId": "uuid",
  "publishedRevisionId": "uuid",
  "review": null,
  "approval": null,
  "translation": { "en": "outdated" },
  "schedules": [],
  "position": 2048,
  "parentId": null,
  "title": "Deniz Arslan",
  "subtitle": "Genel Müdür",
  "image": { "assetId": "uuid", "alt": "Deniz Arslan", "caption": null },
  "columns": { "title": "Genel Müdür" },
  "values": { "fullName": "Deniz Arslan", "title": { "tr": "Genel Müdür", "en": "General Manager" } },
  "computed": { "displayName": "Deniz Arslan" },
  "schemaVersion": 2,
  "createdAt": "…",
  "updatedAt": "…",
  "publishedAt": "…",
  "deletedAt": null,
  "updatedBy": { "realm": "customer", "id": "uuid", "displayName": "Selin Kaya" },
  "version": "\"4\""
}
```

| Alan | Kural |
|---|---|
| `status` | `DRAFT` · `PUBLISHED` · `TRASHED` ([08-publishing.md](08-publishing.md) §2) |
| `isPublished`, `hasUnpublishedChanges` | Yayın işaretçisi; yayındaki kayıtta taslak son yayından sonra değiştiyse `hasUnpublishedChanges: true` |
| `revision`, `draftRevisionId`, `publishedRevisionId`, `review`, `approval`, `translation`, `schedules` | Revizyon, iş akışı, çeviri durumu ve planlar ([08-publishing.md](08-publishing.md)); `schedules` yalnız ayrıntıda |
| `title`, `subtitle`, `image`, `columns` | Şemanın `ui.list` ayarlarından türetilir. Değerler `locale` parametresindeki dilden okunur; o dilde değer yoksa sitenin varsayılan diline düşülür. `columns` alan anahtarıyla gelir. |
| `values`, `computed` | Yalnız ayrıntıda, oluşturma/değiştirme yanıtında ve işlem yanıtlarında döner; listede dönmez. Biçim: alan **anahtarıyla** API değerleri ([05-schema.md](05-schema.md) §4). Arşivli alanlar ve gizli değerler dönmez. |
| `version` | ETag. `PATCH` ve `actions/*` için `If-Match` zorunludur (`duplicate` hariç). |

**Saklama ile API arasındaki çeviri** (ADR-020):

- Değerler veritabanında alan UUID'siyle saklanır. API'de anahtarlarla gelir ve gider.
- Grup değeri `{ altAnahtar: değer }` biçimindedir.
- Tekrarlanan satır `{ id, ...altAnahtarlar }` biçimindedir.
- Blok `{ id, type, ...altAnahtarlar }` biçimindedir.
- Satır ve blok `id` değeri istemcide üretilen UUID'dir; kararlıdır ve sıralamada korunur.
- Referans çeviri fonksiyonları `@wmp/schema` paketindeki `toApiValues` ve `fromApiValues`'dur.

## 3. Liste

`GET …/entries`

| Parametre | Kural |
|---|---|
| `locale` | Başlık ve kolon değerlerinin dili; sitenin dillerinden biri. Varsayılan: sitenin varsayılan dili. Bilinmeyen dil → `400`. |
| `q` | Aranabilir (`searchable`) alanlarda ve başlık alanında `tr-TR` küçük harf "içerir" araması (≤ 200 karakter) |
| `status` | `PUBLISHED` (yayında) · `DRAFT` (hiç yayında değil) · `UNPUBLISHED_CHANGES` |
| `trashed=true` | Yalnız çöpteki kayıtlar |
| `filter.<anahtar>=<değer>` | Yalnız `filterable` alanlar; eşitlik (çoklu değerli alanda "içerir"). `boolean` için `true`/`false`. En çok 20 süzgeç. Süzülemeyen alan → `400 MALFORMED_REQUEST`. |
| `sort=<alan>:<asc\|desc>` | `position`, `updatedAt`, `createdAt` veya `sortable` alan. Varsayılan: şemanın `ui.list.sort` ilk maddesi. Eşitlikte `id` ile kararlı sıra. |
| `page`, `size`, `includeTotal` | [00-conventions.md](00-conventions.md) §9 |

**Yanıt:**

```json
{ "items": [ kayıt özeti ], "page": 1, "size": 20, "total": 4, "hasNext": false, "listVersion": "cc4989ed5be3cba6" }
```

- **`listVersion`:** Kök düzeydeki kardeşlerin (kimlik, konum) özetidir. Yalnız `position` sıralamasında döner. `reorder` bu değeri ister.
- **Ağaç modülü** (`kind: tree`):
  - Çöp görünümü dışında bütün kayıtlar sayfalamasız döner. En çok 500 kayıt; aşılırsa `409 CONFLICT`.
  - Hiyerarşi istemcide `parentId` ile kurulur.
  - Büyük ağaçlar için düzey bazlı yükleme Aşama 8'de değerlendirilecek.

## 4. Oluşturma

`POST …/entries` — `Idempotency-Key` zorunludur.

```json
{ "values": { "fullName": "Can Er", "title": { "tr": "Analist" }, "expertise": ["finans"] }, "parentId": null }
```

Sırasıyla yapılanlar:

1. Bilinmeyen, arşivli veya gizli değer anahtarı reddedilir: `422 UNKNOWN_FIELD`, hesaplanan alan için `READ_ONLY`.
2. Alan yazma yetkisi denetlenir (§1).
3. Gönderilmeyen ve varsayılan değeri olan alanlar varsayılanla doldurulur.
4. `parentId` yalnız ağaç modülde kabul edilir. Üst kayıt aynı modülde ve çöpte olmayan bir kayıt olmalı.
5. Değerler **kayıt kipinde** doğrulanır (`mode: save`):
   - Biçim ve sınırlar denetlenir.
   - Yalnız `requiredOn: "save"` alanlar zorunludur.
   - Koşulu sağlanmayan alanın zorunluluğu atlanır.
6. Benzersizlik denetlenir: çöpte olmayan diğer kayıtlarla, normalize edilmiş değer üzerinden (kırpılmış, `tr-TR` küçük harf). `unique: locale` alanlarda her dil ayrı denetlenir. Çakışmada `422 NOT_UNIQUE` döner.
7. Medya referansları denetlenir ([07-media.md](07-media.md) §7): dosya aynı sitede ve kullanılabilir olmalı, alanın türüne, biçimine ve boyut sınırına uymalı. Yayında ayrıca dosya `ready` olmalı ve görselin alt metni (`altRequiredOnPublish`) bulunmalı.
8. İlişki denetlenir: hedef kayıt aynı sitede, alanın `targetModule` modülünde ve çöpte olmayan bir kayıt olmalı. Değilse `422 INVALID_REFERENCE`. Kayıt kendine bağlanamaz.
9. Kapasite denetlenir:
   - Tek kayıtlı modülde ikinci kayıt `409 SINGLETON_EXISTS` döner (AT-07).
   - `behavior.maxEntries` aşılırsa `409 ENTRY_LIMIT` döner.
10. Kayıt `DRAFT` olarak ve ilk revizyonuyla (`source.type: create`) oluşur. `position` kardeşlerin sonuna eklenir (+1024).

**Yanıt:** `201` ve kayıt ayrıntısı. **Audit:** `entry.created`.

## 5. Değiştirme

`PATCH …/entries/{entryId}` — `If-Match` zorunlu (şartname §15):

```json
{ "set": { "title": "Analyst" }, "unset": ["nickname"], "locale": "en" }
```

- **`set`:** Anahtar → yeni değer. Diziler ve iç içe gruplar **bütün olarak** değişir. `null` açık bir değerdir ve alanı boşaltır.
- **`unset`:** Alanları tamamen kaldırır. `null`'dan farklıdır.
- **`locale` verilirse:** Dile bağlı alanlarda `set` değeri **o dilin iç değeridir**. Yalnız o dil yazılır veya silinir; diğer diller korunur (şartname §25.4). Ortak alanlar dilden bağımsız yazılır.
- **`locale` verilmezse:** Dile bağlı alanın değeri `{ dil: değer }` haritasıdır ve bütün olarak değişir.
- Doğrulama ve kurallar oluşturmayla aynıdır; benzersizlikte kaydın kendisi hariç tutulur.
- Değer değiştiyse yeni bir revizyon yazılır (`source.type: edit`). Değer değişmediyse revizyon, sürüm ve audit oluşmaz.
- Çöpteki kayıt düzenlenemez (`409 INVALID_STATE_TRANSITION`).
- Yayındaki kayıt değişince `DRAFT` olur, `isPublished: true` kalır ve `hasUnpublishedChanges: true` olur. Yayın kopyası, kayıt yeniden yayınlanana kadar değişmez (AT-15).
- **Eşzamanlılık:** İki kullanıcı aynı sürüme yazarsa ikincisi `412 PRECONDITION_FAILED` alır. Panel sessizce üzerine yazmaz; güncel kaydı yükletip kullanıcıya yeniden uygulatır.
- **Audit:** `entry.updated`. Metadata yalnız değişen alan anahtarlarını ve dili içerir: `{ fields, locale }`.

## 6. İşlemler

| İşlem | Kural | Hata |
|---|---|---|
| `publish` | İş akışı kuralı ve **yayın kipinde** doğrulama ([08-publishing.md](08-publishing.md) §4). Geçerse taslak revizyondan değişmez yayın kopyası yazılır ve durum `PUBLISHED` olur. | `422 VALIDATION_FAILED`; `409 APPROVAL_REQUIRED`; çöpteki kayıt `409` |
| `unpublish` | Yayın işaretçisi temizlenir; kopyalar geçmişte kalır | Yayında değilse `409 INVALID_STATE_TRANSITION`; yayındaki başka kayıt bağlıysa `409 DEPENDENCY_CONFLICT` |
| `submit` · `approve` · `request-changes` · `schedule` · `cancel-schedule` | [08-publishing.md](08-publishing.md) §3–§4 | |
| `duplicate` | `Idempotency-Key` zorunlu. Geçmiş, yayın kopyası ve planlar taşınmaz. Değerler kopyalanır; **benzersiz alanlar kopyaya taşınmaz**. Kopya `DRAFT` olur ve kaynağın hemen arkasına yerleşir; boşluk biterse kardeşler yeniden numaralanır. | `behavior.allowDuplicate=false` veya çöpteki kaynak `409`; kapasite `SINGLETON_EXISTS` / `ENTRY_LIMIT` |
| `trash` | `deletedAt` yazılır, yayından kalkar, bekleyen planlar iptal edilir | Alt kaydı varsa `409 HAS_CHILDREN`. Başka bir kayıt bu kayda ilişki veriyorsa `409 DEPENDENCY_CONFLICT` (şartname §14: yayınlanmış ilişkiler RESTRICT). Zaten çöpteyse `409`. |
| `restore` | Çöpten çıkar ve kardeşlerin sonuna eklenir. Üst kayıt çöpteyse köke taşınır. Benzersizlik ve kapasite yeniden denetlenir. | `422 NOT_UNIQUE`, `409 SINGLETON_EXISTS` |
| `move` | Gövde: `{ parentId, afterId }`. `afterId: null` ise ilk sıraya yerleşir. Ağaçta üst kayıt değişebilir; döngü yasaktır. Hedef düzey yeniden numaralanır (+1024). | `422` `parentId` `TREE_CYCLE` / `INVALID_REFERENCE`; `afterId` bulunamazsa `422`; `allowReorder=false` → `409` |

Bütün işlemler kayıt ayrıntısını döner. Audit: `entry.<işlem>`.

## 7. Sıralama ve toplu işlem

**`POST …/reorder`**

```json
{ "parentId": null, "orderedIds": ["uuid", "uuid"], "listVersion": "cc4989ed5be3cba6" }
```

- `orderedIds` o düzeydeki **bütün** çöpte olmayan kardeşleri birer kez içermelidir (`422`).
- `listVersion` güncel değilse `409 LIST_VERSION_MISMATCH` döner. Bu durumda başka biri sıralamayı değiştirmiştir; istemci listeyi yeniler (şartname §14: "reorder uses expected list version").
- Konumlar yeniden numaralanır (1024'ün katları).
- Yanıt: `{ "listVersion": "…" }`. Audit: `entry.reordered`.
- `behavior.allowReorder=false` ise `409 CONFLICT` döner.

Panelde sıralama düğmeleri yalnız varsayılan (konum) sırasında, süzgeçsiz ve bütün kayıtlar tek sayfadayken gösterilir.

**`POST …/bulk`**

```json
{ "action": "publish", "ids": ["uuid", "uuid"] }
```

- `action` şunlardan biridir: `publish`, `unpublish`, `trash`, `restore`. `ids` 1–100 arası tekrarsız kimliktir.
- Kayıtlar tek tek işlenir; birinin hatası diğerlerini engellemez. Hata veren kaydın değişikliği geri alınır.
- Yanıt `200`:

  ```json
  { "results": [ { "id": "uuid", "ok": true }, { "id": "uuid", "ok": false, "code": "VALIDATION_FAILED", "message": "…" } ] }
  ```

- İzin işlemin iznidir: yayın için `entry.publish`, çöp için `entry.delete`, geri alma için `entry.restore`. İzin yoksa istek bütünüyle `403` döner.

## 8. Hata kodları

| HTTP | Kod | Ne zaman |
|---|---|---|
| 403 | `FIELD_WRITE_DENIED` | Salt okunur alan veya rolün yazamadığı alan |
| 409 | `SINGLETON_EXISTS` · `ENTRY_LIMIT` | Kapasite |
| 409 | `HAS_CHILDREN` · `DEPENDENCY_CONFLICT` | Çöpe taşıma engeli |
| 409 | `LIST_VERSION_MISMATCH` | Sıralama yarışı |
| 409 | `INVALID_STATE_TRANSITION` · `CONFLICT` | Durumla uyuşmayan işlem; kapalı davranış (kopyalama/sıralama) |
| 412 · 428 | `PRECONDITION_FAILED` · `PRECONDITION_REQUIRED` | Eski veya eksik `If-Match` |
| 422 | `VALIDATION_FAILED` | `errors[].path` = `values.<anahtar>[.<dil>]`, `set.<anahtar>`, `unset.<anahtar>`, `parentId`, `afterId`. Alan kodları: `REQUIRED`, `INVALID_VALUE`, `UNKNOWN_FIELD`, `UNKNOWN_LOCALE`, `READ_ONLY`, `NOT_UNIQUE`, `INVALID_REFERENCE`, `TREE_CYCLE` |

## 9. Panel davranışı (şartname §12)

- **Menü:** "İçerik" grubu bootstrap'taki modüllerden üretilir; müşteri teknik terim görmez.
- **Tek kayıtlı modül:** Liste yerine form doğrudan açılır. Kayıt yoksa ilk kayıt oluşturulur.
- **Form:**
  - Şemanın grupları ve iki kolon düzeni kullanılır.
  - Koşulu sağlanmayan ve gizli alanlar gösterilmez.
  - Dile bağlı alanlar seçili dilde düzenlenir; ortak alanlar "bütün dillerde ortak" olarak işaretlidir.
  - Doğrulama aynı şema paketiyle istemcide de yapılır. Hatalı ilk alana odaklanılır ve gerekirse o dile geçilir.
- **Zengin metin:** TipTap düzenleyicisinin JSON biçimi şemadaki biçimle aynıdır. Araç çubuğu alanın izinli öğeleriyle sınırlıdır (ADR-028).
- **Medya alanları:** Kütüphaneden seçim ve yerinde yükleme; referansa özel alt metin ve açıklama ([07-media.md](07-media.md) §9).
- **Çeviri:** Dil seçicide her dil için eksik çeviri sayısı görünür (kaynak dilde dolu, o dilde boş, görünür ve dile bağlı alanlar). Kaynak dil dışındaki dilde, dile bağlı alanın altında kaynak dildeki değer ve "kaynaktan kopyala" düğmesi bulunur. Sağdan sola dillerde (ar, he, fa, ur) dile bağlı alanlar `dir="rtl"` ile düzenlenir; ortak alanlar soldan sağa kalır.
- **Kaydetme:** Yalnız değişen anahtarlar `set`/`unset` olarak gönderilir.

## 10. Veri modeli

[09-data-model.md](09-data-model.md) "Aşama 3": `entries` ve `entry_unique_values`.

## Değişiklik geçmişi

| Tarih | Değişiklik |
|---|---|
| 17 Kas 2026 | İlk sürüm (Aşama 3): kayıt listesi, oluşturma, PATCH semantiği, yayın/yayından kaldırma, kopya, çöp kutusu, ağaç taşıma, sıralama, toplu işlem, alan düzeyinde yazma yetkisi. |
| 17 Kas 2026 | Aşama 4: medya referansı denetimi ve çeviri deneyimi. |
| 17 Kas 2026 | Aşama 5: durum modeli (`isPublished`, iş akışı durumları), revizyon üretimi, yeni süzgeçler, yayın/kaldırma kuralları 08-publishing'e bağlandı. |
| 18 Kas 2026 | Sade yetki modeli (ADR-056): inceleme durumları ve rol bazlı alan kısıtı kaldırıldı. |
