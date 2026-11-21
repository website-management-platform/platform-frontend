# 00 — Ortak API kuralları

Bu dosyadaki kurallar, aksi belirtilmedikçe bütün uçlar için geçerlidir. Modül dosyaları bu kuralları tekrar etmez, yalnız istisnaları yazar. Dayanak: şartname v1.1 §13, §15, §19, §25.5 ve §25.8.

Her kuralın yanında bugünkü durumu yazar:

- **[Mock: uygulandı]**: Kural `packages/mock-api` içinde çalışıyor ve panel buna göre davranıyor.
- **[Sözleşme]**: Kural bağlayıcı, ama ilgili uçlar henüz mock'a eklenmedi. Uçlar eklendikçe etiket güncellenir.

Not (21 Kas 2026): mock kaldırıldı; iki etiketli kuralların hepsi bugün backend'de uygulanmıştır.

---

## 1. Sürümleme, taban yol ve modüller

- Taban yol `/api/v1`. Ana sürüm yolun içindedir. **[Mock: uygulandı]**
- Geriye uyumlu değişiklikler aynı sürümde yapılır: yeni isteğe bağlı alan, yeni uç, yeni hata kodu. İstemciler tanımadıkları yanıt alanlarını yok sayar.
- Geriye uyumsuz değişiklikler yeni ana sürümle yapılır (şartname §15). Eski sürüm `Deprecation` ve `Sunset` başlıklarıyla duyurulur ve bir süre birlikte çalışır.
- Üç yüzey vardır. Her yüzeyin oturumu, CORS kuralları, rate limit'i ve önbellek politikası ayrıdır (§25.8):

| Yüzey | Yol öneki | Kimlik | Kullanan |
|---|---|---|---|
| Platform | `/api/v1/platform/**`, `/api/v1/auth/platform/**` | `platform` realm oturumu | Platform Admin paneli |
| Customer | `/api/v1/customer/**`, `/api/v1/auth/customer/**` | `customer` realm oturumu | Customer Admin paneli |
| Delivery (public) | `/api/v1/delivery/sites/{publicKey}/**` | Yok (rate limit ve izinli alanlar); isteğe bağlı sunucudan sunucuya kimlik | Müşteri web siteleri, SDK |
| Preview | `/api/v1/preview/sites/{publicKey}/**` | Kısa ömürlü önizleme token'ı | Müşteri web sitesinin önizleme modu |

- Modül dosyaları ve yol öneklerinin karşılığı [README.md](README.md) tablosundadır. Modül adı OpenAPI `tags` değeridir ve backend'de paket sınırıdır.
- Yol adları İngilizce, çoğul isim ve `kebab-case`'tir. Durum değiştiren komutlar `POST .../actions/{action}` biçimindedir (şartname §15: "State actions POST, never GET"). Örnekler: `/actions/suspend`, `/actions/publish`.
- Bütün kimlikler UUID'dir. Site UUID'si ile public key farklı değerlerdir; public key gizli bilgi sayılmaz.

## 2. Biçim

- İstek ve yanıt gövdesi JSON'dur, alan adları `camelCase`. **[Mock: uygulandı]**
- Mutasyon gövdesi bir JSON nesnesi olmalıdır. Geçersiz JSON, dizi veya ilkel değer gönderilirse `400 MALFORMED_REQUEST` döner. **[Mock: uygulandı]**
- Zaman damgaları ISO 8601 biçiminde, UTC ve milisaniyeli yazılır: `2026-11-16T15:30:00.000Z`.
  - İstemcinin gönderdiği zamanlar saat dilimi içermek zorundadır (`Z` veya `+03:00`).
  - Takvimde olmayan bir tarih (`2026-02-30`) `422` ile reddedilir.
- Site saat dilimi IANA adıyla verilir (`Europe/Istanbul`). Görüntüleme ve planlama bu saat dilimine göre yapılır. Saklama her zaman UTC'dir (şartname §10).
- Para değerleri float olarak tutulmaz: `{ "amount": "1250.00", "currency": "TRY" }`. `amount` ondalıklı bir string'dir (şartname §6).
- JSON'da `null`, alanın hiç gönderilmemesi (absent) ve boş string üç ayrı anlam taşır (şartname §6). Sunucu bunları birbirine dönüştürmez.
- Bilinmeyen alan içeren mutasyonlar reddedilir: `422 VALIDATION_FAILED`, hata öğesi kodu `UNKNOWN_FIELD`. Bu, mass assignment korumasıdır (şartname §15: "unknown keys rejected"). **[Mock: uygulandı]**
- `__proto__`, `constructor` ve `prototype` anahtarları gövdenin hiçbir derinliğinde kabul edilmez: `400 MALFORMED_REQUEST` (şartname §6 ve AT-40). **[Mock: uygulandı]**
- Gövde büyüklüğü sınırları şartname §19'daki varsayılanlardır. Aşılırsa `413 PAYLOAD_TOO_LARGE` döner.

