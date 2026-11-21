# 09 — Veri modeli

Panelin bugün kullandığı uçların gerektirdiği tablolar burada tanımlanır. Dosya her aşamada büyür. Şartname §14'teki tablo listesi ve kurallar esastır; burada yalnız uygulanmış kısım ve netleştirilen kısıtlar yer alır.

## Genel kurallar

Kaynak: şartname §13, §14 ve §25.5.

- **Kimlik ve zaman:**
  - Bütün kimlikler UUID'dir.
  - Zamanlar `timestamptz` ve UTC'dir.
  - Görünen anahtarlar (`key`) kimlikten ayrıdır.
- **Değişebilir tablolar:** `created_at`, `updated_at`, gerekiyorsa `created_by` ve `row_version` kolonlarını taşır. `row_version` ETag'in kaynağıdır ([00-conventions.md](00-conventions.md) §8).
- **Değişmez tablolar:** Audit, revizyon ve snapshot tablolarında API rolüyle `UPDATE` ve `DELETE` yapılamaz.
- **Kapsam ve izolasyon:**
  - Tenant ve site kapsamlı tablolarda composite FK `(tenant_id, site_id, id)` kullanılır.
  - Bu tablolarda PostgreSQL RLS açıktır.
  - API'nin DB rolü tablo sahibi değildir ve `BYPASSRLS` yetkisi yoktur.
  - Bağlam transaction'a özgü olarak `SET LOCAL` ile verilir. Bağlantı havuzunda bağlam sızıntısı test edilir (AT-02).
- **Platformdan tenant'lar arası işlemler:** Ayrı ve kısıtlı bir DB rolüyle yapılır, açık kapsam taşır ve audit'e yazılır. Müşteri API'si bu rolü kullanmaz.
- **Ham token yok:** Oturum, davet ve sıfırlama gibi bütün token'lar `token_hash` (SHA-256) olarak saklanır.
- **Benzersizlik:** E-posta ve anahtarlarda benzersizlik normalize edilmiş değer (küçük harf, kırpılmış) üzerinden kurulur.

## Aşama 1 tabloları

### `platform_users`

| Kolon | Tip | Kısıt |
|---|---|---|
| `id` | uuid | PK |
| `email` | text | Normalize; `unique` |
| `display_name` | text | 2–120 |
| `password_hash` | text | Argon2id |
| `status` | text | `ACTIVE` · `SUSPENDED` · `CLOSED` |
| `locale` | text | Panel dili, varsayılan `tr` |
| `created_at`, `updated_at` | timestamptz | |

Platform kullanıcısında rol yoktur; her platform kullanıcısı tam yetkilidir (ADR-056). Platform kullanıcısını oluşturan uç bu aşamada yoktur. İlk sahip, şartname §19'daki tek seferlik bootstrap CLI ile oluşturulur. Platform kullanıcı yönetimi ekranı sonraki aşamada eklenecek.

### `customer_users`

`platform_users` ile aynı kolonları taşır. `password_hash` `null` olabilir: platformun açtığı yeni hesap, şifre belirleme bağlantısıyla ilk şifresini belirleyene kadar şifresizdir ([02-tenancy.md](02-tenancy.md) "Müşteri hesabı"). E-posta realm içinde benzersizdir; aynı e-posta iki realm'de ayrı hesaptır.

### `sessions`

| Kolon | Kısıt |
|---|---|
| `id` | PK |
| `realm` | |
| `user_id` | |
| `token_hash` | `unique` |
| `user_agent` | En fazla 300 karakter |
| `created_at` | |
| `last_seen_at` | Her başarılı istekte güncellenir |
| `revoked_at` | İptal edilince dolar; sonradan değişmez |

Süre her istekte hesaplanır (bkz. 01-identity.md "Oturum"). Süresi dolan oturum ilk istekte `revoked_at` ile kapanır.

### `reset_tokens`

| Kolon | Kısıt |
|---|---|
| `id` | PK |
| `realm` | |
| `user_id` | |
| `token_hash` | `unique` |
| `expires_at` | Oluşturma + 30 dakika (şifre sıfırlama) · 7 gün (yeni müşteri hesabının kurulum bağlantısı) |
| `consumed_at` | |

Kullanıcı başına tek açık token bulunur; yeni istek eskisini siler.

### `tenants`

| Kolon | Kısıt |
|---|---|
| `id` | PK |
| `key` | `unique`; `^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$`; değiştirilemez |
| `display_name` | |
| `status` | `ACTIVE` · `SUSPENDED` · `ARCHIVED` |
| `quota_json` | `{ "maxSites": 1–100 }` |
| `created_at`, `updated_at` | |
| `row_version` | |

