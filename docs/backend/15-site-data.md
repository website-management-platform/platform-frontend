# 15 — Site kopyalama ve kalıcı silme (`site-data`)

Şartname §11, §15 (`sites/{id}/actions/clone`), §18 (site kopyalama), §19 ve §25.8 (veri yaşam döngüsü), AT-64.

| Yöntem | Yol (`/api/v1` altında) | Amaç | İzin |
|---|---|---|---|
| POST | `/platform/sites/{siteId}/actions/clone` | Siteyi kopyala | `platform.site.manage` |
| POST | `/platform/tenants/{tenantId}/actions/purge` | Arşivlenmiş müşterinin verisini kalıcı sil | `platform.tenant.manage` |

**Durum:** Backend'de uygulanmıştır (`platform-api` `com.wmp.platform.sitedata`; backend ADR-0012). Kopyalama tek istekte (senkron) yapılır; medya nesne deposunda sunucu tarafında kopyalanır. Kalıcı silme veritabanında tek bir yetkili fonksiyonla yapılır, dosyalar işlem tamamlanınca silinir. Panel ekranları:

- Platform → Site → "Kopyala"
- Platform → Müşteri → Genel → "Kalıcı silme" (yalnız arşivlenmiş müşteride)

---

## 1. Site kopyalama

`POST …/actions/clone` (`Idempotency-Key` zorunlu)

```json
{ "tenantId": "uuid?", "key": "kalliope-kopya", "displayName": "Kalliope Kopya", "primaryDomain": null, "include": { "content": true, "media": true } }
```

| Kural | Ayrıntı |
|---|---|
| Hedef müşteri | Verilmezse kaynakla aynı müşteri. Müşteri etkin olmalı (`409 TENANT_NOT_ACTIVE`) ve site sınırı dolmamış olmalı (`409 QUOTA_EXCEEDED`). |
| Kaynak | Arşivlenmiş site kopyalanamaz (`409 INVALID_STATE_TRANSITION`) |
| Alan doğrulaması | Site oluşturmayla aynı: `key` müşteride tekil, `displayName`, isteğe bağlı `primaryDomain` ([02-tenancy.md](02-tenancy.md)) |
| Seçenek | `include.media` yalnız `include.content` ile birlikte (`422`) |

**Her zaman kopyalananlar:**

- Dil, varsayılan dil ve saat dilimi.
- Yayın araçları ve dil geri dönüşü ayarı.
- Arşivlenmemiş modüller ve etkin şema sürümleri. Sürüm numarası korunur, böylece manifest kopyası aynı sürümleri bildirir.
- Etkin frontend manifest'i (sürüm 1 olarak).
- Ana ekran yapılandırması.
- Form tanımları ve yayındaki sürümleri.

**İsteğe bağlı:**

- `content`: Bütün kayıtlar yeni kimliklerle kopyalanır.
  - İlişkiler, ağaç üst kayıtları, menü öğeleri ve bölüm içerik kaynakları yeni kimliklere eşlenir.
  - Kayıtlar **taslak** olarak yazılır, revizyon kaynağı `clone`. Hiçbir şey yayınlanmaz.
  - Medya kopyalanmadıysa medya referansları kaldırılır.
- `media`: Hazır (`ready`) dosyalar yeni kimlikle ve nesne deposunda kopyalanarak taşınır. Referanslar yeni kimliğe eşlenir.

**Hiçbir zaman kopyalanmayanlar:**

- kullanıcılar ve site yetkileri,
- alan adları, API anahtarları, webhook'lar, izinli kökenler ve yönlendirme alan adları,
- form başvuruları ve ekleri, bildirimler,
- revizyon geçmişi, planlar, yayın paketleri, önizleme belirteçleri, adres geçmişi, dışa ve içe aktarmalar.

Yeni site `deliveryAccess: public`, `releaseVersion: 0` ve `clonedFrom: { siteId, at, include }` ile oluşur.