| Sınır | Varsayılan |
|---|---|
| Kayıt (entry) payload'ı | 512 KiB |
| Şema/config | 256 KiB |
| Public form | 64 KiB (dosyalar ayrı) |
| İç içelik derinliği | 5 |

## 3. Kimlik doğrulama ve oturum

Kaynak: şartname §13. **[Mock: uygulandı]** Uçlar ve ayrıntı: [01-identity.md](01-identity.md).

- İki ayrı realm vardır: `platform` ve `customer`.
  - Aynı e-posta adresi iki realm'de iki ayrı kimlik sayılır.
  - Müşteri hesabı platform admin olamaz.
- Oturum sunucu tarafında tutulur (opaque) ve HttpOnly çerezle taşınır.
  - Çerez adları: `PLATFORM-SESSION`, `CUSTOMER-SESSION`.
  - Çerez özellikleri: `HttpOnly; Secure; SameSite=Lax; Path=/`, host-only (Domain belirtilmez).
  - Çerez adlarında realm öneki zorunludur: geliştirmede iki panel aynı host'u paylaşır ve çerezler porta göre ayrılmaz (ADR-005).
- Oturum kimliği veritabanında yalnız hash'i ile saklanır. Ham token hiçbir tabloda tutulmaz (şartname §14).
- Oturum süreleri:

| Süre | Platform | Customer |
|---|---|---|
| Boşta kalma | 30 dk | 60 dk |
| Mutlak | 12 saat | 24 saat |

  - Değerler yapılandırılabilir. "Beni hatırla" başlangıçta kapalıdır.
- Girişte ve yetki değişiminde oturum kimliği yenilenir (session fixation koruması).
- Süresi dolmuş veya iptal edilmiş oturum `401 UNAUTHENTICATED` döner ve çerezi silen başlığı taşır.
- Kullanıcının yetkisi geri alındığında oturum ve yetki önbelleği hemen geçersizleşir.

## 4. CSRF ve Origin denetimi

Kaynak: şartname §13 ("CSRF token + Origin validation mutating requests").

- Desen double-submit çerezdir. Sunucu realm'e özel çerezi yazar: `PLATFORM-XSRF-TOKEN` veya `CUSTOMER-XSRF-TOKEN`.
  - Çerez özellikleri: `SameSite=Strict; Path=/`. JavaScript okuyabilir (HttpOnly değildir).
  - İstemci her mutasyonda (`POST`, `PUT`, `PATCH`, `DELETE`) aynı değeri `X-XSRF-TOKEN` başlığıyla gönderir.
  - Durum: **[Mock: uygulandı]**
- İlk token `GET /api/v1/auth/{realm}/csrf` ile alınır ([01-identity.md](01-identity.md)). Girişte token yenilenir. **[Mock: uygulandı]**
- Realm yüzeyindeki her mutasyonda sunucu iki şeyi denetler:
  1. `Origin` başlığı o realm'in izinli köken listesinde olmalıdır.
  2. CSRF başlığı çerezle aynı olmalıdır.

  İkisinden biri tutmazsa `403 CSRF_TOKEN_INVALID` döner. **[Mock: uygulandı]**
- İstemci `CSRF_TOKEN_INVALID` aldığında token'ı yeniler ve isteği **bir kez** tekrarlar. **[Mock: uygulandı]**
- Giriş, çıkış ve şifre belirleme dahil bütün realm mutasyonları CSRF ister.
- Delivery yüzeyindeki anonim public form gönderiminde CSRF çerezi yoktur. Bunun yerine origin allowlist ve kötüye kullanım denetimleri uygulanır (şartname §17).
- CORS bir güvenlik sınırı değildir. Admin yüzeylerinde CORS tam eşleşmeli allowlist ile çalışır ve credentials yalnız admin kökenine açıktır.

## 5. Hata biçimi

RFC 9457 `application/problem+json` kullanılır. Alanlar şartname §15'teki listedir. **[Mock: uygulandı]**

```json
{
  "type": "https://example.invalid/problems/validation-failed",
  "title": "Doğrulama hatası",
  "status": 422,
  "detail": "Bazı alanlar geçersiz.",
  "instance": "/api/v1/customer/sites/5c0d.../modules/team/entries",
  "code": "VALIDATION_FAILED",
  "requestId": "req_3f9a1c2b7d4e5f60a1b2",
  "errors": [
    { "path": "values.fullName", "code": "REQUIRED", "message": "Ad soyad zorunludur." }
  ]
}
```

