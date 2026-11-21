# 02 — Müşteri ve site (`tenancy`)

Hiyerarşi şartname §3'teki gibidir: **Platform → Tenant (müşteri) → Site**. Tenant gerçek bir kişi veya kuruluş hesabıdır. Site; bağımsız içeriği, dilleri ve alan adıyla bir yayın bağlamıdır. Bu dosya platform tarafındaki müşteri/site yönetimini ve müşteri tarafındaki site listesiyle site bağlamını tanımlar. Her müşterinin panele giriş yapan tek hesabı vardır ("Müşteri hesabı" bölümü, ADR-056). Yetki [03-access-control.md](03-access-control.md)'dedir.

| Yöntem | Yol | Amaç | İzin |
|---|---|---|---|
| GET | `/api/v1/platform/overview` | Genel bakış sayıları | `platform.tenant.read` |
| GET | `/api/v1/platform/tenants` | Müşteri listesi | `platform.tenant.read` |
| POST | `/api/v1/platform/tenants` | Müşteri ve hesabını oluşturma | `platform.tenant.manage` |
| GET | `/api/v1/platform/tenants/{tenantId}` | Müşteri ayrıntısı | `platform.tenant.read` |
| PATCH | `/api/v1/platform/tenants/{tenantId}` | Ad ve site sınırı | `platform.tenant.manage` |
| POST | `/api/v1/platform/tenants/{tenantId}/actions/{suspend\|restore\|archive}` | Durum değişikliği | `platform.tenant.manage` |
| GET | `/api/v1/platform/tenants/{tenantId}/account` | Müşteri hesabı | `platform.tenant.read` |
| PUT | `/api/v1/platform/tenants/{tenantId}/account` | Hesabı oluşturma veya düzenleme | `platform.tenant.manage` |
| POST | `/api/v1/platform/tenants/{tenantId}/account/actions/send-setup-link` | Şifre belirleme bağlantısı gönderme | `platform.tenant.manage` |
| GET | `/api/v1/platform/tenants/{tenantId}/sites` | Müşterinin siteleri | `platform.site.read` |
| POST | `/api/v1/platform/tenants/{tenantId}/sites` | Site oluşturma | `platform.site.manage` |
| GET | `/api/v1/platform/sites` | Bütün siteler (müşteri süzgeçli) **[ÖNERİ]** | `platform.site.read` |
| GET | `/api/v1/platform/sites/{siteId}` | Site ayrıntısı | `platform.site.read` |
| PATCH | `/api/v1/platform/sites/{siteId}` | Ad, alan adı, saat dilimi | `platform.site.manage` |
| POST | `/api/v1/platform/sites/{siteId}/actions/{suspend\|restore\|archive}` | Durum değişikliği | `platform.site.manage` |
| GET | `/api/v1/customer/sites` | Hesabın müşterisine ait siteler | Müşteri oturumu |
| GET | `/api/v1/customer/sites/{siteId}/bootstrap` | Site bağlamı: site, izinler, bölümler | Siteye erişim |

**[ÖNERİ]** etiketi şunu gösterir: şartname §15/§25.5 tablosunda olmayan, ama ekran sözleşmesi (§11 "Web siteleri: tenant filtreli liste") için gerekli uç. Gerekçeler: DECISIONS ADR-016.

Bütün uçlar mock'ta uygulanmıştır. Platform uçlarında kimlik `platform` realm oturumudur, müşteri uçlarında `customer` realm oturumudur ([00-conventions.md](00-conventions.md) §3–4).

---

## Ortak kurallar

### Anahtarlar ve doğrulama

| Alan | Kural |
|---|---|
| `key` (tenant ve site) | 2–63 karakter, `^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$`. Tenant anahtarı platformda, site anahtarı tenant içinde benzersizdir. Oluşturmada **isteğe bağlıdır**: verilmezse addan üretilir (Türkçe harfler sadeleşir; çakışırsa `-2`, `-3` eklenir; ADR-057). Panel anahtar sormaz. Oluşturulduktan sonra değiştirilemez. API ve sistem içi kararlı kimliktir; görünen ad değişebilir. |
| `displayName` | Kırpılır, ardışık boşluklar teke iner. 2–160 karakter. |
| `primaryDomain` | İsteğe bağlı. Kırpılır, küçük harfe çevrilir, sondaki nokta atılır. Yalnız host adı kabul edilir (`www.ornek.com`); şema, port ve yol kabul edilmez. Platform genelinde benzersizdir. Sahiplik doğrulaması `domains` uçlarındadır ([12-integrations.md](12-integrations.md) §2). |
| `locales` | 1–20 BCP 47 kodu (`^[a-z]{2,3}(-[A-Z]{2})?$`); tekrarlar atılır. |
| `defaultLocale` | `locales` listesinin içinde olmalı. |
| `timezone` | IANA adı (`Europe/Istanbul`) veya `UTC`. |
| `quota.maxSites` | 1–100 tamsayı (şartname §19 başlangıç sınırı). Mevcut arşivlenmemiş site sayısının altına indirilemez. |

