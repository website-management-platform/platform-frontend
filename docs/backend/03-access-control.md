# 03 — Yetki (`access-control`)

Yetki modeli ürün sahibi kararıyla sadedir (ADR-056). Rol, davet ve ek kullanıcı yoktur:

- **Platform:** platforma kayıtlı her kullanıcı tam yetkili yöneticidir.
- **Müşteri:** her müşterinin **tek hesabı** vardır. Bu hesap müşterinin bütün sitelerinde bütün işlemleri yapar. Bir müşterinin birden çok sitesi olabilir.

İzin adları korunur. API her uçta izni denetlemeye devam eder; böylece ileride rol eklenirse uç sözleşmesi değişmez. Bugün her kullanıcı kendi tarafındaki izinlerin tamamına sahiptir.

Müşteri hesabının oluşturulması ve yönetimi platform tarafındadır: [02-tenancy.md](02-tenancy.md) "Müşteri hesabı".

---

## 1. Platform izinleri

İzinler oturum özetinde döner: `GET /auth/platform/me` → `permissions`. Her platform kullanıcısında hepsi vardır.

| İzin | Anlamı |
|---|---|
| `platform.tenant.read` | Müşterileri, müşteri hesabını ve genel bakışı görme |
| `platform.tenant.manage` | Müşteri ve hesabını oluşturma, düzenleme; askı/arşiv/geri alma; şifre belirleme bağlantısı gönderme |
| `platform.site.read` | Siteleri görme |
| `platform.site.manage` | Site oluşturma, düzenleme, askı/arşiv/geri alma; modül ve şema yaşam döngüsü ([05-schema.md](05-schema.md)) |
| `platform.audit.read` | Denetim kaydını görme |
| `platform.library.read` | Alan registry'si, alan grupları, şablonlar ve presetleri görme |
| `platform.library.manage` | Alan grubu, şablon ve preset oluşturma, düzenleme, sürüm yayını, kopyalama, arşiv |

Platform kullanıcısı sunumunda rol alanı yoktur ([01-identity.md](01-identity.md)).

---

## 2. Müşteri izinleri

Müşteri hesabı erişebildiği her sitede şu izinlerin tamamına sahiptir. İzinler bootstrap yanıtında döner: `GET /customer/sites/{siteId}/bootstrap` → `permissions`.

| İzin | Anlamı |
|---|---|
| `entry.read` · `entry.create` · `entry.update` · `entry.delete` | Kayıt okuma, oluşturma, düzenleme, çöp kutusuna taşıma |
| `entry.publish` | Yayınlama, yayından kaldırma, planlama |
| `entry.restore` | Çöp kutusundan ve revizyondan geri alma |
| `entry.export` | İçerik dışa aktarma |
| `asset.upload` · `asset.read` · `asset.delete` | Medya |
| `formSubmission.read` · `formSubmission.export` · `formSubmission.delete` | Form başvuruları |
| `audit.read` | Site işlem geçmişi |
| `site.settings.update` | Site ayarları; hassas alanların dışa aktarımı |

İnceleme/onay akışı yoktur; kayıt doğrudan yayınlanır ([06-content.md](06-content.md), [08-publishing.md](08-publishing.md)).

---

## 3. Etkin erişim algoritması

`GET /customer/sites`, bootstrap ve site kapsamlı her uç aynı algoritmayı kullanır:

1. Site var mı ve `ACTIVE` mi? Değilse → `404`.
2. Sitenin müşterisi `ACTIVE` mi? Değilse → `404`.
3. Hesap bu müşterinin hesabı mı (`ACTIVE` bağ)? Değilse → `404`.
4. Uç belirli bir izin istiyorsa ve izin yoksa → `403 PERMISSION_DENIED`. Sade modelde bu durum oluşmaz; denetim savunma amaçlı kalır.

Başka müşterinin sitesi her zaman `404` döner; varlığı sızdırılmaz (AT-02).

---

## 4. Veri modeli notu

Hesap–müşteri bağı `tenant_memberships` tablosunda tutulur ([09-data-model.md](09-data-model.md)):

- Bir müşterinin en çok bir `ACTIVE` bağı vardır (kısmi tekil indeks: `tenant_id WHERE status = 'ACTIVE'`).
- Bir hesap yalnız bir müşteriye bağlıdır (tekil indeks: `user_id`).
- `role` sütunu her zaman `TENANT_OWNER` değerindedir. Sütun ileride rol eklenebilmesi için kalır.

---

## Değişiklik geçmişi

| Tarih | Değişiklik |
|---|---|
| 16 Kas 2026 | İlk sürüm (Aşama 1): platform rolleri, site rolleri, üyelik ve davet uçları. |
| 16 Kas 2026 | Aşama 2: kütüphane izinleri; alan düzeyinde düzenleme kısıtı (`permissions.editRoles`). |
| 18 Kas 2026 | Üye sunumlarından `mfaEnabled` çıkarıldı (ADR-055). |
| 18 Kas 2026 | **Sade yetki modeli (ADR-056).** Platform rolleri, site rolleri, `platform.member.manage`, `entry.review`, `user.invite`, alan düzeyinde rol kısıtı, davet ve üye uçları (`/platform/roles`, `/platform/tenants/{id}/members`, `/platform/tenants/{id}/invitations/{id}`, `/customer/sites/{id}/members`) kaldırıldı. Müşteri tek hesapla çalışır; hesap yönetimi 02-tenancy "Müşteri hesabı" bölümüne taşındı. |