- `code` makine tarafından okunur ve istemcinin davranışını belirler. Kararlı tutulur; anlamı değişmez.
- `detail` kullanıcıya gösterilebilir. Dil, isteğin `Accept-Language` başlığına göre seçilir (varsayılan `tr`) ve boş olabilir.
- `type` değerindeki alan adı yer tutucudur; gerçek alan adı dağıtımda belirlenir.
- `instance` isteğin yoludur. `requestId`, yanıtın `X-Request-Id` başlığıyla aynıdır.
- `errors[].path` noktalı yol kullanır: `values.fullName`, `fields.2.key`, `values.photos.0.alt` (ADR-006).
- Yanıtta stack trace, SQL hatası veya kaydın varlığını sızdıran bilgi bulunmaz.
- `429` yanıtı `Retry-After` başlığını (saniye) taşır.
- Hata yanıtları `Cache-Control: no-store` başlığını taşır.

### Hata kodu kataloğu

Bu tablo, bütün modüllerde ortak kullanılan kodları içerir. Modüle özgü kodlar ilgili modül dosyasında tanımlanır ve buraya eklenir.

| Kod | HTTP | Anlamı | Durum |
|---|---|---|---|
| `MALFORMED_REQUEST` | 400 | Gövde JSON değil veya nesne değil; parametre biçimi bozuk; geçersiz cursor | Mock: uygulandı |
| `UNAUTHENTICATED` | 401 | Oturum yok, süresi dolmuş veya iptal edilmiş | Mock: uygulandı |
| `INVALID_CREDENTIALS` | 401 | E-posta veya şifre hatalı ya da hesap aktif değil (ayrım yapılmaz) | Mock: uygulandı |
| `CSRF_TOKEN_INVALID` | 403 | CSRF token eksik veya uyuşmuyor, ya da Origin izinli değil | Mock: uygulandı |
| `PERMISSION_DENIED` | 403 | Kapsam görünür ama gerekli aksiyon izni yok | Mock: uygulandı |
| `FIELD_WRITE_DENIED` | 403 | Kayıtta salt okunur alan değiştirilmek istendi; `errors` alan yollarını taşır | Mock: uygulandı |
| `NOT_FOUND` | 404 | Kayıt yok veya başka bir kapsama ait. Varlığı sızdırılmaz (şartname §15: "no enumeration") | Mock: uygulandı |
| `CONFLICT` | 409 | Benzersizlik, durum veya bağımlılık çakışması. Ayrıntı `errors` içinde ya da modüle özgü kodla verilir | Sözleşme |
| `INVALID_STATE_TRANSITION` | 409 | Kaydın şu anki durumunda bu işlem yapılamaz (ör. aktif kaydı geri alma, arşivdeki kaydı düzenleme) | Mock: uygulandı |
| `TENANT_NOT_ACTIVE` | 409 | Müşteri askıda veya arşivde; site açılamaz, şifre belirleme bağlantısı gönderilemez | Mock: uygulandı |
| `QUOTA_EXCEEDED` | 409 | Müşterinin site sınırı dolu | Mock: uygulandı |
| `IDEMPOTENCY_KEY_REUSED` | 409 | Aynı `Idempotency-Key` farklı bir gövdeyle kullanılmış | Mock: uygulandı |
| `SINGLETON_EXISTS` · `ENTRY_LIMIT` | 409 | Tek kayıtlı bölümde ikinci kayıt; bölümün kayıt sınırı dolu | Mock: uygulandı |
| `ASSET_IN_USE` · `FOLDER_NOT_EMPTY` | 409 | Kullanılan dosya veya dolu klasör silinemez | Mock: uygulandı |
| `HAS_CHILDREN` | 409 | Alt kaydı olan ağaç kaydı çöpe taşınamaz | Mock: uygulandı |
| `LIST_VERSION_MISMATCH` | 409 | Sıralama başka bir oturumda değişti; liste yenilenmeli | Mock: uygulandı |
| `NO_CHANGES` | 409 | Yayınlanacak değişiklik yok (taslak son sürümle aynı) | Mock: uygulandı |
| `DRY_RUN_STALE` | 409 | Dry-run'dan sonra taslak, dönüşüm planı veya kayıtlar değişti; dry-run yinelenmeli | Mock: uygulandı |
| `MIGRATION_BLOCKED` | 409 | Dönüştürülemeyen kayıt var; canlı veri değişmedi. İlk 20 kayıt hatası `errors` içinde (`entries.{entryId}.{alan}`) | Mock: uygulandı |
| `CONFIRMATION_REQUIRED` | 409 | Değişiklik API sözleşmesini bozuyor (anahtar, tip, ilişki); `confirmBreaking: true` gerekir | Mock: uygulandı |
| `KEY_CONFLICT` | 409 | Arşivden çıkarılan modülün anahtarını etkin başka bir modül kullanıyor | Mock: uygulandı |
| `DEPENDENCY_CONFLICT` | 409 | Kayıt başka bir kaydın bağımlılığı (ör. ilişki hedefi olan modül arşivlenemez) | Mock: uygulandı |
| `SCHEDULE_EXISTS` | 409 | Aynı türde bekleyen plan var | Mock: uygulandı |
| `PREVIEW_TOKEN_INVALID` · `PREVIEW_SCOPE_DENIED` | 401 · 403 | Önizleme belirteci geçersiz/süresi dolmuş/iptal (ayrım yapılmaz) · başka dil veya kayıt için | Mock: uygulandı |
| `CREDENTIAL_REQUIRED` | 401 | Özel sitede delivery okuma veya CI manifest kaydı için geçerli, kapsamlı API anahtarı yok ([11-delivery.md](11-delivery.md) §1, [12-integrations.md](12-integrations.md) §3) | Mock: uygulandı |
| `INVALID_CURSOR` | 400 | Delivery sayfa imlecinin imzası veya kapsamı (modül, dil, sıralama, süzgeç) geçersiz | Mock: uygulandı |
| `GONE` | 410 | Adres eskiden bir sayfaya aitti; sayfa yayından kalktı ([11-delivery.md](11-delivery.md) §6) | Mock: uygulandı |
| `SITE_UNAVAILABLE` | 503 | Delivery: site veya kiracı askıda | Mock: uygulandı |
| `SCAN_UNAVAILABLE` | 503 | Form eki tamamlanırken virüs tarayıcısına ulaşılamadı; `Retry-After` sonra yeniden denenir | Backend: uygulandı (13-forms §4) |
| `DOMAIN_TAKEN` · `DOMAIN_NOT_VERIFIED` · `PRIMARY_DOMAIN` | 409 | Alan adı başka sitede · doğrulanmamış ad birincil yapılamaz · birincil ad silinemez ([12-integrations.md](12-integrations.md) §2) | Mock: uygulandı |
| `MANIFEST_INCOMPATIBLE` | 409 | Frontend manifest'i yayındaki içerikle uyumsuz veya kırıcı şema sürümünü desteklemiyor ([12-integrations.md](12-integrations.md) §5) | Mock: uygulandı |
| `ORIGIN_NOT_ALLOWED` | 403 | Public form gönderimi izinli olmayan kökenden ([13-forms.md](13-forms.md) §3) | Mock: uygulandı |
| `FORM_VERSION_CHANGED` | 409 | Gönderilen form sürümü yayındaki sürüm değil | Mock: uygulandı |
| `EXPORT_NOT_READY` | 409 | Dışa aktarma dosyası hazırlanıyor ([14-operations.md](14-operations.md)) | Mock: uygulandı |
| `EXPORT_EXPIRED` | 410 | Dışa aktarma dosyasının 24 saatlik süresi doldu | Mock: uygulandı |
| `IMPACT_CHANGED` · `LOCALE_CHANGE_BLOCKED` | 409 | Dil değişikliği etki raporu güncel değil · engelleyen sorun var ([14-operations.md](14-operations.md) §8) | Mock: uygulandı |
| `PRECONDITION_FAILED` | 412 | `If-Match` değeri güncel ETag ile uyuşmuyor | Mock: uygulandı |
| `UPLOAD_EXPIRED` | 410 | Yükleme oturumunun süresi doldu | Mock: uygulandı |
| `PAYLOAD_TOO_LARGE` | 413 | Gövde veya dosya sınırı aşıldı | Mock: uygulandı |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | İçerik türü desteklenmiyor | Sözleşme |
| `VALIDATION_FAILED` | 422 | Anlamsal veya şema doğrulama hatası; ayrıntı `errors` içinde | Mock: uygulandı |
| `SCHEMA_INVALID` | 422 | Modül şeması veya alan grubu yayına uygun değil; `errors[].path` şema içi yoldur (`fields.2.settings.maxLength`) | Mock: uygulandı |
| `PRECONDITION_REQUIRED` | 428 | `If-Match` gereken bir uçta başlık gönderilmemiş (ADR-006) | Mock: uygulandı |
| `RATE_LIMITED` | 429 | İstek sınırı aşıldı; yanıt `Retry-After` taşır | Mock: uygulandı |
| `INTERNAL_ERROR` | 500 | Beklenmeyen hata. Ayrıntı yalnız sunucu loglarında, `requestId` ile bulunur | Mock: uygulandı |
| `SERVICE_UNAVAILABLE` | 503 | Bakım, askıdaki site veya tenant, ya da zorunlu bağımlılık (S3, DB, tarayıcı) arızası | Sözleşme |

