# 04 — Denetim kaydı (`audit`)

Şartname §13 ve §11'e göre audit kayıtları yalnız eklenir, sonradan değiştirilmez. Her kayıt şunları taşır:

- aktörün o anki anlık görüntüsü
- istek kimliği
- gizli değerlerden arındırılmış fark bilgisi

| Yöntem | Yol | Amaç | İzin |
|---|---|---|---|
| GET | `/api/v1/platform/audit` | Bütün audit olayları | `platform.audit.read` |

Mock'ta uygulanmıştır.

Henüz eklenmemiş olanlar:

- Müşteri tarafında site kapsamlı audit görünümü (`audit.read` izni) ileride eklenecek.
- Dışa aktarma (şartname §11 "filtre/export") Aşama 7'de, dışa aktarma işleriyle birlikte gelecek.

## Olay kaydı

```json
{
  "id": "uuid",
  "realm": "platform",
  "tenantId": "uuid | null",
  "siteId": "uuid | null",
  "actor": { "id": "uuid", "email": "sahip@platform.example.test", "displayName": "Platform Sahibi" },
  "action": "tenant.suspend",
  "targetType": "tenant",
  "targetId": "uuid",
  "summary": "Yeşil Doğa Derneği müşterisi askıya alındı",
  "metadata": { "from": "ACTIVE", "to": "SUSPENDED", "reason": "Ödeme gecikmesi nedeniyle geçici askı" },
  "requestId": "req_…",
  "createdAt": "…"
}
```

| Alan | Kural |
|---|---|
| `realm` | İşlemin yapıldığı yüzey: `platform` veya `customer` |
| `actor` | İşlem anındaki aktörün kopyasıdır; kişi sonradan değişse de kayıt değişmez. Kimliği doğrulanmamış istekte (ör. başarısız giriş, şifre sıfırlama isteği) `null` olur. |
| `summary` | Kullanıcının okuyacağı Türkçe özet. Şifre, token veya kişisel veri içermez. |
| `metadata` | İşleme özgü ayrıntı. Değişikliklerde `changes: { alan: { from, to } }` biçimindedir. Gizli ve hassas alanlar hiçbir zaman yazılmaz (şartname §13: "secret ve sensitive values loglanmaz"). |
| `requestId` | Yanıttaki `X-Request-Id` ile aynıdır; loglarda arama için kullanılır |

**Saklama:** Varsayılan süre 365 gündür (şartname §10). Üretim politikası ortam ayarıyla belirlenir; hukuki onay bekliyor. Audit tablosuna API rolüyle `UPDATE` ve `DELETE` yapılamaz.

## Olay kataloğu

| `action` | `targetType` | Ne zaman |
|---|---|---|
| `auth.login` | user | Başarılı giriş |
| `auth.login_failed` | user / null | Hatalı giriş; hesap yoksa `targetId` null |
| `auth.logout` | session | Çıkış |
| `auth.session_revoked` | session | Oturum sonlandırıldı |
| `auth.password_reset_requested` | user | Sıfırlama istendi (hesap varsa) |
| `auth.password_reset` | user | Şifre sıfırlandı; oturumlar kapatıldı |
| `auth.password_changed` | user | Şifre değiştirildi; diğer oturumlar kapatıldı |
| `tenant.created` · `tenant.updated` | tenant | Müşteri oluşturma ve düzenleme |
| `tenant.suspend` · `tenant.archive` · `tenant.restore` | tenant | Durum değişikliği; `metadata.reason` |
| `site.created` · `site.updated` | site | Site oluşturma ve düzenleme |
| `site.suspend` · `site.archive` · `site.restore` | site | Durum değişikliği |
| `account.created` · `account.updated` | user | Müşteri hesabı oluşturma ve düzenleme (platformdan) |
| `account.setupLinkSent` | user | Şifre belirleme bağlantısı gönderildi |
| Şablon, preset, alan grubu ve site modülü olayları | | [05-schema.md](05-schema.md) §12 |
| `entry.created` · `entry.updated` · `entry.duplicated` | entry | Müşteri kaydı oluşturma, değiştirme (`metadata.fields`, `metadata.locale`), kopyalama |
| `entry.publish` · `entry.unpublish` · `entry.trash` · `entry.restore` · `entry.move` | entry | Kayıt durumu ve hiyerarşi; toplu işlemde `metadata.bulk: true` |
| `entry.reordered` | module | Bölümde sıralama değişti |
| `entry.schedule` · `entry.cancel-schedule` | entry | Plan; `metadata.jobId`, `executeAt`, `revisionId` |
| `entry.revisionRestored` | entry | Eski revizyonu geri yükleme (`metadata.revisionNumber`) |
| `schedule.failed` | entry | Planlı işlem uygulanamadı; aktör `null` (sistem), `metadata.failure` |
| `preview.created` · `preview.revoked` | previewToken | Önizleme belirteci (belirtecin kendisi yazılmaz) |
| `asset.uploaded` · `asset.rejected` · `asset.updated` · `asset.moved` · `asset.archived` | asset | Medya yükleme (ret gerekçesi `metadata.reason`), üst bilgi, taşıma, silme |
| `assetFolder.created` | assetFolder | Medya klasörü |
| `site.integrationUpdated` | site | Erişim ayarları (özel mod, kökenler, yönlendirme alan adları, dil geri dönüşü); `metadata.changed` ([12-integrations.md](12-integrations.md)) |
| `domain.added` · `domain.verified` · `domain.primaryChanged` · `domain.removed` | domain | Alan adı ve DNS doğrulaması |
| `credential.created` · `credential.rotated` · `credential.revoked` | credential | API anahtarı; `metadata.scopes` (anahtarın kendisi yazılmaz) |
| `webhook.created` · `webhook.updated` · `webhook.deleted` · `webhook.secretRotated` · `webhook.retried` | webhook | Webhook uç noktası ve teslim (sır yazılmaz) |
| `manifest.registered` · `manifest.activated` | manifest | Frontend manifest'i; `metadata.buildId` |
| `form.created` · `form.updated` · `form.published` | form | Form tanımı ve sürüm; `metadata.version`, `consentVersion` ([13-forms.md](13-forms.md)) |
| `formSubmission.received` | formSubmission | Web sitesinden başvuru (aktör yok, içerik yazılmaz) |
| `formSubmission.statusChanged` · `formSubmission.deleted` · `formSubmission.attachmentDownloaded` | formSubmission · form | Gelen kutusu işlemleri; toplu işlemde `metadata.bulk`, `count`. Kişisel veri yazılmaz, yalnız onay kodu. |
| `export.requested` · `export.downloaded` | export | Dışa aktarma; `metadata.kind`, `includeSensitive` ([14-operations.md](14-operations.md)) |
| `site.cloned` | site | Site kopyalama; `metadata.sourceSiteId` ve sayılar ([15-site-data.md](15-site-data.md)) |
| `tenant.purged` | tenant | Kalıcı silme; gerekçe ve site sayısı. Kalıcı silmede denetim kaydı korunur. |
| `site.localesChanged` · `job.retried` | site · job | Dil değişikliği (önce/sonra, uyarı kodları), işin elle yeniden denenmesi |