### `sites`

| Kolon | Kısıt |
|---|---|
| `tenant_id` | FK → `tenants`; composite PK/unique `(tenant_id, id)` |
| `id` | |
| `key` | `unique(tenant_id, key)`; değiştirilemez |
| `display_name` | |
| `status` | `ACTIVE` · `SUSPENDED` · `ARCHIVED` |
| `default_locale` | `site_locales` içinde olmalı |
| `timezone` | IANA |
| `public_key` | Platform genelinde `unique` |
| `created_at`, `updated_at` | |
| `row_version` | |

Bu aşamada site dilleri sitede tutulur (`locales`). Şartname §14'teki `site_locales` tablosu (locale, enabled, fallback) Aşama 4'te bu listenin yerine geçecek. Alan adı da bu aşamada sitede tutulur (`primary_domain`). `site_domains` tablosu Aşama 6'da eklendi; birincil yapılan doğrulanmış ad `primary_domain` kolonuna yazılır. Bu kolon görüntüleme amaçlıdır; güvenlik kararları (CORS, dış yönlendirme, önizleme adresi) yalnız `site_domains.status = verified` satırlarına bakar.

### `tenant_memberships`

| Kolon | Kısıt |
|---|---|
| `id` | PK |
| `tenant_id` | FK |
| `user_id` | FK → `customer_users` |
| `role` | Her zaman `TENANT_OWNER`. İleride rol eklenebilmesi için kalır. |
| `status` | `ACTIVE` · `REMOVED` |
| `created_at` | |
| — | `unique(user_id)`: bir hesap yalnız bir müşteriye bağlıdır |
| — | Kısmi `unique(tenant_id) WHERE status = 'ACTIVE'`: müşterinin tek hesabı vardır |

Sade yetki modeli (ADR-056): bu tablo hesap–müşteri bağıdır; üyelik rolü ve site yetkisi yoktur.

### `audit_events`

[04-audit.md](04-audit.md) "Olay kaydı" alanlarıyla birebir aynıdır. Ek kolon: `actor_realm`. `tenant_id` ve `site_id` platform olaylarında boş olabilir. Tablo yalnız ekleme alır. Dizinler: `(created_at desc)`, `(tenant_id, created_at desc)`, `(action, created_at desc)`.

### `idempotency_records`

| Kolon | Kısıt |
|---|---|
| `realm` | |
| `actor_id` | |
| `method` | |
| `route` | |
| `key` | `unique(realm, actor_id, method, route, key)` |
| `request_hash` | Kanonik JSON özeti |
| `response_status` | |
| `response_body` | |
| `expires_at` | Oluşturma + 24 saat |

### `rate_limit_counters`

Küme genelinde tutarlı sayaçlardır; DB veya Redis adaptörüyle tutulabilir (şartname §19). Anahtarlar ilgili uçta tanımlıdır. Başarısız istek de sayılır: sayaç, isteğin transaction'ından bağımsız olarak saklanır.

## Aşama 2 tabloları

Kaynak: şartname §14 (`module_templates`, `template_versions`, `presets`, `preset_versions`, `module_instances`, `schema_versions`), §25.5 (`field_group_versions`, `schema_migrations`, `migration_staging`). Davranış: [05-schema.md](05-schema.md).

### `field_groups`

| Kolon | Tip | Kısıt |
|---|---|---|
| `id` | uuid | PK |
| `key` | text | `^[a-z][a-z0-9-]{1,62}$`; `unique` |
| `label` | jsonb | `{ tr, … }`; `tr` zorunlu |
| `description` | text | ≤ 300 |
| `fields` | jsonb | Alan listesi (05-schema.md §3), şema doğrulamasından geçmiş |
| `status` | text | `ACTIVE` · `ARCHIVED` |
| `created_at`, `updated_at`, `row_version` | | |

Şartname §25.5 `field_group_versions` tablosunu ister. Grup kopyalanarak kullanıldığı için (eklenen alanlar yeni kimlik alır, gruba bağlı kalmaz) Aşama 2'de grup sürümü tutulmuyor. Grubun geçmişi audit olaylarından izlenir. Sürüm gerektiren bir özellik (ör. grup yükseltmesi) gelirse tablo eklenecek.

### `module_templates`