`errors[].code` için ortak alan kodları şunlardır. Şema doğrulama ve alan değeri kodları [05-schema.md](05-schema.md) §5 ve §13'dedir.

| Kod | Anlamı |
|---|---|
| `REQUIRED` | Zorunlu alan boş |
| `INVALID` | Biçim geçersiz |
| `TOO_LONG` | Üst sınır aşıldı |
| `TOO_SHORT` | Alt sınırın altında |
| `OUT_OF_RANGE` | Değer izinli aralığın dışında |
| `NOT_UNIQUE` | Değer başka bir kayıtta kullanılıyor |
| `UNKNOWN_FIELD` | Tanımsız alan gönderilmiş |
| `INVALID_REFERENCE` | İlişki veya üst kayıt bulunamadı, başka modülde ya da çöpte |
| `TREE_CYCLE` | Ağaçta kayıt kendi altına taşınamaz |
| `READ_ONLY` | Hesaplanan alana değer yazılamaz |
| `ASSET_NOT_READY` · `ALT_REQUIRED` | Yayında: dosya henüz işleniyor · görselin alternatif metni yok |
| `RELATION_NOT_PUBLISHED` | Yayında: ilişki, menü veya içerik kaynağıyla bağlanan kayıt yayında değil |
| `CONSENT_REQUIRED` · `UPLOAD_INVALID` | Form: onay metni kabul edilmedi veya sürümü eski · ek bu başvuruya ait değil, süresi dolmuş veya kullanılmış |
| `FILES_DISABLED` · `FILES_IN_USE` · `TOO_MANY` | Form tanımı: dosya eki kapalı · taslakta dosya alanı varken kapatılamaz · izin verilenden fazla dosya |
| `SCHEMA_MISMATCH` | İçe aktarma planı: kaynak ve hedef alan tipleri farklı |
| `SECTION_NOT_SUPPORTED` | Yayında: sayfa bölümünün türü veya tasarım varyantı sitenin frontend manifest'inde yok ([10-site-structure.md](10-site-structure.md) §3) |
| `HOME_EXISTS` · `ROUTE_CONFLICT` | Sitede zaten ana sayfa var · aynı dilde aynı adresi başka sayfa kullanıyor |
| `LOCATION_TAKEN` | Bu yerleşimde (üst, alt, mobil, ikincil) zaten bir menü var |
| `REDIRECT_LOOP` · `REDIRECT_TARGET_NOT_ALLOWED` | Yönlendirme döngüsü · dış hedef izinli alan adlarında değil (açık yönlendirme koruması) |
| `INVALID_VALUE` · `UNKNOWN_LOCALE` | Değer kurala uymuyor (ör. yönlendirme kaynağı biçimi) · sitede olmayan dil |
| `SYSTEM_FIELD` | Şema yayınında: yapı modülünün sistem alanı silinmiş, arşivlenmiş veya tipi değişmiş ([05-schema.md](05-schema.md) §10) |
| `FORMAT_NOT_ALLOWED` · `SIZE_MISMATCH` | Yüklemede: dosya türü izinli değil · bayt sayısı bildirilenle uyuşmuyor |
| `KEY_CONFLICT` | Seçilen anahtar sitede başka bir modülde kullanılıyor (preset uygulamada yeniden adlandırma veya atlama gerekir) |
| `DUPLICATE` | Listede aynı öğe birden fazla kez geçiyor |
| `TOKEN_INVALID` | E-posta bağlantısındaki token geçersiz, süresi dolmuş veya kullanılmış (ayrım yapılmaz) |
| `INVALID_CREDENTIALS` | Davet kabulünde mevcut hesabın şifresi hatalı |
| `COMMON` · `CONTAINS_EMAIL` | Şifre politikası: yaygın şifre / e-postanın parçasını içeriyor (`TOO_SHORT`, `TOO_LONG` ile birlikte) |