### Durumlar ve geçişler

Şartname §11: silme yerine askı ve arşiv kullanılır. Tenant ve site için aynı durum makinesi geçerlidir:

| İşlem | Geçerli başlangıç durumu | Hedef durum | Gerekçe |
|---|---|---|---|
| `suspend` | `ACTIVE` | `SUSPENDED` | Zorunlu (5–500 karakter) |
| `archive` | `ACTIVE`, `SUSPENDED` | `ARCHIVED` | Zorunlu (5–500 karakter) |
| `restore` | `SUSPENDED`, `ARCHIVED` | `ACTIVE` | İsteğe bağlı |

Geçersiz geçiş `409 INVALID_STATE_TRANSITION` döner. Gerekçe audit kaydının `metadata.reason` alanına yazılır.

**Etkiler** (şartname §13):

| Durum | Etki |
|---|---|
| Tenant `SUSPENDED` veya `ARCHIVED` | Tenant'ın bütün siteleri müşteri panelinde görünmez ve bootstrap `404` döner. Public delivery `503 SITE_UNAVAILABLE` döner ([11-delivery.md](11-delivery.md) §1). Yeni site açılamaz ve şifre belirleme bağlantısı gönderilemez (`409 TENANT_NOT_ACTIVE`). |
| Site `SUSPENDED` | Site müşteri panelinde görünmez ve bootstrap `404` döner. Delivery `503 SITE_UNAVAILABLE` döner. |
| Site `ARCHIVED` | Askıdaki etkilere ek olarak site düzenlenemez. Tenant'ın site sınırında sayılmaz. Arşivden dönüşte sınır yeniden kontrol edilir (`409 QUOTA_EXCEEDED`). |
| `ARCHIVED` tenant veya site | `PATCH` → `409 INVALID_STATE_TRANSITION` |
| Restore | Yeniden etkinleştirme bekleyen planları sessizce çalıştırmaz (şartname §25.8). Bu kural planlı yayın (Aşama 5) ile uygulanacak. |

### Sürüm ve eşzamanlılık

- Tenant ve site yanıtları `version` alanını taşır. Bu değer `ETag` başlığıyla aynıdır (ör. `"3"`) ve satırın `row_version` değeridir.
- `PATCH` ve `actions/*` istekleri `If-Match: <version>` başlığını ister:
  - Başlık yoksa `428 PRECONDITION_REQUIRED` döner.
  - Değer eskiyse `412 PRECONDITION_FAILED` döner.
- Başarılı değişiklik `row_version` değerini 1 artırır. Değişiklik yoksa sürüm artmaz ve audit yazılmaz.

### Liste parametreleri

[00-conventions.md](00-conventions.md) §9:

| Parametre | Kural |
|---|---|
| `page`, `size` | Varsayılan 1 ve 20; `size` en fazla 100 |
| `includeTotal=true` | Yanıta `total` eklenir |
| `q` | Ad, anahtar veya alan adında `tr-TR` küçük harf "içerir" araması |
| `status` | `ACTIVE`, `SUSPENDED`, `ARCHIVED`. Bilinmeyen değer `400 MALFORMED_REQUEST` döner. |

Sıralama görünen ada göre `tr` harmanlamasıyla yapılır; eşitlikte `id` kullanılır.

Liste yanıtı:

```json
{ "items": [ … ], "page": 1, "size": 20, "total": 3, "hasNext": false }
```

---

## Sunumlar

**Tenant**

