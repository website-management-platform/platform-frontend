# 12 — Site entegrasyonu: erişim, alan adları, API anahtarları, webhook, frontend manifest'i (`integrations`)

Şartname §15, §16, §25.5, §25.8. Bir sitenin frontend'iyle bağlantısı platform yöneticisi tarafından kurulur. Müşteri bu ayarları görmez.

Bütün uçlar platform realm'indedir (oturum + CSRF). Okuma `platform.site.read`, değişiklik `platform.site.manage` izni ister. Arşivli sitede değişiklik `409 INVALID_STATE_TRANSITION` döner.

| Yöntem | Yol (`/api/v1/platform/sites/{siteId}` altında) | Amaç |
|---|---|---|
| GET · PATCH | `/integration` | Erişim ayarları ve sayaçlar |
| GET · POST | `/domains` | Alan adları |
| POST | `/domains/{domainId}/verify` | DNS doğrulaması |
| PATCH · DELETE | `/domains/{domainId}` | Birincil yap / kaldır |
| GET · POST | `/credentials` | API anahtarları |
| POST | `/credentials/{credentialId}/rotate` · `/revoke` | Yenile / iptal |
| GET · POST | `/webhooks` | Webhook uç noktaları |
| PATCH · DELETE | `/webhooks/{webhookId}` | Güncelle / sil |
| POST | `/webhooks/{webhookId}/rotate` · `/test` | İmza sırrını yenile / deneme olayı |
| GET | `/webhooks/{webhookId}/deliveries?status=` | Teslim geçmişi (son 100) |
| POST | `/webhooks/{webhookId}/deliveries/{deliveryId}/retry` | Elle yeniden dene |
| GET · POST | `/manifests` | Manifest sürümleri / kayıt |
| GET | `/manifests/{manifestId}` | Manifest + uyumluluk raporu |
| POST | `/manifests/{manifestId}/activate` | Etkinleştir |
| POST | `/api/v1/integration/sites/{publicKey}/manifests` | CI'dan manifest kaydı (`manifest:write` anahtarı, oturumsuz) |

Oluşturma uçlarında (`domains`, `credentials`, `webhooks`) `Idempotency-Key` zorunludur ([00-conventions.md](00-conventions.md) §7). Yeniden oynatılan yanıt `Idempotent-Replayed: true` taşır.

**Durum:** Bütün uçlar backend'de uygulanmıştır (`platform-api` `com.wmp.platform.integrations`, ortak kurallar `core` `com.wmp.core.integrations`; backend ADR-0009). Webhook sırları AES-256-GCM ile şifreli saklanır, gönderici çözülen adresi denetleyip bağlantıyı ona sabitler. Panel ekranı: Platform → Site ayrıntısı → "Entegrasyon" sekmesi.

---

## 1. Erişim ayarları (`/integration`)

```json
{
  "publicKey": "pk_…",
  "deliveryAccess": "public",
  "allowedOrigins": ["https://www.ornek.com"],
  "redirectHosts": ["kampanya.ornek.com"],
  "localeFallback": "default",
  "allowStaleWhileRevalidate": false,
  "counts": { "domains": 2, "credentials": 1, "webhooks": 1, "manifests": 3 },
  "version": "…"
}
```

`PATCH` gövdesi bu beş alanın herhangi biri. `If-Match` zorunludur.

| Alan | Kural |
|---|---|
| `deliveryAccess` | `public` · `private` ([11-delivery.md](11-delivery.md) §1) |
| `allowedOrigins` | En çok 20. Her biri `https://ad[:port]`; `http` yalnız `localhost` ve `127.0.0.1`. Yol, sorgu, parça, kullanıcı bilgisi ve joker yok. Normalize edilir, tekrarlar atılır. |
| `redirectHosts` | En çok 50 alan adı (§2 normalizasyonu). Dış yönlendirme hedefleri için ([10-site-structure.md](10-site-structure.md) §5). |
| `localeFallback` | `default` · `none` ([11-delivery.md](11-delivery.md) §4) |
| `allowStaleWhileRevalidate` | `boolean` |