## 6. Erişim denetimi sırası ve 403/404 ayrımı

Kaynak: şartname §13. **[Mock: uygulandı]** Müşteri tarafındaki algoritma: [03-access-control.md](03-access-control.md) "Etkin erişim algoritması".

Her istekte denetim şu sırayla yapılır:

1. Oturum
2. Aktif üyelik
3. Tenant ve site durumu
4. Aksiyon izni
5. Satır kapsamı

Bu sıranın sonuçları:

- Tenant kimliği istek gövdesinden alınmaz. Route bağlamındaki `siteId` üyelikle doğrulanır.
- Aktörün göremediği bir kapsama ait kimlik, var olsa bile `404 NOT_FOUND` döner. Tahmin edilmiş UUID ile erişim mümkün değildir (AT-02).
- Aktörün görebildiği ama aksiyon izni olmadığı kapsamda `403 PERMISSION_DENIED` döner.
- Yalnız arayüzde gizlemek güvenlik sayılmaz. Alan bazlı okuma ve yazma izinleri serializer ve mutation validator'da uygulanır. Gizli alan değeri yanıta girmez; `PATCH` diğer alanları korur.

## 7. Idempotency

Kaynak: şartname §15. **[Mock: uygulandı]**

- Şu işlemlerde `Idempotency-Key` başlığı zorunludur: create, publish, public form gönderimi. Hangi uçların zorunlu tuttuğu uç dosyasında yazılır. Başlık eksikse `400 MALFORMED_REQUEST` döner.
- Anahtar biçimi `^[A-Za-z0-9_-]{8,128}$`'dir. İstemci UUID üretir.
- Kayıt kapsamı aktör + kapsam (tenant/site) + method + route + anahtardır. Saklama süresi 24 saattir.
- Aynı anahtar ve aynı gövde gelirse ilk yanıt tekrar döner, `Idempotent-Replayed: true` başlığıyla.
- Aynı anahtar farklı bir gövdeyle gelirse `409 IDEMPOTENCY_KEY_REUSED` döner.
- Gövde karşılaştırması, anahtar sırasından bağımsız kanonik bir JSON hash'iyle yapılır.