| Kolon | Tip | Kısıt |
|---|---|---|
| `id` | uuid | PK |
| `key` | text | `^[a-z][a-z0-9-]{1,62}$`; platform genelinde `unique`, değişmez |
| `label` | jsonb | `{ tr, … }` |
| `description` | text | ≤ 300 |
| `category` | text | Kategori listesinden |
| `icon` | text | `^[a-z0-9-]{1,40}$` |
| `status` | text | `ACTIVE` · `ARCHIVED` |
| `latest_version` | int | 0 = henüz yayınlanmadı |
| `draft` | jsonb | Taslak şema; ≤ 256 KiB; yapısal denetimli, içerik hatası içerebilir |
| `draft_updated_at`, `draft_updated_by` | | |
| `created_at`, `updated_at`, `row_version` | | |

### `template_versions` (değişmez)

| Kolon | Tip | Kısıt |
|---|---|---|
| `id` | uuid | PK |
| `template_id` | uuid | FK `module_templates` |
| `version` | int | `unique (template_id, version)`; 1'den başlar, ardışık |
| `schema` | jsonb | Yayın anında doğrulanmış şema |
| `checksum` | text | Kararlı JSON özeti |
| `changelog` | text | ≤ 500, `null` olabilir |
| `created_at`, `created_by` | | |

`UPDATE` ve `DELETE` yasaktır.

### `presets` ve `preset_versions` (sürümler değişmez)

| Tablo | Kolonlar |
|---|---|
| `presets` | `id`, `key` (`unique`), `label` jsonb, `description`, `family` (2–60), `status` (`ACTIVE`/`ARCHIVED`), `latest_version` (≥ 1), `created_at`, `updated_at`, `row_version` |
| `preset_versions` | `id`, `preset_id` FK, `version` (`unique (preset_id, version)`), `modules` jsonb `[{ templateId, templateKey, templateVersion, key, label }]` (≤ 40; `key` preset içinde benzersiz), `changelog`, `created_at`, `created_by` |

`preset_versions.modules` içindeki `(templateId, templateVersion)` çifti var olan bir `template_versions` satırını göstermeli. Uygulama katmanında denetlenir; JSON içi FK yoktur.

### `sites` (Aşama 2 eklemeleri)

| Kolon | Tip | Kısıt |
|---|---|---|
| `preset_id` | uuid | FK `presets`, `null` = presetsiz |
| `preset_version` | int | `preset_id` ile birlikte dolu veya boş |

Şartname §4 "seçilen sürüm snapshot alınır": modüller oluşturulurken şemalar kopyalandığı için ayrıca preset içeriği kopyalanmaz. Bu iki kolon kaynağı gösterir.

### `module_instances`