Yanıt `201`: site sunumu + `clone: { modules, entries, assets, forms, manifest }`. Audit: `site.cloned` (`metadata.sourceSiteId` ve sayılar).

**[Sözleşme]** Backend büyük siteyi arka plan işi olarak kopyalar ([14-operations.md](14-operations.md) §6, iş türü `site.clone`); yeni site iş bitene kadar `PROVISIONING` durumunda kalır. Bu sürümde kopyalama senkrondur (site başına 10 GB medya sınırı, dosyalar depoda sunucu tarafında kopyalanır); arka plan işi gerekirse eklenir.

## 2. Yasal saklama

Yasal saklama yoktur (ADR-057). `actions/legal-hold` ucu tanımlı değildir. Kalıcı silmenin koruması arşiv şartı ve ad yazarak onaydır (§3).

## 3. Kalıcı silme (purge)

`POST /platform/tenants/{tenantId}/actions/purge` (`If-Match` zorunlu)

```json
{ "confirm": "Silinecek Müşteri", "reason": "Sözleşme bitti, dışa aktarma teslim edildi" }
```

| Kural | Hata |
|---|---|
| Müşteri **arşivlenmiş** olmalı (akış: arşiv → dışa aktarma penceresi → silme) | `409 INVALID_STATE_TRANSITION` |
| `confirm` müşteri adının aynısı olmalı | `422`, `confirm` `INVALID` |
| Gerekçe 5–500 karakter | `422`, `reason` `REQUIRED` |

**Silinenler:**

- Müşterinin bütün siteleri ve site kapsamlı bütün tablolar ([09-data-model.md](09-data-model.md) Aşama 1–7).
- Nesne deposundaki dosyalar: medya, form ekleri, dışa aktarmalar.
- Müşteri hesabının müşteriye bağı. Hesabın müşteri oturumları kapanır; kimlik kaydı (e-posta) korunur.

**Kalanlar:**

- Müşteri satırı mezar taşı olarak kalır (`status: PURGED`, `purgedAt`).
- Silme defterine (`deletion_ledger`) kayıt düşer: kiracı, site kimlikleri, zaman, kişi, gerekçe, tablo başına silinen satır sayısı.
- Audit: `tenant.purged`. Denetim kaydı ayrı saklama politikasındadır ve silinmez (şartname §13).

**[Sözleşme]** Yedekten geri yüklemede silme defteri yeniden uygulanır; silinmiş müşteri yedekten geri dönmez. Silme işi arka plan işi olarak yürür ve önbellek temizliğini, iptal edilmiş kimlik bilgilerini ve kuyruktaki işlerin iptalini de içerir.

## 4. Hata kodları

| HTTP | Kod | Ne zaman |
|---|---|---|
| 409 | `INVALID_STATE_TRANSITION` | Arşivlenmemiş müşteriyi silme; arşivli siteyi kopyalama |
| 409 | `TENANT_NOT_ACTIVE` · `QUOTA_EXCEEDED` | Kopyalama hedefi |
| 422 | `VALIDATION_FAILED` | `key`, `displayName`, `include.media`, `confirm`, `reason` |

## 5. Veri modeli

[09-data-model.md](09-data-model.md) "Aşama 8":

- `tenants.purged_at`,
- `sites.cloned_from` (jsonb),
- `deletion_ledger` tablosu.

## Değişiklik geçmişi

| Tarih | Değişiklik |
|---|---|
| 18 Kas 2026 | İlk sürüm (Aşama 8): site kopyalama, yasal saklama, kalıcı silme ve silme defteri. |
| 18 Kas 2026 | Sadeleştirme (ADR-057): yasal saklama ve `LEGAL_HOLD` kaldırıldı. |
| 20 Kas 2026 | Backend'e taşındı (ADR-0012): senkron kopyalama, silme fonksiyonu ve silme defteri. Mock sunucusu bütünüyle kaldırıldı. |