```json
{
  "id": "uuid",
  "key": "ornek-holding",
  "displayName": "Örnek Holding A.Ş.",
  "status": "ACTIVE",
  "quota": { "maxSites": 100 },
  "siteCount": 3,
  "account": { "id": "uuid", "email": "selin@ornekholding.example.test", "displayName": "Selin Kaya", "status": "ACTIVE", "passwordSet": true, "lastLoginAt": "…", "createdAt": "…" },
  "createdAt": "2026-11-16T16:01:12.000Z",
  "updatedAt": "2026-11-16T16:01:12.000Z",
  "version": "\"1\""
}
```

- `siteCount`: arşivlenmemiş siteler.
- `account`: müşterinin tek hesabı ("Müşteri hesabı" bölümündeki sunum). Hesap yoksa (ör. kalıcı silinmiş müşteri) `null`.

**Site** (platform)

```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "tenantName": "Örnek Holding A.Ş.",
  "key": "kurumsal",
  "displayName": "Örnek Holding Kurumsal",
  "status": "ACTIVE",
  "primaryDomain": "ornekholding.example.test",
  "defaultLocale": "tr",
  "locales": ["tr", "en"],
  "timezone": "Europe/Istanbul",
  "publicKey": "pk_…",
  "preset": { "presetId": "uuid", "key": "kurumsal", "label": { "tr": "Kurumsal / holding / KOBİ" }, "version": 1 },
  "moduleCount": 10,
  "createdAt": "…",
  "updatedAt": "…",
  "version": "\"1\""
}
```

- `preset`: Site oluşturulurken seçilen preset ve sürümünün kaydı (şartname §4: "seçilen sürüm snapshot alınır"). Presetsiz kurulan sitede `null`. Preset sonradan değişse de bu değer değişmez.
- `moduleCount`: arşivlenmemiş site modülleri ([05-schema.md](05-schema.md) §8).

`publicKey` delivery API'de siteyi tanımlar; site UUID'sinden farklıdır ve gizli bilgi sayılmaz (şartname §15). Site oluşturulurken üretilir ve değişmez. Anahtar rotasyonu entegrasyon aşamasında tanımlanacak.

---

### `GET /api/v1/platform/overview`

Genel bakış ekranının sayılarını tek istekte döner.

```json
{
  "tenants": { "total": 3, "active": 3, "suspended": 0, "archived": 0 },
  "sites": { "total": 5, "active": 5, "suspended": 0, "archived": 0 },
  "customerUsers": 4,
  "pendingAccounts": 1,
  "recentAudit": [ { …audit olayı } ]
}
```

| Alan | Kural |
|---|---|
| `customerUsers` | `ACTIVE` müşteri hesapları |
| `pendingAccounts` | Şifresini henüz belirlememiş `ACTIVE` müşteri hesapları |
| `recentAudit` | Son 6 audit olayı. Aktörde `platform.audit.read` yoksa `null`. |

Medya kullanımı, başarısız işler ve sistem sağlığı ilgili aşamalarda bu yanıta eklenecek.

### `POST /api/v1/platform/tenants`

| | |
|---|---|
| Idempotency | `Idempotency-Key` zorunlu |
| Bilinmeyen alan | `422 UNKNOWN_FIELD` |

**İstek**

```json
{
  "displayName": "Deneme Şirketi",
  "quota": { "maxSites": 10 },
  "account": { "email": "sahip@denemesirketi.example.test", "displayName": "Deniz Deneme" }
}
```

- `key` isteğe bağlıdır; verilmezse addan üretilir (`deneme-sirketi`).
- `quota` isteğe bağlıdır; verilmezse 100 olur.
- `account` zorunludur. Müşteri ve hesabı aynı transaction'da oluşur. Hesabın şifresi yoktur; e-postaya şifre belirleme bağlantısı gider ("Müşteri hesabı").

**Yanıt** — `201`: Tenant sunumu.

**Hatalar:** `422`; `errors[].path` değerleri `key` (`INVALID` · `NOT_UNIQUE`), `displayName`, `quota.maxSites` (`OUT_OF_RANGE`), `account` (`REQUIRED`), `account.email` (`INVALID` · `NOT_UNIQUE`), `account.displayName` (`REQUIRED`).

**Yan etki:** `tenant.created`; hesap kurulum e-postası (`account_setup`).

### `PATCH /api/v1/platform/tenants/{tenantId}`

**İstek:** yalnız değişen alanlar gönderilir; `If-Match` zorunludur.