| Kolon | Tip | Kısıt |
|---|---|---|
| `id` | uuid | PK |
| `tenant_id`, `site_id` | uuid | Composite FK `sites (tenant_id, id)`; RLS |
| `key` | text | `^[a-z][a-z0-9-]{1,62}$`; `unique (site_id, key)` arşivdekiler dahil (şartname §25.5: soft-delete key reuse yasak) |
| `label` | jsonb | `{ tr, … }` |
| `icon` | text | |
| `template_id` | uuid | FK `module_templates` (`RESTRICT`) |
| `template_version` | int | Modülün dayandığı şablon sürümü |
| `status` | text | `ENABLED` · `DISABLED` · `ARCHIVED` |
| `order` | bigint | Seyrek sıra (+1024) |
| `active_schema_id` | uuid | FK `schema_versions`; `NOT NULL` (oluşturma transaction'ında yazılır) |
| `draft` | jsonb | `null` = taslak yok; ≤ 256 KiB |
| `draft_source` | jsonb | `null` · `{ type: "rollback", toVersion }` · `{ type: "upgrade", fromTemplateVersion, toTemplateVersion }` |
| `draft_updated_at`, `draft_updated_by` | | |
| `created_at`, `updated_at`, `row_version` | | |

Sitede en çok 60 arşivlenmemiş modül olabilir (ADR-027); sınır transaction içinde sayılarak denetlenir.

### `schema_versions` (değişmez; yalnız `status` geçişi)

| Kolon | Tip | Kısıt |
|---|---|---|
| `id` | uuid | PK |
| `tenant_id`, `site_id`, `instance_id` | uuid | Composite FK `module_instances`; RLS |
| `version` | int | `unique (instance_id, version)` |
| `status` | text | `PUBLISHED` · `SUPERSEDED`. Modül başına tek `PUBLISHED`: kısmi unique index `(instance_id) WHERE status = 'PUBLISHED'` |
| `schema` | jsonb | Değişmez |
| `checksum` | text | |
| `changelog` | text | |
| `source` | jsonb | `{ type: template \| preset \| clone \| edit \| rollback \| upgrade, … }` |
| `summary` | jsonb | `{ impact, changes, entries, changedEntries, backfilled }`; ilk sürümde `null` |
| `prior_version_id` | uuid | FK `schema_versions`, `null` olabilir |
| `published_at`, `published_by` | | |

`schema` kolonunda `UPDATE` yapılamaz. `status` yalnız `PUBLISHED → SUPERSEDED` yönünde değişir; bunun dışındaki güncellemeleri trigger engeller.

### `entries`

Aşama 3'te tanımlandı ([06-content.md](06-content.md)). Aşama 5'te değerler değişmez `entry_revisions` ve `published_snapshots` tablolarına taşındı; `values` ve `published_values` kolonları güncel taslağın ve yayın kopyasının **okuma kopyasıdır** (denormalize; aynı transaction'da yazılır). Kaynak doğruluk revizyon ve kopya tablolarıdır (ADR-029, ADR-036).

| Kolon | Tip | Kısıt |
|---|---|---|
| `id` | uuid | PK |
| `tenant_id`, `site_id`, `instance_id` | uuid | Composite FK `module_instances`; RLS |
| `schema_version_id` | uuid | FK `schema_versions`; kaydın son yazıldığı şema sürümü |
| `workflow_state` | text | `draft` · `published` ([08-publishing.md](08-publishing.md) §2) |
| `draft_revision_id` | uuid | FK `entry_revisions`; güncel taslak |
| `revision_count` | int | Son revizyon numarası |
| `locale_versions` | jsonb | `{ dil: revizyonNumarası }`; dilin son değiştiği revizyon (çeviri durumu) |
| `values` | jsonb | Güncel taslağın okuma kopyası (alan UUID'siyle, ADR-020) |
| `published_revision_id`, `published_snapshot_id` | uuid | Yayın işaretçisi; `null` = yayında değil |
| `published_values` | jsonb | Yayın kopyasının okuma kopyası |
| `published_at` | timestamptz | |
| `position` | bigint | Seyrek konum (+1024); `(instance_id, parent_id, position)` indeksli; eşitlikte `id` |
| `parent_id` | uuid | Yalnız ağaç modülde; aynı `instance_id`'ye FK; döngü transaction içinde denetlenir |
| `deleted_at` | timestamptz | Çöp kutusu; `null` değilse listelerde, benzersizlikte ve dönüşümde yer almaz |
| `created_at`, `created_by`, `updated_at`, `updated_by`, `row_version` | | |

- **Tek kayıt:** Tek kayıtlı modülde en çok bir kayıt olabilir. Kısıt `unique (instance_id) WHERE deleted_at IS NULL` olarak tanımlanır ve yalnız singleton modüllere uygulanır (transaction koruması).
- **Dry-run ve yayın:** Şema dry-run'ı ve yayını `row_version`'ı `dataWatermark` hesabına katar.

### `entry_unique_values` (şartname §6, §25.5)

| Kolon | Kısıt |
|---|---|
| `site_id`, `instance_id`, `field_id` | |
| `locale_scope` | `''` (modül geneli) veya dil kodu (`unique: locale`) |
| `audience` | `draft` · `published`. Taslak çakışması 422 ile bildirilir; yayında benzersizliği constraint korur. |
| `normalized_value_hash` | Kırpılmış, `tr-TR` küçük harfe çevrilmiş değerin SHA-256 özeti |
| `entry_id` | |

`unique (instance_id, field_id, locale_scope, audience, normalized_value_hash)`. Kayıt yazımı ve yayınla aynı transaction'da güncellenir. Çöpe taşınan kaydın satırları silinir. Mock aynı kuralı tarama ile uygular.

### `entry_relations`

Aşama 3'te ilişki bütünlüğü kayıt yazımında denetlenir: hedef aynı sitede, doğru modülde ve çöpte olmayan bir kayıt olmalıdır. İlişki verilen kayıt çöpe taşınamaz. Kalıcı ilişki projeksiyonu (`source revision/snapshot, field_id, target entry, locale`) revizyonlarla Aşama 5'te tanımlanacak.

### `schema_migrations`, `migration_staging`

Aşama 8'de büyük modüllerin arka planda dönüşümü için tanımlanacak (ADR-026). Kolonlar şartname §25.3'teki rapor alanlarıdır: `base_schema_id`, `target_config`, `config_checksum`, `data_watermark`, `migration_plan_hash`, `state`, `counts`, `errors`.

## Aşama 4 tabloları

Kaynak: şartname §14 (`assets`, `asset_variants`, `asset_folders`, `asset_references`, `upload_sessions`), §8, §25.6. Davranış: [07-media.md](07-media.md).

### `asset_folders`

| Kolon | Kısıt |
|---|---|
| `id`, `tenant_id`, `site_id` | Composite FK `sites`; RLS |
| `name` | 1–80; `unique (site_id, lower(name))` |
| `created_at`, `updated_at`, `row_version` | |

### `assets`

| Kolon | Tip | Kısıt |
|---|---|---|
| `id` | uuid | PK; dış dünyaya verilen tek kimlik |
| `tenant_id`, `site_id` | uuid | Composite FK; RLS |
| `folder_id` | uuid | FK `asset_folders`, `null` olabilir; klasör silinmeden önce boşaltılır |
| `file_name`, `title` | text | Yalnız görünen ad |
| `object_key` | text | Rastgele UUID tabanlı anahtar; özel (private) depoda; `null` = reddedildi |
| `kind`, `format`, `mime_type` | text | Gerçek içerikten (magic bytes) |
| `size` | bigint | Gerçek bayt sayısı |
| `sha256` | text | Site içi tekilleştirme: `unique (site_id, sha256) WHERE status IN ('processing','ready')` |
| `width`, `height`, `duration_ms` | int | |
| `status` | text | `processing` · `ready` · `rejected` · `archived` |
| `reject_code`, `reject_message` | text | |
| `alt`, `caption` | jsonb | `{ dil: metin }` |
| `decorative` | boolean | |
| `focal_point` | jsonb | `{ x, y }` 0–1 |
| `tags` | text[] | ≤ 20 |
| `created_at`, `created_by`, `updated_at`, `row_version` | | |

### `asset_variants`

`asset_id`, `name` (`thumb`, `w320`…), `width`, `height`, `format`, `object_key`, `size`. `unique (asset_id, name, format)`. Worker üretir; orijinalden büyük genişlik üretilmez.

### `upload_sessions`

| Kolon | Kısıt |
|---|---|
| `id`, `tenant_id`, `site_id` | RLS |
| `user_id` | Oturum yalnız açan kullanıcıya aittir |
| `file_name`, `declared_format`, `declared_mime`, `size` | Niyette bildirilen |
| `folder_id` | |
| `object_key` | Karantina önekinde |
| `status` | `pending` · `uploaded` · `finalized` · `expired` |
| `asset_id` | Tamamlama sonucu (tekrarlanan tamamlama aynı kaydı döner) |
| `expires_at` | 15 dk; süresi dolan ve tamamlanmayan oturumların baytları temizlenir |

Kotada bekleyen (`pending`) oturumların boyutu da sayılır (şartname §14 `quota_usage`: "reserved bytes").

### `asset_references`

Kullanım yerleri ve silme engeli için kayıt yazımı ve yayınla aynı transaction'da güncellenir:

- `site_id`, `asset_id`, `entry_id`, `field_id`, `path`, `locale`, `audience` (`draft` | `published`).
- İndeks: `asset_id`.
- Referansı olan dosya silinemez (`ASSET_IN_USE`).

Mock aynı sonucu kayıt değerlerini tarayarak üretir.

## Aşama 5 tabloları

Sözleşme: [08-publishing.md](08-publishing.md). Bütün tablolar `tenant_id`, `site_id` taşır ve RLS ile kapsanır.

### `entry_revisions` (değişmez)

| Kolon | Kısıt |
|---|---|
| `id` | PK |
| `tenant_id`, `site_id`, `instance_id`, `entry_id` | Composite FK `entries` |
| `number` | `unique (entry_id, number)` |
| `schema_version_id` | FK `schema_versions`; revizyonun yazıldığı şema |
| `values` | jsonb; alan UUID'siyle |
| `checksum` | Değerlerin özeti |
| `author_realm`, `author_id` | `null` = sistem |
| `source` | jsonb `{ type: create\|edit\|duplicate\|restore\|migration, … }` |
| `changed` | text[]; `shared` ve dil kodları |
| `created_at` | |

`UPDATE` ve `DELETE` trigger ile engellenir. İndeks: `(entry_id, number desc)`.

### `published_snapshots` (değişmez)

| Kolon | Kısıt |
|---|---|
| `id` | PK |
| `tenant_id`, `site_id`, `instance_id`, `entry_id` | |
| `revision_id`, `revision_number` | FK `entry_revisions` |
| `schema_version_id` | Kopyanın şeması (şema dönüşümünde yeni kopya yazılır) |
| `values` | jsonb |
| `published_by_realm`, `published_by_id`, `created_at` | `null` aktör = sistem |

Delivery yalnız `entries.published_snapshot_id` üzerinden bu tabloyu okur.

### `scheduled_jobs`

| Kolon | Kısıt |
|---|---|
| `id` | PK |
| `tenant_id`, `site_id` | |
| `type` | `entry.publish` · `entry.unpublish` |
| `entry_id` | |
| `execute_at` | timestamptz (UTC) |
| `revision_id`, `snapshot_id`, `schema_version_id` | Plan anında sabitlenen hedef |
| `status` | `pending` · `done` · `failed` · `cancelled` |
| `attempts`, `lease_until` | Worker kirası |
| `idempotency_key` | `unique` |
| `failure` | jsonb `{ code, message }` |
| `created_by_realm`, `created_by_id`, `created_at`, `finished_at` | |

- Kısmi indeks: `(execute_at) WHERE status = 'pending'`.
- `unique (entry_id, type) WHERE status = 'pending'` (kayıt başına tür başına tek plan).

### `preview_tokens`

| Kolon | Kısıt |
|---|---|
| `id` | PK |
| `tenant_id`, `site_id` | |
| `token_hash` | SHA-256; `unique`. Ham belirteç saklanmaz. |
| `scope` | jsonb `{ type: entry, entryId, moduleKey, revisionId }` |
| `locale` | |
| `expires_at` | Oluşturma + 15 dakika |
| `revoked_at` | |
| `created_by`, `created_at` | |

Süresi dolan belirteçler günlük işle silinir.

### `sites` ek kolonu

`release_version` (bigint, varsayılan 0): her yayın olayında monoton artar; delivery ETag ve önbellek anahtarının parçasıdır.

## Aşama 6 tabloları

Sözleşme: [10-site-structure.md](10-site-structure.md), [11-delivery.md](11-delivery.md), [12-integrations.md](12-integrations.md). Bütün tablolar `tenant_id`, `site_id` taşır ve RLS ile kapsanır. Sayfa, menü, yönlendirme ve site ayarları ayrı tablo değildir; yapı modüllerinin kayıtları olarak `entries` ve revizyon tablolarındadır (ADR-041).

### `sites` ek kolonları

| Kolon | Kısıt |
|---|---|
| `delivery_access` | `public` · `private` (varsayılan `public`) |
| `allowed_origins` | text[]; en çok 20, normalize köken |
| `redirect_hosts` | text[]; en çok 50, normalize alan adı |
| `locale_fallback` | `default` · `none` |
| `allow_stale_while_revalidate` | boolean, varsayılan `false` |

`primary_domain`: `site_domains` içinde birincil yapılan ad buraya yazılır (bkz. Aşama 1 notu).

### `route_history`

| Kolon | Kısıt |
|---|---|
| `id` | PK |
| `tenant_id`, `site_id` | |
| `locale` | |
| `path` | Eski adres; `unique (site_id, locale, path)` |
| `entry_id` | Sayfanın kimliği (yeni adres her okumada yayın kopyasından hesaplanır) |
| `recorded_at` | |

Yayın transaction'ında yazılır. Adres yeniden canlı bir sayfaya verilince satır silinir.

### `site_domains`

| Kolon | Kısıt |
|---|---|
| `id` | PK |
| `tenant_id`, `site_id` | |
| `hostname` | Normalize (IDNA, küçük harf); **platform genelinde** `unique` |
| `status` | `pending` · `verified` · `failed` |
| `is_primary` | Site başına en çok bir `true` (kısmi unique indeks) |
| `challenge_name`, `challenge_value`, `challenge_expires_at` | DNS TXT görevi |
| `verified_at`, `last_checked_at`, `failure` (jsonb) | |
| `created_at` | |

### `api_credentials`

| Kolon | Kısıt |
|---|---|
| `id` | PK |
| `tenant_id`, `site_id` | |
| `name`, `prefix` | `prefix` ilk 6 karakter (gösterim) |
| `secret_hash` | SHA-256; `unique` |
| `previous_secret_hash`, `previous_valid_until` | Rotasyon örtüşmesi (24 saat) |
| `scopes` | text[]; `delivery:read`, `manifest:write` |
| `status` | `active` · `revoked` |
| `expires_at`, `last_used_at`, `rotated_at`, `revoked_at` | |
| `created_by_realm`, `created_by_id`, `created_at` | |

Ham anahtar hiçbir tabloda ve logda bulunmaz.

### `webhook_endpoints`

| Kolon | Kısıt |
|---|---|
| `id` | PK |
| `tenant_id`, `site_id` | |
| `url`, `description` | |
| `events` | text[] |
| `status` | `active` · `disabled` · `deleted` |
| `secret_encrypted` | Uygulama anahtarıyla şifreli (envelope) |
| `previous_secret_encrypted`, `previous_valid_until` | Sır rotasyonu |
| `last_success_at`, `last_failure_at` | |
| `created_by_realm`, `created_by_id`, `created_at`, `row_version` | |

### `webhook_events` (outbox, değişmez)

| Kolon | Kısıt |
|---|---|
| `id` | PK; yükteki `eventId` |
| `tenant_id`, `site_id` | |
| `type` | Olay türü |
| `payload` | jsonb; kişisel veri ve alan değeri içermez |
| `created_at` | |

Yayın, kaldırma, paket, şema ve manifest olaylarıyla **aynı transaction'da** yazılır.

### `webhook_deliveries`

| Kolon | Kısıt |
|---|---|
| `id` | PK |
| `tenant_id`, `site_id`, `endpoint_id`, `event_id` | `unique (endpoint_id, event_id)` |
| `status` | `pending` · `delivered` · `dead` · `cancelled` |
| `attempts`, `next_attempt_at` | İndeks: `(status, next_attempt_at)`; worker `FOR UPDATE SKIP LOCKED` |
| `responses` | jsonb; son 10 deneme (durum kodu, hata kodu; yanıt gövdesi en çok 1 KB, kişisel veri süzülür) |
| `created_at`, `delivered_at` | |

### `frontend_manifests` (sürümler değişmez)

| Kolon | Kısıt |
|---|---|
| `id` | PK |
| `tenant_id`, `site_id` | |
| `version` | `unique (site_id, version)` |
| `manifest` | jsonb; en çok 64 KB |
| `checksum` | `unique (site_id, checksum)` |
| `active` | Site başına en çok bir `true` (kısmi unique indeks) |
| `source` | `platform` · `credential` |
| `created_by_realm`, `created_by_id`, `created_at`, `activated_at` | |

## Aşama 7 tabloları

Sözleşme: [13-forms.md](13-forms.md), [14-operations.md](14-operations.md). Bütün tablolar `tenant_id`, `site_id` taşır ve RLS ile kapsanır. Form başvuruları ayrı izin sınıfıdır: public DB rolü bu tabloları okuyamaz.

### `forms`

| Kolon | Kısıt |
|---|---|
| `id` | PK |
| `tenant_id`, `site_id` | |
| `key` | `unique (site_id, key)`; değiştirilemez |
| `title` | jsonb (dile göre) |
| `status` | `active` · `disabled` |
| `settings` | jsonb `{ allowFiles, retentionDays, successMessage }` |
| `draft` | jsonb form tanımı |
| `current_version_id` | FK `form_versions`; `null` = yayınlanmadı |
| `created_at`, `updated_at`, `row_version` | |

### `form_versions` (değişmez)

| Kolon | Kısıt |
|---|---|
| `id` | PK |
| `form_id` | FK; `unique (form_id, version)` |
| `version`, `consent_version` | Onay metni değişince `consent_version` artar |
| `definition` | jsonb |
| `created_by_realm`, `created_by_id`, `created_at` | |

### `form_submissions`

| Kolon | Kısıt |
|---|---|
| `id` | PK |
| `tenant_id`, `site_id`, `form_id`, `form_version_id` | |
| `confirmation_id` | Opak kod; `unique` |
| `status` | `unread` · `read` · `in_progress` · `resolved` · `spam` · `archived`; indeks `(form_id, status, created_at desc)` |
| `spam_reason` | `honeypot` vb. |
| `locale` | |
| `values` | jsonb. **[Sözleşme]** Hassas alanlar zarf anahtarıyla şifreli (`values_encrypted`, `key_id`) |
| `consent_version`, `consent_accepted_at`, `marketing_consent` | |
| `ip_hash`, `ip_hash_expires_at` | Günlük tuzlu özet; 7 gün sonra `null` |
| `note`, `handled_by_id` | |
| `delete_after` | Saklama süresi sonu; zamanlayıcı siler. İndeks `(delete_after)` |
| `created_at`, `updated_at`, `row_version` | |

### `form_uploads`

| Kolon | Kısıt |
|---|---|
| `id` | PK |
| `tenant_id`, `site_id`, `form_id`, `form_version_id`, `field_key` | Bağlama |
| `nonce_hash` | Gönderim anahtarının SHA-256 özeti |
| `file_name`, `declared_size`, `size`, `mime_type`, `sha256`, `object_key` | Özel depo |
| `status` | `pending` · `ready` · `consumed` |
| `submission_id` | Gönderimde bağlanır |
| `expires_at` | 30 dakika; kullanılmayan yükleme silinir |

### `notifications`

| Kolon | Kısıt |
|---|---|
| `notifications.id` | PK |
| `tenant_id`, `site_id`, `user_id` | Kullanıcı yalnız kendininkini okur (RLS) |
| `type`, `title`, `body`, `link` | Kişisel veri içermez |
| `dedup_key`, `count` | Okunmamış aynı anahtar tekilleştirilir: kısmi unique `(user_id, site_id, dedup_key) where read_at is null` |
| `actor`, `read_at`, `created_at`, `updated_at` | |

### `exports`

| Kolon | Kısıt |
|---|---|
| `id` | PK |
| `tenant_id`, `site_id` | |
| `kind` | `site` · `module` · `formSubmissions` |
| `module_key`, `form_key`, `options` | |
| `file_name`, `object_key`, `content_type`, `size`, `row_count`, `checksum` | Özel ve şifreli depo |
| `status` | `pending` · `ready` · `failed` · `expired` |
| `expires_at` | Hazır + 24 saat |
| `job_id`, `created_by_id`, `created_at`, `downloads` | |

### `jobs`

| Kolon | Kısıt |
|---|---|
| `id` | PK |
| `tenant_id`, `site_id` | Kiracı başına adalet |
| `kind` | `export` |
| `target_id` | `exports.id` |
| `status`, `progress`, `attempts`, `failure` | İndeks `(status, created_at)`; işçi `FOR UPDATE SKIP LOCKED` |
| `created_by_id`, `created_at`, `started_at`, `finished_at` | |

### Ek kolonlar

- `sites.archived_locales`: text[]. Kaldırılan diller; değerleri silinmez.

## Aşama 8 ekleri

Sözleşme: [15-site-data.md](15-site-data.md).

- `tenants.purged_at`. `tenants.status` değerlerine `PURGED` eklenir.
- `sites.cloned_from`: jsonb `{ site_id, at, include }` veya `null`.
- `deletion_ledger` (değişmez): `id`, `tenant_id`, `site_ids` (uuid[]), `purged_at`, `purged_by_id`, `reason`, `counts` (jsonb). Yedekten geri yüklemede yeniden uygulanır. Platform rolüne açıktır; kiracı RLS'inin dışındadır.

## Değişiklik geçmişi

| Tarih | Değişiklik |
|---|---|
| 16 Kas 2026 | İlk sürüm (Aşama 1): kimlik, oturum, MFA, sıfırlama, tenant, site, üyelik, site yetkisi, davet, audit, idempotency, rate limit tabloları. |
| 16 Kas 2026 | Aşama 2: `field_groups`, `module_templates`, `template_versions`, `presets`, `preset_versions`, `module_instances`, `schema_versions`; `sites.preset_*`; `entries` için Aşama 2 kolonları. |
| 17 Kas 2026 | Aşama 3: `entries` tam tanımı, `entry_unique_values`, ilişki bütünlüğü kuralları. |
| 17 Kas 2026 | Aşama 4: `asset_folders`, `assets`, `asset_variants`, `upload_sessions`, `asset_references`. |
| 17 Kas 2026 | Aşama 5: `entry_revisions`, `published_snapshots`, `entry_comments`, `scheduled_jobs`, `releases`, `release_items`, `preview_tokens`; `entries` iş akışı ve yayın işaretçisi kolonları; `sites.release_version`. |
| 17 Kas 2026 | Aşama 6: `route_history`, `site_domains`, `api_credentials`, `webhook_endpoints`, `webhook_events`, `webhook_deliveries`, `frontend_manifests`; `sites` entegrasyon ve `publishing_tools` kolonları. |
| 18 Kas 2026 | Aşama 7: `forms`, `form_versions`, `form_submissions`, `form_uploads`, `notifications`, `notification_preferences`, `exports`, `imports`, `jobs`, `site_configs`; `entries.import_key`, `sites.archived_locales`. |
| 18 Kas 2026 | Aşama 8: `tenants.legal_hold`, `tenants.purged_at`, `sites.cloned_from`, `deletion_ledger`. |
| 18 Kas 2026 | İki adımlı doğrulama kaldırıldı (ADR-055): `recovery_codes`, `mfa_challenges` tabloları ve kullanıcı tablolarındaki `mfa_*` kolonları yok. |
| 18 Kas 2026 | Sade yetki modeli (ADR-056): `site_grants`, `invites`, `entry_comments` tabloları ve `platform_users.role`, `entries.review`/`approval` kolonları kaldırıldı; `tenant_memberships` hesap–müşteri bağı oldu (tek hesap); `customer_users.password_hash` `null` olabilir; kurulum bağlantısı 7 gün. |
| 18 Kas 2026 | Sadeleştirme (ADR-057): `releases`, `release_items`, `imports`, `site_configs`, `notification_preferences` tabloları; `published_snapshots.release_id`, `scheduled_jobs.release_id`, `sites.publishing_tools`, `form_submissions.legal_hold`, `tenants.legal_hold`, `entries.import_key` kolonları kaldırıldı. |