Liste hatası `422`, yol `allowedOrigins.<index>`. Değişen alanlar audit'e yazılır: `site.integrationUpdated`, `metadata.changed[]`.

## 2. Alan adları

| Kural | Ayrıntı |
|---|---|
| Normalizasyon | Küçük harf, IDNA (punycode: `çiçek.com` → `xn--iek-1lab.com`), sondaki nokta yok |
| Ret (`422`, `hostname` `INVALID`) | Joker (`*`), şema veya yol, IP adresi, tek etiket, `localhost`, `.local`, `.localhost`, `.internal`, `.lan`, `.home`, `.corp`; 253 karakteri veya 63 karakterlik etiketi aşan ad; `-` ile başlayan/biten etiket |
| Tekillik | Ad bütün platformda tektir: `409 DOMAIN_TAKEN`. Hangi kiracıya ait olduğu söylenmez. |
| Sınır | Site başına 20 (`409 QUOTA_EXCEEDED`) |

**Doğrulama (DNS TXT):** Eklenen ad `pending` durumunda bir görev alır:

```json
{ "type": "dns-txt", "name": "_wmp-challenge.www.ornek.com", "value": "wmp-verify=…", "expiresAt": "…(7 gün)" }
```

`POST …/verify`:

| Sonuç | Durum | `failure.code` |
|---|---|---|
| TXT kaydı bulundu | `verified`, görev gizlenir | — |
| Kayıt yok | `failed` | `RECORD_NOT_FOUND` |
| Görevin süresi dolmuş | `failed`, yeni görev değeri üretilir | `CHALLENGE_EXPIRED` |

Doğrulama tekrar denenebilir. Doğrulanmış ad zaten doğrulanmışsa yanıt değişmez.

| İşlem | Kural |
|---|---|
| `PATCH { isPrimary: true }` | Yalnız doğrulanmış ad (`409 DOMAIN_NOT_VERIFIED`). Sitenin diğer adları birincil olmaktan çıkar; `sites.primary_domain` güncellenir. |
| `DELETE` | Birincil ad silinemez (`409 PRIMARY_DOMAIN`) |

Doğrulanmış adların `https://` kökenleri delivery CORS listesine kendiliğinden girer; dış yönlendirme hedefi ve manifest `previewUrl` olarak kullanılabilir.

**[Sözleşme]** Backend gerçek DNS sorgusu yapar ve doğrulanmış adları periyodik olarak yeniden denetler. Mock'ta DNS kayıtları `/__dev/dns` ile eklenir.

## 3. API anahtarları