```json
{ "displayName": "Örnek Holding A.Ş.", "quota": { "maxSites": 20 } }
```

**Yanıt** — `200`: Tenant sunumu ve yeni `ETag`.

**Yan etki:** `tenant.updated`, `metadata.changes: { alan: { from, to } }`.

### `POST /api/v1/platform/tenants/{tenantId}/actions/{action}`

**İstek:** `If-Match` zorunludur.

```json
{ "reason": "Ödeme gecikmesi nedeniyle geçici askı" }
```

**Yanıt** — `200`: Tenant sunumu.

**Yan etki:** `tenant.suspend` / `tenant.archive` / `tenant.restore`, `metadata: { from, to, reason }`.

**Hatalar:** `404` (bilinmeyen `action`) · `409 INVALID_STATE_TRANSITION` · `422 reason REQUIRED`.

### `POST /api/v1/platform/tenants/{tenantId}/sites`

| | |
|---|---|
| Idempotency | `Idempotency-Key` zorunlu |

**İstek**

```json
{
  "displayName": "Kurumsal Blog",
  "primaryDomain": "blog.ornek.com",
  "defaultLocale": "tr",
  "locales": ["tr", "en"],
  "timezone": "Europe/Istanbul",
  "preset": {
    "presetId": "uuid",
    "version": 1,
    "modules": [{ "key": "ayarlar" }, { "key": "ekip" }, { "key": "sponsorlar", "include": false }]
  }
}
```

- `key` isteğe bağlıdır; verilmezse site adından, müşterinin sitelerinde tekil olarak üretilir.
- `preset` isteğe bağlıdır; `null` veya yoksa site modülsüz oluşur.
- `preset.modules` presetin o sürümündeki modüllerden seçimdir. Madde biçimi ve kuralları [05-schema.md](05-schema.md) "Preset seçimi" ile aynıdır (`include`, `targetKey`, `label`). `modules` verilmezse presetin bütün modülleri eklenir.
- Site, seçilen modüller, her modülün şema 1. sürümü ve audit kaydı **tek transaction**'da oluşur; herhangi biri hata verirse hiçbiri oluşmaz.

**Yanıt** — `201`: Site sunumu.

**Hatalar**

| HTTP | Kod | Ne zaman |
|---|---|---|
| 409 | `TENANT_NOT_ACTIVE` | Tenant aktif değil |
| 409 | `QUOTA_EXCEEDED` | Arşivlenmemiş site sayısı `quota.maxSites`'a ulaşmış |
| 422 | `VALIDATION_FAILED` | `key` (`INVALID`/`NOT_UNIQUE`), `displayName`, `primaryDomain` (`INVALID`/`NOT_UNIQUE`), `locales`, `defaultLocale`, `timezone`; `preset.presetId` (yok/arşivde), `preset.version` (yok), `preset.modules.{i}.*` |

**Yan etki:** `site.created`, `metadata: { preset, modules: [anahtarlar] }`.

**Sonraki aşamalar:** Sihirbazın "temel ayarlar" adımı (logo, iletişim, site ayarları modülünün ilk kaydı) Aşama 3'te kayıt uçlarıyla eklenecek.

### `PATCH /api/v1/platform/sites/{siteId}`

**İstek:** `If-Match` zorunlu.

```json
{ "displayName": "…", "primaryDomain": "…" , "timezone": "…" }
```

- `primaryDomain: null` alan adını kaldırır. Aşama 6'dan itibaren alan adları `domains` uçlarıyla doğrulanır; birincil yapılan ad bu alana yazılır ([12-integrations.md](12-integrations.md) §2). Bu alan görüntüleme amaçlıdır: CORS, dış yönlendirme ve önizleme adresi yalnız doğrulanmış adları kullanır.
- Diller ve varsayılan dil burada değiştirilmez. Bu değişiklik URL, SEO ve içerik etkisi taşır; etki raporlu ayrı uçla yapılır: `POST /platform/sites/{siteId}/locales/impact`, `PUT /platform/sites/{siteId}/locales` ([14-operations.md](14-operations.md) §8).

**Yan etki:** `site.updated`, `metadata.changes`.

### `POST /api/v1/platform/sites/{siteId}/actions/{action}`