## 8. Eşzamanlılık: ETag ve If-Match

Kaynak: şartname §10, §15 ve §25.4. **[Mock: uygulandı]** Tenant ve site için uygulandı; koşullu `GET` (304) delivery aşamasında eklenecek.

- Düzenlenebilir her kaynak (kayıt, config taslağı, site ayarları) yanıtta `ETag` başlığını taşır. Değer, kaydın head sürümünü kapsar (`row_version`). Aynı değer gövdede `version` alanı olarak da döner; istemci `If-Match` başlığına bu değeri aynen yazar (ADR-014). Oluşturma yanıtı (`201`) da `ETag` taşır; istemci yeni kaynağı ek bir okuma yapmadan düzenleyebilir veya yayınlayabilir. **[Mock: uygulandı]**
- Bu kaynakları değiştiren `PATCH` ve aksiyon istekleri `If-Match` ister.
  - Başlık yoksa `428 PRECONDITION_REQUIRED` döner.
  - Başlık güncel değilse `412 PRECONDITION_FAILED` döner. Sessizce üzerine yazılmaz.
  - İstemci fark ekranını gösterir ve seçimi kullanıcıya bırakır.
- Şema veya config değiştiğinde ilgili ETag'ler geçersizleşir.
- Koşullu `GET` (`If-None-Match` → `304`) delivery yüzeyinde desteklenir.

## 9. Sayfalama, sıralama ve süzme

Kaynak: şartname §15. Admin sayfa numaralı sayfalama **[Mock: uygulandı]**; delivery imleci **[Mock: uygulandı]** (imzalı, sorguya bağlı; [11-delivery.md](11-delivery.md) §5).

**Delivery yüzeyi** cursor ile sayfalanır:

- Parametreler `limit` (varsayılan 20, en fazla 100) ve `cursor`'dır.
- Cursor opaktır. İçinde sıralama değeri, `id` ve kapsam bulunur; sunucu tarafından imzalanır veya doğrulanır. Geçersiz cursor `400 MALFORMED_REQUEST` döner.
- Yanıt `meta.nextCursor` alanını taşır.

**Admin yüzeyleri** tablo deneyimi için sayfa numarasıyla da sayfalanabilir:

- Parametreler `page` (1'den başlar) ve `size`'dır (varsayılan 20, en fazla 100).
- En büyük offset sınırı vardır; aşılırsa `422` döner.
- Yanıt `{ "items": [...], "page": 1, "size": 20, "total": 134, "hasNext": true }` biçimindedir. Geçersiz `page`/`size` `400 MALFORMED_REQUEST` döner.
- `total` yalnız istendiğinde ve yetkili aktöre döner (`includeTotal=true`). Pahalı sorgularda üst sınır uygulanır.

**Sıralama:**

- Parametre `sort=alan,-alan` biçimindedir. Yalnız izinli alanlar kabul edilir.
- Eşitlikleri bozmak için her zaman `id` eklenir, böylece sıra deterministik olur.
- Delivery yüzeyinde varsayılan sıralama `position asc, id asc`'dir.

**Süzme:**

- Operatörler tiplidir: `eq`, `ne`, `in`, `contains`, `startsWith`, `gt`, `gte`, `lt`, `lte`, `exists`.
- Yalnız indeksli veya izinli alanlarda kullanılabilir.
- Sınırlar: en fazla 20 koşul, toplam sorgu uzunluğu 2 KiB.
- Kullanıcıdan gelen SQL veya `ORDER BY` parçası sorguya girmez.
- `fields` ve `include` allowlist'tir ve public/alan izinlerini aşamaz.
- `include` derinliği en fazla 2'dir; bir istekte en fazla 50 ilişki genişletilir.

## 10. Rate limit

Kaynak: şartname §19 (başlangıç değerleri, yapılandırılabilir). Giriş, şifre sıfırlama ve delivery sınırları **[Mock: uygulandı]**; admin yüzey sınırları **[Sözleşme]**.

| Yüzey | Sınır | Anahtar |
|---|---|---|
| Delivery (public) | 100 istek/dk; medya ucu 600 istek/dk ayrı sayaç | IP + site (özel modda anahtar) |
| Admin (platform, customer) | 120 istek/dk | Kullanıcı |
| Public form gönderimi | 10 istek/dk | IP + form |
| Başarısız giriş | 15 dakikada 5 | Realm + e-posta + IP |
| Şifre sıfırlama isteği | 15 dakikada 3 | Realm + e-posta |

- Sınır aşılırsa `429 RATE_LIMITED` ve `Retry-After` başlığı döner.
- Giriş ve sıfırlama uçlarında hata mesajı geneldir; hesabın var olup olmadığı belli edilmez.
- Sayaçlar küme genelinde tutarlıdır (DB veya Redis adaptörü).

## 11. İz kimliği

- Her yanıt `X-Request-Id` başlığını taşır. Hata gövdesindeki `requestId` ile aynıdır. **[Mock: uygulandı]**
- Kimlik, istekten doğan job ve webhook teslimatlarına da taşınır. Loglarda bu kimlikle arama yapılır.
- Panel, hata ekranında bu değeri "Destek kodu" olarak gösterir ve kopyalamaya izin verir.

## 12. Önbellek

Kaynak: şartname §15. **[Sözleşme]**

| Yüzey | Kural |
|---|---|
| Admin ve preview | `Cache-Control: no-store` (mock bütün yanıtlarda uygular) |
| Delivery | `public, max-age=60`; `stale-while-revalidate=300` yalnız site izin verirse (`allowStaleWhileRevalidate`). Zayıf ETag gövde özetidir; `If-None-Match` → `304`. Yanıt `meta.releaseVersion` taşır; yayında artar. Medya `max-age=86400`. **[Mock: uygulandı]** ([11-delivery.md](11-delivery.md) §2) |
| Delivery önbellek anahtarı | Tenant, site, dil, şema sürümü, release sürümü ve kitle (audience) |

Paylaşımlı önbellek admin yanıtlarını saklamaz.

## 13. Kısmi güncelleme (PATCH) gövdesi

Kaynak: şartname §15. **[Sözleşme]**

Kayıt değerleri için varsayılan PATCH gövdesi şöyledir:

```json
{ "set": { "title": "Yeni unvan" }, "unset": ["subtitle"], "locale": "tr" }
```

- `set` alanları değiştirir; `unset` alanı kaldırır. Açık `null` ile `unset` farklı anlamlar taşır.
- Diziler bütün olarak değiştirilir. İç içe gruplar da bütün olarak değiştirilir.
- `locale` verilirse yalnız o dilin değerleri ve açıkça gönderilen ortak alanlar değişir; diğer dillerin değerleri korunur (§25.4).
- Alan anahtarı veya alan UUID'si gönderilebilir; sunucu ikisini normalize eder.

## 14. Güvenlik başlıkları

Kaynak: şartname §19. **[Sözleşme]**

| Başlık | Değer |
|---|---|
| `Strict-Transport-Security` | Üretimde zorunlu |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `no-referrer` (paneller de aynı politikayı meta etiketiyle uygular) |
| `Content-Security-Policy` | Kısıtlayıcı; `frame-ancestors 'none'` (yalnız önizleme için açık istisna) |
| `Permissions-Policy` | Kısıtlayıcı |

## Değişiklik geçmişi

| Tarih | Değişiklik |
|---|---|
| 16 Kas 2026 | İlk sürüm (Aşama 0). CSRF, Origin denetimi, hata biçimi ve iz kimliği mock'ta uygulandı; diğer kurallar sözleşme olarak tanımlandı. |
| 16 Kas 2026 | Aşama 1: oturum, erişim sırası, idempotency, ETag/If-Match, admin sayfalama, giriş/sıfırlama rate limit'i, bilinmeyen alan ve prototip anahtarı reddi mock'ta uygulandı; Aşama 1 hata kodları kataloğa eklendi. |
| 16 Kas 2026 | Aşama 2: şema yaşam döngüsü hata kodları (`SCHEMA_INVALID`, `NO_CHANGES`, `DRY_RUN_STALE`, `MIGRATION_BLOCKED`, `CONFIRMATION_REQUIRED`, `KEY_CONFLICT`, `DEPENDENCY_CONFLICT`) eklendi; yinelenen `OUT_OF_RANGE` satırı kaldırıldı. |
| 17 Kas 2026 | Aşama 3: kayıt hata kodları (`FIELD_WRITE_DENIED`, `SINGLETON_EXISTS`, `ENTRY_LIMIT`, `HAS_CHILDREN`, `LIST_VERSION_MISMATCH`; alan kodları `INVALID_REFERENCE`, `TREE_CYCLE`, `READ_ONLY`). |
| 17 Kas 2026 | Aşama 5: yayın hata kodları (`APPROVAL_REQUIRED`, `STALE_REVISION`, `SELF_APPROVAL_FORBIDDEN`, `SCHEDULE_EXISTS`, `RELEASE_INVALID`, `ROLLBACK_BLOCKED`, `PREVIEW_TOKEN_INVALID`, `PREVIEW_SCOPE_DENIED`; alan kodu `RELATION_NOT_PUBLISHED`). |
| 17 Kas 2026 | Aşama 4: medya hata kodları (`UPLOAD_EXPIRED`, `ASSET_IN_USE`, `FOLDER_NOT_EMPTY`; alan kodları `ASSET_NOT_READY`, `ALT_REQUIRED`, `FORMAT_NOT_ALLOWED`, `SIZE_MISMATCH`); `PAYLOAD_TOO_LARGE` mock'ta uygulandı. |
| 17 Kas 2026 | Aşama 6: delivery ve entegrasyon kodları (`CREDENTIAL_REQUIRED`, `INVALID_CURSOR`, `GONE`, `SITE_UNAVAILABLE`, `DOMAIN_TAKEN`, `DOMAIN_NOT_VERIFIED`, `PRIMARY_DOMAIN`, `MANIFEST_INCOMPATIBLE`; alan kodları `SECTION_NOT_SUPPORTED`, `HOME_EXISTS`, `ROUTE_CONFLICT`, `LOCATION_TAKEN`, `REDIRECT_LOOP`, `REDIRECT_TARGET_NOT_ALLOWED`, `INVALID_VALUE`, `UNKNOWN_LOCALE`, `SYSTEM_FIELD`); delivery rate limit ve önbellek kuralı mock'ta uygulandı. |
| 18 Kas 2026 | Aşama 7: form, aktarma ve dil değişikliği kodları (`ORIGIN_NOT_ALLOWED`, `FORM_VERSION_CHANGED`, `IMPORT_NOT_VALIDATED`, `EXPORT_NOT_READY`, `EXPORT_EXPIRED`, `IMPACT_CHANGED`, `LOCALE_CHANGE_BLOCKED`; alan kodları `CONSENT_REQUIRED`, `UPLOAD_INVALID`, `FILES_DISABLED`, `FILES_IN_USE`, `TOO_MANY`, `SCHEMA_MISMATCH`). |
| 18 Kas 2026 | Aşama 8: `LEGAL_HOLD`. |
| 18 Kas 2026 | İki adımlı doğrulama kaldırıldı (ADR-055): `MFA_*` kodları ve MFA rate limit'i çıkarıldı. |
| 18 Kas 2026 | Sade yetki modeli (ADR-056): `SELF_ACTION_FORBIDDEN`, `LAST_OWNER`, `APPROVAL_REQUIRED`, `STALE_REVISION`, `SELF_APPROVAL_FORBIDDEN` kaldırıldı. |
| 18 Kas 2026 | Sadeleştirme (ADR-057): `ROLLBACK_BLOCKED`, `RELEASE_INVALID`, `LEGAL_HOLD`, `IMPORT_NOT_VALIDATED` kaldırıldı. |
| 18 Kas 2026 | `201` oluşturma yanıtlarında `ETag` başlığı (uçtan uca denetimde eksik bulundu). |
| 20 Kas 2026 | `SCAN_UNAVAILABLE` (503): form eki taranamadığında (13-forms §4). |