| Kural | Ayrıntı |
|---|---|
| Biçim | `wmp_sk_` + 30 rastgele karakter |
| Saklama | Yalnız SHA-256 özeti. Ham anahtar **yalnız oluşturma ve yenileme yanıtında bir kez** döner (`secret`). Listede `prefix` (ilk 6 karakter) görünür. |
| Kapsam | `delivery:read` (özel modda okuma), `manifest:write` (CI'dan manifest kaydı). En az bir, tekrarsız. |
| Oluşturma | `{ name (2–60), scopes[], expiresInDays? (1–730) }`. Site başına en çok 10 etkin anahtar. |
| Yenileme | Yeni gizli anahtar üretilir. Eski anahtar **24 saat** daha geçerlidir (`previousValidUntil`); kesintisiz geçiş içindir. |
| İptal | Hemen geçersiz olur; örtüşen eski anahtar da düşer. İptal edilmiş anahtar yenilenemez (`409 INVALID_STATE_TRANSITION`). |
| Kullanım | `Authorization: Bearer wmp_sk_…`. Başarılı kullanımda `lastUsedAt` güncellenir. Süresi dolmuş veya kapsamı uymayan anahtar geçersizdir. |

Sunum: `{ id, name, prefix, scopes, status, expiresAt, lastUsedAt, previousValidUntil, createdBy, createdAt, rotatedAt, revokedAt }`. Liste yanıtı ayrıca `scopes` (seçilebilir kapsamlar) döner.

## 4. Webhook

### 4.1 Uç noktası

| Alan | Kural |
|---|---|
| `url` | `https`; kullanıcı bilgisi yok; port yalnız 443; `#` yok; alan adı §2 kurallarına uymalı (IP ve yerel ad reddedilir) |
| `events` | En az bir, tekrarsız; listedeki olaylardan |
| `description` | En çok 200 karakter |
| `status` | `active` · `disabled` (yalnız PATCH) |

- İmza sırrı `whsec_…` yalnız oluşturma ve yenileme yanıtında görünür; sunumda `secretHint` (son 4 karakter). **[Sözleşme]** Sır uygulama anahtarıyla şifreli saklanır (mock düz tutar).
- Site başına en çok 10 uç noktası.
- `PATCH` için `If-Match` zorunludur.
- Silme, bekleyen teslimleri `cancelled` yapar.

### 4.2 Olaylar

| Olay | Ne zaman |
|---|---|
| `content.published` · `content.unpublished` | İçerik modülünde kayıt yayını ve kaldırması (elle veya planlı) |
| `site.config.published` | Yapı modülünde (ayar, sayfa, menü, yönlendirme) yayın veya kaldırma; manifest etkinleştirme |
| `schema.published` | Modül şemasının yeni sürümü |
| `asset.ready` | Medya işleme tamamlandı (dosya başına bir kez) |

Yük (kişisel veri ve içerik değeri **yoktur**; alıcı güncel veriyi delivery'den okur):

```json
{ "eventId": "uuid", "type": "content.published", "siteKey": "pk_…", "locale": null, "entityId": "uuid", "moduleKey": "haberler", "revision": 4, "releaseVersion": 43, "occurredAt": "…" }
```

### 4.3 Teslim

| Kural | Ayrıntı |
|---|---|
| Outbox | Olay ve teslim kayıtları **yayınla aynı transaction'da** yazılır. Gönderim ayrı worker'dadır; teslim hatası yayını geri almaz. |
| Başlıklar | `Content-Type: application/json`, `X-WMP-Event-Id`, `X-WMP-Event-Type`, `X-WMP-Timestamp` (Unix saniye), `X-WMP-Signature` |
| İmza | `v1=` + hex(HMAC-SHA256(sır, `"{timestamp}.{gövde}"`)). Sır yenilenmişse 24 saat boyunca eski sırla da imzalanır; başlıkta virgülle iki imza bulunur. |
| Alıcı doğrulaması | Alıcı imzayı sabit zamanlı karşılaştırır, zaman damgası ±300 saniyeden eskiyse reddeder (replay), `eventId` ile tekrarı ayıklar (en az bir kez teslim). |
| Başarı | 2xx yanıt (**[Sözleşme]** 10 saniye zaman aşımı, yönlendirme izlenmez) |
| Yeniden deneme | 1 dk → 5 dk → 30 dk → 2 sa → 12 sa. Altıncı başarısızlıkta `dead` (ölü mektup). |
| SSRF | Her denemede ad DNS'te çözülür. Özel, döngü, bağlantı-yerel, CGNAT, bulut metadata (`169.254.169.254`), `0.0.0.0/8`, IPv6 `::1`, `fc00::/7`, `fe80::/10` ve `::ffff:` eşlemeli adresler engellenir: `SSRF_BLOCKED`, istek gönderilmez. **[Sözleşme]** Bağlantı çözülen adrese sabitlenir (DNS rebinding). |
| Durumlar | `pending` · `delivered` · `dead` · `cancelled` |

Teslim sunumu: `{ id, type, eventId, status, attempts, nextAttemptAt, responses[] (son 10: at, ok, status, error, message), createdAt, deliveredAt, payload }`.

| İşlem | Kural |
|---|---|
| `test` | Yalnız bu uca `ping` olayı; `202 { deliveryId }` |
| `retry` | `dead` veya `cancelled` teslim yeniden kuyruğa alınır (deneme sayısı sıfırlanır). `pending`/`delivered` → `409 INVALID_STATE_TRANSITION`. |
| `rotate` | Yeni sır; eskisi 24 saat ikinci imza olarak gönderilir |

Mock ağa çıkmaz: mock DNS'te engelli adrese çözülen ad `SSRF_BLOCKED`, `fail` ile başlayan veya DNS kaydı olmayan ad (`.example.test` hariç) `CONNECTION_FAILED` verir; diğerleri başarılı sayılır ve imzalı istek `/__dev/webhook-inbox` kutusuna yazılır.

## 5. Frontend manifest'i

Her sitenin frontend'i ne çizebildiğini bildirir. Panel ve yayın doğrulaması bu bildirime göre çalışır ([10-site-structure.md](10-site-structure.md) §3).

```json
{
  "version": 1,
  "buildId": "hukuk-2026.11.1",
  "sections": [ { "key": "hero", "variants": ["split", "background"] }, { "key": "contentList", "variants": ["grid", "people"] } ],
  "modules": [ { "key": "avukatlar", "schemaVersions": [1, 2] } ],
  "routes": [ { "module": "haberler", "pattern": "/haberler/:slug" } ],
  "supportedLocales": ["tr"],
  "previewUrl": "https://www.ornek.com/api/preview"
}
```

| Alan | Kural |
|---|---|
| `version` | `1` |
| `buildId` | 1–64; harf, rakam, `.`, `_`, `-` |
| `sections[]` | `key` bölüm türü; `variants` en az bir, `^[a-z0-9][a-z0-9-]{0,39}$` |
| `modules[]` | `key` modül anahtarı; `schemaVersions` frontend'in okuyabildiği şema sürümleri |
| `routes[]` | İsteğe bağlı; `pattern` `/yol/:slug` veya `/yol/:id`. Kayıt adresi, site haritası ve adres çözmeyi belirler. |
| `supportedLocales` | En az bir |
| `previewUrl` | İsteğe bağlı; https ve sitenin doğrulanmış alan adlarından birinde |
| Diğer | Tanınmayan anahtar reddedilir; en çok 64 KB |

Biçim hataları `422`, yol `manifest.<alan>`.

| Kural | Ayrıntı |
|---|---|
| Sürümler | Değişmezdir. Sürüm numarası site içinde artar. Aynı içerik (özet aynı) yeniden gönderilirse mevcut sürüm `200` ile döner; yeni sürüm `201`. |
| Kayıt kaynağı | Platform yöneticisi (`source: platform`) veya CI anahtarı (`source: credential`) |
| Etkinleştirme | Yalnız platform yöneticisi. Sitede tek etkin sürüm. `site.config.published` olayı üretir. |

**Uyumluluk raporu** (`GET …/manifests/{id}` ve CI yanıtında `compatibility`): `{ status: compatible | compatibleWithWarnings | incompatible, errors[], warnings[] }`.

| Hata (etkinleştirmeyi engeller) | Uyarı |
|---|---|
| `SECTION_NOT_SUPPORTED`: yayındaki bir sayfada gizli olmayan bölüm türü veya varyantı manifest'te yok | `MODULE_NOT_FOUND`: manifest'teki modül sitede yok veya kapalı |
| `SCHEMA_VERSION_UNSUPPORTED`: modülün etkin şema sürümü listede yok | `MODULE_NOT_DECLARED`: açık içerik modülü manifest'te yok |
| `LOCALE_UNSUPPORTED`: sitenin bir dili listede yok | |

Uyumsuz manifest'i etkinleştirme `409 MANIFEST_INCOMPATIBLE`, `errors[]` rapordaki hatalar.

**Şema yayınına etkisi (AT-53):** Etkin manifest bir modülü bildiriyor ve yeni şema sürümü `schemaVersions` listesinde değilse:

- Dry-run raporunda `manifest: { status: "blocked" | "warning", manifestVersion, supported[] }` döner.
- Kırıcı değişiklikte (`impact: breaking`) yayın `409 MANIFEST_INCOMPATIBLE` ile reddedilir. Önce yeni sürümü destekleyen manifest kaydedilip etkinleştirilir, sonra şema yayınlanır.
- Kırıcı olmayan değişiklik uyarıyla yayınlanır.

**CI kaydı** (`POST /api/v1/integration/sites/{publicKey}/manifests`, gövde `{ manifest }`): `manifest:write` kapsamlı anahtar zorunlu. Anahtar yok, geçersiz, kapsamsız veya site bilinmiyorsa hepsi `401 CREDENTIAL_REQUIRED` (site varlığı sızdırılmaz). Yanıt `{ id, version, checksum, active, compatibility }`. Etkinleştirmez.

## 6. Audit olayları

`domain.added` · `domain.verified` · `domain.primaryChanged` · `domain.removed` · `credential.created` · `credential.rotated` · `credential.revoked` · `webhook.created` · `webhook.updated` · `webhook.deleted` · `webhook.secretRotated` · `webhook.retried` · `manifest.registered` · `manifest.activated` · `site.integrationUpdated`. Gizli anahtar, sır ve imza hiçbir audit kaydına yazılmaz.

## 7. Hata kodları

| HTTP | Kod | Ne zaman |
|---|---|---|
| 401 | `CREDENTIAL_REQUIRED` | CI ucunda geçerli `manifest:write` anahtarı yok |
| 409 | `DOMAIN_TAKEN` | Alan adı başka bir sitede kayıtlı |
| 409 | `DOMAIN_NOT_VERIFIED` | Doğrulanmamış ad birincil yapılamaz |
| 409 | `PRIMARY_DOMAIN` | Birincil ad silinemez |
| 409 | `QUOTA_EXCEEDED` | Alan adı (20), anahtar (10) veya webhook (10) sınırı |
| 409 | `MANIFEST_INCOMPATIBLE` | Uyumsuz manifest etkinleştirme veya manifest'in desteklemediği kırıcı şema yayını |
| 409 | `INVALID_STATE_TRANSITION` | Arşivli site, iptal edilmiş anahtar, yeniden denenemeyen teslim |
| 422 | `VALIDATION_FAILED` | Alan kodları: `INVALID`, `TOO_LONG`, `OUT_OF_RANGE` |

## 8. Panel davranışı (Platform → Site → Entegrasyon)

- Erişim: genel/özel mod, izinli kökenler, yönlendirme alan adları, dil geri dönüşü.
- Alan adları: durum rozeti, DNS kaydı (kopyalanabilir ad ve değer), "Doğrula", "Birincil yap", kaldırma.
- API anahtarları: oluşturma ve yenilemede tek seferlik gösterim penceresi ("bir daha gösterilmeyecek"), son kullanım, örtüşme bitişi, iptal.
- Webhook: olay seçimi, sır gösterimi, deneme olayı, teslim geçmişi (yanıtlar, yeniden dene).
- Manifest: sürüm listesi, uyumluluk raporu, JSON yükleme, etkinleştirme.

## 9. Veri modeli

[09-data-model.md](09-data-model.md) "Aşama 6": `site_domains`, `api_credentials`, `webhook_endpoints`, `webhook_events`, `webhook_deliveries`, `frontend_manifests`; `sites` ek kolonları.

## Değişiklik geçmişi

| Tarih | Değişiklik |
|---|---|
| 17 Kas 2026 | İlk sürüm (Aşama 6): erişim ayarları, alan adları ve DNS doğrulaması, API anahtarları ve rotasyon, webhook outbox ve imza, SSRF koruması, frontend manifest'i ve uyumluluk, CI kaydı. |
| 18 Kas 2026 | Sadeleştirme (ADR-057): `release.published` webhook olayı ve `publishingTools` kaldırıldı. |