Tenant işlemleriyle aynıdır. Arşivden `restore` yapılırken tenant'ın site sınırı yeniden kontrol edilir (`409 QUOTA_EXCEEDED`).

---

## Müşteri hesabı (ADR-056)

Her müşterinin panele giriş yapan **tek hesabı** vardır. Hesap müşterinin bütün sitelerinde tam yetkilidir. Rol, davet ve ek kullanıcı yoktur. Hesap yalnız platformdan yönetilir; müşteri kendi şifresini ve oturumlarını yönetir ([01-identity.md](01-identity.md)).

**Hesap sunumu**

```json
{
  "id": "uuid",
  "email": "selin@ornekholding.example.test",
  "displayName": "Selin Kaya",
  "status": "ACTIVE",
  "passwordSet": true,
  "lastLoginAt": "2026-11-18T09:12:00.000Z",
  "createdAt": "…"
}
```

- Şifre veya özeti hiçbir yanıtta yer almaz (şartname §11); yalnız belirlenip belirlenmediği (`passwordSet`) döner.
- E-posta müşteri realm'inde tekildir. Bir e-posta yalnız bir müşterinin hesabı olabilir.

**Hesap kurulumu.** Yeni hesabın şifresi yoktur (`passwordSet: false`) ve şifre girişi `401 INVALID_CREDENTIALS` döner. Hesabın e-postasına şifre belirleme bağlantısı gider:

| Konu | Kural |
|---|---|
| Bağlantı | `{müşteri paneli}/sifre-sifirla?token=…`; şifre sıfırlamayla aynı uç ([01-identity.md](01-identity.md) `reset`) |
| Token | 256 bit rastgele; yalnız SHA-256 özeti saklanır; tek kullanımlık |
| Süre | 7 gün (normal sıfırlama bağlantısı 30 dakika) |
| E-posta şablonu | `account_setup`. Gövdede yalnız müşteri adı ve bağlantı bulunur |

### `GET /api/v1/platform/tenants/{tenantId}/account`

**Yanıt** — `200`: `{ "account": hesap sunumu | null }`.

### `PUT /api/v1/platform/tenants/{tenantId}/account`

Hesabı oluşturur (yoksa) veya e-postasını ve adını değiştirir.

```json
{ "email": "selin@ornekholding.example.test", "displayName": "Selin Kaya" }
```

- E-posta değişirse hesabın açık müşteri oturumları kapatılır ve yeni adrese şifre belirleme bağlantısı gider. Mevcut şifre geçerli kalır.
- Arşivlenmiş veya kalıcı silinmiş müşteride `409 INVALID_STATE_TRANSITION`.

**Yanıt** — `200`: `{ "account": hesap sunumu }`.

**Hatalar:** `422`; `account.email` (`INVALID` · `NOT_UNIQUE`), `account.displayName` (`REQUIRED`).

**Yan etki:** `account.created` veya `account.updated`.

### `POST /api/v1/platform/tenants/{tenantId}/account/actions/send-setup-link`

Şifre belirleme bağlantısını yeniden gönderir. Şifresi belirlenmiş hesapta da çalışır (şifre sıfırlama yerine geçer).

**Yanıt** — `202`: `{ "sent": true }`.

**Hatalar:** `404` (hesap yok) · `409 TENANT_NOT_ACTIVE`.

**Yan etki:** `account.setupLinkSent`; `account_setup` e-postası.

---

### `GET /api/v1/customer/sites`

Oturumdaki hesabın müşterisine ait siteler. Site ve müşteri `ACTIVE` olmalıdır.

```json
{
  "items": [
    {
      "id": "uuid",
      "displayName": "Örnek Holding Kurumsal",
      "primaryDomain": "ornekholding.example.test",
      "tenant": { "id": "uuid", "displayName": "Örnek Holding A.Ş." },
      "defaultLocale": "tr",
      "updatedAt": "…"
    }
  ]
}
```

- Sayfalama yoktur; site sayısı müşteri sınırıyla (100) sınırlıdır.
- Sıralama `displayName` (`tr`) ile yapılır, eşitlikte `id` kullanılır.

**Panel davranışı** (şartname §12):

- Tek site varsa doğrudan o siteye geçilir; başlıkta site seçici yerine site adı görünür.
- Birden fazla site varsa kartlar gösterilir. 6 ve üzeri sitede arama kutusu çıkar.
- Son kullanılan site kullanıcıya özel olarak tarayıcıda tutulur ve en başta gösterilir. Erişim kalktıysa listede yer almadığı için gösterilmez.

