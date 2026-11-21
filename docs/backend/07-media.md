# 07 — Medya ve dosya yönetimi (`media`)

Şartname §8, §8.1, §8.2 ve §25.6. Medya kütüphanesi **site kapsamlıdır**. Bir sitenin dosyası başka bir sitede kullanılamaz ve görünmez; tekilleştirme de yalnız site içinde yapılır.

| Yöntem | Yol | Amaç | İzin (sitede) |
|---|---|---|---|
| GET | `/api/v1/customer/sites/{siteId}/assets` | Kütüphane listesi ve depolama kullanımı | `asset.read` |
| POST | `/api/v1/customer/sites/{siteId}/assets/uploads` | Yükleme niyeti (tür, boyut, kota) | `asset.upload` |
| PUT | `{uploadUrl}` | Dosya baytları (mock: `…/assets/uploads/{uploadId}/content`) | `asset.upload` |
| POST | `/api/v1/customer/sites/{siteId}/assets/uploads/{uploadId}/finalize` | Doğrulama, tarama, kayıt | `asset.upload` |
| GET | `/api/v1/customer/sites/{siteId}/assets/{assetId}` | Dosya ayrıntısı | `asset.read` |
| PATCH | `/api/v1/customer/sites/{siteId}/assets/{assetId}` | Başlık, alt metin, açıklama, dekoratif, odak noktası, klasör, etiket | `asset.upload` |
| DELETE | `/api/v1/customer/sites/{siteId}/assets/{assetId}` | Silme (kullanılmıyorsa arşiv) | `asset.delete` |
| GET | `/api/v1/customer/sites/{siteId}/assets/{assetId}/usages` | Kullanıldığı kayıtlar | `asset.read` |
| GET | `/api/v1/customer/sites/{siteId}/assets/{assetId}/content` | Yönetici önizleme ve indirme | `asset.read` |
| POST | `/api/v1/customer/sites/{siteId}/assets/bulk` | Toplu taşıma ve silme **[ÖNERİ]** | `asset.upload` / `asset.delete` |
| GET · POST | `/api/v1/customer/sites/{siteId}/asset-folders` | Klasörler | `asset.read` / `asset.upload` |
| PATCH · DELETE | `/api/v1/customer/sites/{siteId}/asset-folders/{folderId}` | Klasör adı / boş klasörü silme | `asset.upload` / `asset.delete` |

**Durum:**

- Bütün uçlar backend'de uygulanmıştır (`customer-api`; depo S3 uyumlu, canlıda Cloudflare R2, yerelde SeaweedFS). `uploadUrl` nesne deposunun imzalı adresidir; panel oraya çerez ve CSRF başlığı göndermez.
- Klasör uçları şartname §15 tablosunda değil, §14 `asset_folders` tablosunda geçer. Toplu işlem §8 "bulk move" gereğidir. Gerekçe: ADR-033.
- Yayın tarafındaki medya ucu (`GET /delivery/sites/{publicKey}/assets/{assetId}/{variant}`) ve önizleme medyası [11-delivery.md](11-delivery.md) §8–§9'dadır.

---

## 1. Dosya kaydı

```json
{
  "id": "uuid",
  "folderId": "uuid | null",
  "fileName": "deniz-arslan.png",
  "title": "deniz-arslan",
  "kind": "image",
  "format": "png",
  "mimeType": "image/png",
  "size": 1720,
  "width": 480,
  "height": 480,
  "status": "ready",
  "rejectReason": null,
  "alt": { "tr": "Deniz Arslan" },
  "caption": {},
  "decorative": false,
  "focalPoint": { "x": 0.5, "y": 0.5 },
  "tags": ["ekip"],
  "variants": [ { "name": "thumb", "width": 320, "url": "…/content?variant=thumb" }, { "name": "w320", "width": 320, "url": "…" } ],
  "url": "/api/v1/customer/sites/{siteId}/assets/{id}/content",
  "createdAt": "…",
  "createdBy": { "realm": "customer", "id": "uuid", "displayName": "Selin Kaya" },
  "updatedAt": "…",
  "version": "\"1\""
}
```