Zamanlayıcının yaptığı işlemlerde aktör `null` (sistem) olur; planı yapan kişi `metadata.scheduledBy` alanındadır.

Yeni modüller eklendikçe bu tabloya satır eklenir. Kayıt olaylarının `metadata` alanına alan **değerleri** yazılmaz, yalnız alan anahtarları yazılır (hassas veri sızmaz).

---

### `GET /api/v1/platform/audit`

| Parametre | Kural |
|---|---|
| `realm` | `platform` veya `customer` |
| `tenantId` | Tenant'a göre süzer |
| `action` | Önek eşleşmesi (ör. `tenant.` bütün tenant olaylarını getirir) |
| `q` | `summary` veya aktör e-postasında `tr-TR` küçük harf "içerir" araması |
| `page`, `size`, `includeTotal` | Varsayılan `size` 25, en fazla 100 |

Sıralama en yeniden en eskiyedir.

**Yanıt** — `200`

```json
{ "items": [ …olay ], "page": 1, "size": 25, "total": 42, "hasNext": true }
```

---

## Değişiklik geçmişi

| Tarih | Değişiklik |
|---|---|
| 16 Kas 2026 | İlk sürüm (Aşama 1): olay biçimi, katalog, platform listesi. |
| 17 Kas 2026 | Aşama 2–3: şema ve kayıt olayları kataloğa eklendi. |
| 17 Kas 2026 | Aşama 4: medya olayları. |
| 17 Kas 2026 | Aşama 5: inceleme, plan, revizyon, yorum, yayın paketi, önizleme ve sistem (zamanlayıcı) olayları. |
| 17 Kas 2026 | Aşama 6: entegrasyon olayları (erişim, alan adı, API anahtarı, webhook, manifest). |
| 18 Kas 2026 | Aşama 7: form, başvuru, dışa/içe aktarma, yapılandırma, dil değişikliği ve iş olayları. |
| 18 Kas 2026 | Aşama 8: site kopyalama, yasal saklama ve kalıcı silme olayları. |
| 18 Kas 2026 | `auth.mfa_enabled` ve `auth.recovery_codes_regenerated` olayları kaldırıldı (ADR-055). |
| 18 Kas 2026 | Sade yetki modeli (ADR-056): üye/davet ve inceleme/yorum olayları kaldırıldı; `account.created`, `account.updated`, `account.setupLinkSent` eklendi. Geçmiş kayıtlardaki eski olay adları okunmaya devam eder. |
| 18 Kas 2026 | Sadeleştirme (ADR-057): `release.*`, `import.*`, `tenant.legalHold*`, `site.configPublished` olayları kaldırıldı. Geçmiş kayıtlardaki eski olay adları okunmaya devam eder. |
| 18 Kas 2026 | `auth.password_changed` (ADR-058). |