### `GET /api/v1/customer/sites/{siteId}/bootstrap`

Site bağlamı. Panel adres `/siteler/{siteId}` ile başladığında bu ucu çağırır.

```json
{
  "site": {
    "id": "uuid",
    "displayName": "…",
    "primaryDomain": "…",
    "tenant": { "id": "uuid", "displayName": "…" },
    "defaultLocale": "tr",
    "locales": ["tr", "en"],
    "timezone": "Europe/Istanbul",
    "updatedAt": "…"
  },
  "permissions": ["entry.read", "entry.create", "…"],
  "modules": [
    { "key": "ekip", "label": { "tr": "Ekibimiz" }, "icon": "users", "kind": "collection", "entryCount": 4, "area": "content", "role": null },
    { "key": "sayfalar", "label": { "tr": "Sayfalar" }, "icon": "layout", "kind": "tree", "entryCount": 7, "area": "site", "role": "pages" }
  ]
}
```

- **`permissions`:** Hesabın bu sitedeki izinleri; sade modelde bütün müşteri izinleri ([03-access-control.md](03-access-control.md) §2). Panel menüyü ve eylemleri bunlara göre gösterir. API her istekte ayrıca denetler.
- **`modules`:** Müşterinin gördüğü içerik bölümleri. Yalnız durumu `ENABLED` olan ve yayınlanmış şeması bulunan modüller döner; platformdaki taslak hiçbir müşteri ucunda görünmez (AT-60). Kullanıcıda `entry.read` yoksa boş listedir. Sıra modülün `order` değeridir. `area: "site"` sitenin yapı modülleridir (ayarlar, sayfalar, menüler, yönlendirmeler; `role` şablon anahtarı); `area: "content"` içerik modülleridir. Panel menüsü bu alana göre "Site yapısı" ve "İçerik" gruplarına ayrılır ([10-site-structure.md](10-site-structure.md) §1).
- **Hata:** Site yoksa, başka bir müşteriye aitse, askıda veya arşivdeyse ya da hesap bu müşterinin değilse her durumda `404 NOT_FOUND` döner. Hangi durumun geçerli olduğu sızdırılmaz (AT-02).

**Panel davranışı:**

- Site değişince önceki sitenin bütün önbelleği silinir. Önbellek anahtarları `["site", siteId, …]` önekiyle tutulur; eski site verisi yeni sitede görünmez (AT-08).
- Kaydedilmemiş değişiklik varsa site değişiminden önce onay istenir.

---

## Değişiklik geçmişi

| Tarih | Değişiklik |
|---|---|
| 16 Kas 2026 | İlk sürüm (Aşama 1): müşteri ve site yaşam döngüsü, genel bakış, müşteri site listesi ve bootstrap. |
| 16 Kas 2026 | Aşama 2: site oluşturmada `preset` seçimi (tek transaction); site sunumuna `preset` ve `moduleCount`; bootstrap'ta `navigation` yerine `modules`. |
| 17 Kas 2026 | Aşama 6: site sunumu, bootstrap ve site PATCH'inde `publishingTools`; bootstrap modüllerinde `area` ve `role`; askıdaki sitede delivery `503 SITE_UNAVAILABLE`. |
| 18 Kas 2026 | Aşama 7: dil değişikliği ayrı uca taşındı (etki raporu); `sites.archived_locales`. |
| 18 Kas 2026 | Aşama 8: müşteri durumu `PURGED` (kalıcı silme sonrası mezar taşı), `legalHold` ve `purgedAt` alanları; site kopyalama ([15-site-data.md](15-site-data.md)). |
| 18 Kas 2026 | **Sade yetki modeli (ADR-056):** müşteri sunumunda `memberCount` yerine `account`; müşteri oluşturmada zorunlu `account`; hesap uçları ("Müşteri hesabı"); genel bakışta `pendingInvitations` yerine `pendingAccounts`; site listesi ve bootstrap'tan `role`/`roleLabel` çıkarıldı. |
| 18 Kas 2026 | Sadeleştirme (ADR-057): müşteri ve site `key` isteğe bağlı (sunucu üretir); `publishingTools` kaldırıldı; müşteri sunumunda `legalHold` yok. |