| Alan | Kural |
|---|---|
| `fileName` | Yalnız görünen addır. Nesne deposundaki anahtar rastgele UUID'dir ve dış dünyaya verilmez (şartname §8). |
| `kind` / `format` | Dosyanın **gerçek** içeriğinden (magic bytes) belirlenir. İstemcinin bildirdiği MIME'a güvenilmez. |
| `status` | `processing` · `ready` · `rejected` · `archived`. Ara durumlar (`pending`, `uploading`, `quarantined`) yükleme oturumundadır (§2). |
| `rejectReason` | `{ code, message }`. Kodlar §2'deki tabloda. |
| `alt`, `caption` | Dile göre; yalnız sitenin dilleri. Alt metin en çok 300, açıklama en çok 500 karakter. |
| `decorative` | Dekoratif görsel. Alt metin gerekmez (şartname §25.6). |
| `focalPoint` | 0–1 aralığında `x`, `y`. Kırpılan görünümlerde önemli bölge. |
| `variants` | Yalnız `ready` görsellerde. Adlar: `thumb`, `w320`, `w640`, `w1280`, `w1920`. Orijinalden büyük genişlik üretilmez. |
| `url` | Yalnız `ready` dosyada dolu. Yönetici oturumu ister; yayın adresi değildir. |

## 2. Yükleme hattı

Şartname §8.1. Üç adımdan oluşur.

### 2.1 Niyet

`POST …/assets/uploads` — `Idempotency-Key` zorunludur.

```json
{ "fileName": "rapor.pdf", "size": 482113, "mimeType": "application/pdf", "folderId": null }
```

Denetimler:

| Denetim | Hata |
|---|---|
| Dosya adı 1–200 karakter; yol ayıracı ve kontrol karakteri içermez | `422 fileName INVALID` |
| Uzantı izinli biçimlerden birine karşılık gelmeli (§3) | `422 fileName FORMAT_NOT_ALLOWED` |
| Bildirilen boyut, türün sınırını aşmamalı (§3) | `413 PAYLOAD_TOO_LARGE` |
| Sitenin depolama kotası (varsayılan 10 GiB; bekleyen yüklemeler dahil) | `409 QUOTA_EXCEEDED` |
| Klasör aynı sitede olmalı | `422 folderId INVALID_REFERENCE` |

**Yanıt:** `201`

```json
{ "uploadId": "uuid", "method": "PUT", "uploadUrl": "…", "maxBytes": 15728640, "expiresAt": "…" }
```

**Gerçek backend:**

- `uploadUrl`, özel (private) **karantina** önekine kısa ömürlü imzalı nesne deposu adresidir.
- Büyük dosyada çok parçalı yükleme kullanılır.
- Tamamlanmayan yüklemeler temizlenir.
- Mock aynı sözleşmeyi kendi `PUT …/content` ucuyla canlandırır.

Kullanıcı başına eşzamanlı yükleme sınırı 3'tür; panel kuyrukla uygular (şartname §8.2).

### 2.2 Baytlar

`PUT {uploadUrl}`

- Gövde ham bayttır (`application/octet-stream`).
- Bayt sayısı bildirilen boyuttan farklıysa `422 SIZE_MISMATCH`.
- Süresi dolmuş oturum `410 UPLOAD_EXPIRED` döner.
- Oturum yalnız onu açan kullanıcıya aittir; başkası için `404`.

### 2.3 Tamamlama

`POST …/uploads/{uploadId}/finalize`

Sunucunun yaptıkları, sırasıyla:

1. Gerçek bayt sayısını ve SHA-256 özetini hesaplar.
2. **Tekilleştirme:** Aynı sitede aynı özetli kullanılabilir dosya varsa yeni kayıt oluşmaz. Mevcut dosya `deduplicated: true` ile döner. Siteler ve tenant'lar arasında tekilleştirme yapılmaz; bilgi sızmaz.
3. **Tür tespiti** (magic bytes) ve kurallar:

| Kod | Ne zaman |
|---|---|
| `MIME_MISMATCH` | İçerik, uzantının tür ailesine uymuyor (ör. `.jpg` uzantılı PDF) |
| `FORMAT_NOT_ALLOWED` | GIF, SVG, HTML/betik, çalıştırılabilir dosya, genel ZIP, tanınmayan tür |
| `MACRO_NOT_ALLOWED` | Makro içeren ofis belgesi (`vbaProject.bin`) |
| `MALWARE_DETECTED` | Virüs taraması pozitif (mock: EICAR test imzası) |
| `PAYLOAD_TOO_LARGE` | Gerçek boyut tür sınırını aşıyor |
| `DECODE_FAILED` · `IMAGE_TOO_LARGE` | Görsel okunamıyor · 40 megapikselden büyük |
| `EMPTY_FILE` | Boş dosya |

4. Reddedilen dosya `status: rejected` ve `rejectReason` ile kayda geçer. Baytları hemen silinir; kullanıcı gerekçeyi kütüphanedeki "Reddedilen" süzgecinde görür. Kabul edilen dosya `status: processing` ile kalıcı alana taşınır.
5. **İşleme (worker)**, sonuçta `ready` olur:
   - **Görsel:** EXIF/GPS silinir, yön düzeltilir, varyantlar ve küçük resim üretilir, boyutlar kaydedilir.
   - **Video:** MP4 H.264/AAC normalizasyonu, poster, süre ve çözünürlük.
   - **Ses:** Normalizasyon ve süre.
   - **Belge:** OOXML yapı ve sıkıştırma oranı denetimi.
   - **Altyapı:** İşler idempotent, kiralamalı (lease) ve yeniden denemelidir (DLQ). Tarama servisi yoksa üretimde **fail closed** çalışır: dosya karantinada kalır.
   - **Mock:** İşlemeyi süreyle canlandırır (görsel ~1,5 sn, video ~4 sn). Boyutu dosya başlığından okur. Varyantlar orijinal baytı sunar (ADR-034).

**Yanıt:** `201` ve dosya kaydı. Aynı oturumla tekrar çağrılırsa aynı kayıt döner.

Audit: `asset.uploaded`, `asset.rejected` (`metadata.reason`).

## 3. İzinli biçimler ve sınırlar

Şartname §25.6 başlangıç listesi ve §8.2 sınırları. Sınırlar sunucuda zorunludur ve ortam ayarıyla değiştirilebilir.

| Tür | Biçimler | En büyük boyut |
|---|---|---|
| Görsel | JPEG, PNG, WebP (≤ 40 MP) | 15 MiB |
| Video | MP4, MOV, WebM (MP4'e normalize) | 500 MiB, 30 dk |
| Ses | MP3, WAV, M4A | 100 MiB |
| Belge | PDF, DOCX, XLSX, PPTX (makrosuz, doğrulanmış OOXML) | 50 MiB |
| Altyazı | WebVTT | 1 MiB |

GIF, SVG ve ZIP varsayılan olarak kapalıdır.

Mock bütün dosyayı bellekte tuttuğu için en büyük dosya 100 MiB'dir; gerçek sınır yukarıdaki tablodur.

## 4. Liste

`GET …/assets`

| Parametre | Kural |
|---|---|
| `q` | Dosya adı, başlık, alt metin ve etiketlerde `tr-TR` küçük harf "içerir" araması |
| `kind` | `image`, `video`, `audio`, `document`, `subtitle` |
| `status` | `processing`, `ready`, `rejected`, `archived`. **Varsayılan:** kullanılabilir dosyalar (`processing` + `ready`). |
| `folderId` | Klasör kimliği veya `root` (klasörsüz) |
| `tag` | Etikete göre |
| `page`, `size`, `includeTotal` | Varsayılan `size` 40 |

Sıralama yeniden eskiye, eşitlikte `id`.

**Yanıt:**

```json
{ "items": [ … ], "page": 1, "size": 40, "total": 7, "hasNext": false, "usage": { "bytes": 12277, "quotaBytes": 10737418240 } }
```

Panel, `processing` dosya varken listeyi ve ayrıntıyı ~1,5 sn aralıkla yeniler.

## 5. Üst bilgi, silme, klasörler

**`PATCH …/assets/{assetId}`** — `If-Match` zorunlu.

- Gövde: `{ title?, alt?, caption?, decorative?, focalPoint?, folderId?, tags? }`. Etiketler en çok 20 adettir, her biri 1–40 karakter.
- Reddedilen veya arşivdeki dosya düzenlenemez (`409`).
- **Yayındaki kayıt değişmez** (şartname §25.6, AT-55). Kayıttaki medya referansı kendi alt metnini ve açıklamasını taşır; yayın kopyası yeniden yayınlanana kadar eski değerleri kullanır.
- Klasör değişikliği dosya kimliğini ve adresini bozmaz.
- Audit: `asset.updated` (`metadata.fields`).

**`DELETE …/assets/{assetId}`** — `If-Match` zorunlu.

- Dosya herhangi bir kaydın taslağında veya yayın kopyasında kullanılıyorsa `409 ASSET_IN_USE` döner. `errors` alanı kullanım yerlerini listeler (şartname §8.2).
- Kullanılmıyorsa `archived` olur ve listeden kalkar.
- Fiziksel silme, saklama süresi ve geri alma (rollback) penceresi dolunca sistem işidir.
- Audit: `asset.archived`.

**`GET …/assets/{assetId}/usages`** — yanıt:

```json
{ "items": [ { "entryId": "uuid", "module": { "key": "ekip", "label": { "tr": "Ekibimiz" } }, "status": "published", "published": true } ] }
```

**`POST …/assets/bulk`**

- Gövde: `{ action: "move" | "archive", ids: [1–100], folderId? }`.
- Her dosya için ayrı sonuç döner; kullanılan dosya `ASSET_IN_USE` ile atlanır.

**Klasörler:**

- Tek düzeylidir. Ad 1–80 karakterdir ve sitede benzersizdir (`NOT_UNIQUE`). Sitede en çok 200 klasör olabilir.
- Dolu klasör silinemez (`409 FOLDER_NOT_EMPTY`).
- Liste her klasörün kullanılabilir dosya sayısını (`assetCount`) taşır.

## 6. İçerik sunumu (yönetici)

`GET …/assets/{assetId}/content?variant=original|thumb|w320|w640|w1280|w1920&download=1`

- Yalnız `ready` dosya sunulur. Karantinadaki, işlenmekte olan, reddedilen veya arşivdeki dosya için `404` döner (şartname §8.1: taslak ve karantina erişilemez).
- Başlıklar:
  - `Content-Type`: kayıttaki gerçek MIME
  - `Content-Length`
  - `X-Content-Type-Options: nosniff`
  - `Content-Disposition`: `inline`; belgelerde ve `download=1` iken `attachment`. `filename` ASCII'ye indirgenir, `filename*` UTF-8 olarak kodlanır.
  - `Cache-Control: private, max-age=300`
  - `ETag`
- Ofis belgeleri hiçbir zaman satır içi HTML olarak çalıştırılmaz.
- Range/HEAD (`206`/`416`) desteği yayın ucunda zorunludur ve mock'ta uygulanmıştır ([11-delivery.md](11-delivery.md) §8, AT-54). Yönetici ucu tam içerik döner.
- **Gerçek backend:** Bu uç kısa ömürlü imzalı URL'ye yönlendirebilir (`302`). İmzalı URL yalnız yetkili yöneticiye ve kısa süreyle verilir (AT-14).

## 7. Kayıtlarda medya referansı

Medya alanlarının değeri ([05-schema.md](05-schema.md) §4):

- Tek dosya: `{ assetId, alt?, caption?, focalPoint?, crop? }`.
- Liste: `[{ id: satır uuid, assetId, … }]`.

Alt metin ve açıklama **referans bazındadır**. Boş bırakılırsa dosyanın kütüphanedeki değeri kullanılır.

Kayıt yazımında ([06-content.md](06-content.md)) denetlenenler:

| Kural | Hata (`errors[].code`) |
|---|---|
| Dosya aynı sitede ve `archived`/`rejected` değil | `INVALID_REFERENCE` |
| Dosyanın türü alana uygun: görsel/galeri → `image`; video → `video`; ses → `audio`; belge/dosya → `document`; karma galeri → `allowedKinds`. Biçim alanın `allowedFormats` listesinde. | `INVALID_VALUE` |
| Dosya boyutu alanın `maxSizeMb` ayarını aşmıyor | `INVALID_VALUE` |
| **Yalnız yayında:** dosya `ready` | `ASSET_NOT_READY` |
| **Yalnız yayında:** görsel, alanın `altRequiredOnPublish` ayarı açıksa ve dosya dekoratif değilse referansta veya kütüphanede o dilin alt metnini taşımalı | `ALT_REQUIRED` |

Kullanım yerleri, kayıtların taslak değerleri ve yayın kopyaları taranarak bulunur. Gerçek backend bunu `asset_references` tablosundan okur ([09-data-model.md](09-data-model.md)).

## 8. Hata kodları

| HTTP | Kod | Ne zaman |
|---|---|---|
| 409 | `ASSET_IN_USE` | Kullanılan dosyayı silme |
| 409 | `FOLDER_NOT_EMPTY` | Dolu klasörü silme |
| 409 | `QUOTA_EXCEEDED` | Depolama veya klasör sınırı |
| 410 | `UPLOAD_EXPIRED` | Yükleme oturumunun süresi doldu (15 dk) |
| 413 | `PAYLOAD_TOO_LARGE` | Tür sınırı veya istek gövdesi |
| 422 | `VALIDATION_FAILED` | Alan kodları: `FORMAT_NOT_ALLOWED`, `SIZE_MISMATCH`, `INVALID_REFERENCE`, `NOT_UNIQUE`, `INVALID` |

## 9. Panel davranışı

- **Medya kütüphanesi:**
  - Depolama kullanımı gösterilir.
  - Sürükle bırak veya dosya seçiciyle yüklenir. Kuyruk en çok 3 eşzamanlı yükleme çalıştırır; ilerleme, denetim adımı, ret gerekçesi ve yeniden deneme gösterilir (AT-59).
  - Süzgeçler: tür, durum (kullanılabilir/işleniyor/reddedilen), klasör. Arama yapılabilir.
  - Toplu taşıma ve silme yapılabilir.
  - Ayrıntı çekmecesinde önizleme bulunur (görselde odak noktası tıklama ve ok tuşlarıyla seçilir). Ayrıca dile göre alt metin ve açıklama, klasör, etiket, kullanım yerleri, indirme ve silme vardır. Arapça gibi sağdan sola dillerde alanlar sağdan soladır.
- **Kayıt formundaki medya alanı:**
  - Önizleme, referansa özel alt metin ve açıklama, galeride klavyeyle sıralama, kaldırma yapılabilir.
  - Seçici yalnız alanın kabul ettiği türleri seçtirir ve uymayanları gerekçesiyle pasif gösterir.
  - Seçici içinden yükleme yapılabilir; yüklenen dosya kendiliğinden seçilir.
  - İşlenmekte olan dosya "İşleniyor" etiketiyle gösterilir; yayın bitene kadar beklenir.

## 10. Veri modeli

[09-data-model.md](09-data-model.md) "Aşama 4": `assets`, `asset_folders`, `upload_sessions`, `asset_variants`, `asset_references`.

## Değişiklik geçmişi

| Tarih | Değişiklik |
|---|---|
| 17 Kas 2026 | İlk sürüm (Aşama 4): kütüphane, yükleme niyeti/bayt/tamamlama, tür tespiti ve ret kodları, tekilleştirme, işleme durumları, üst bilgi, kullanım yerleri ve silme engeli, klasörler, toplu işlem, yönetici içerik sunumu, kayıtta medya referansı kuralları. |
