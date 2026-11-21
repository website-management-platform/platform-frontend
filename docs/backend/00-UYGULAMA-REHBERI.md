# 00 — Uygulama rehberi (backend)

Bu rehber backend'i yazacak ekip içindir. Panelin beklediği davranış bu klasördeki dosyalardadır. Ürünün tamamı ve gerekçeleri şartnamededir: `UNIVERSAL_WEBSITE_ADMIN_GELISTIRME_DOKUMANI_v1_1_DENETLENMIS.md` (v1.1).

## 1. Belge önceliği

Belgeler çeliştiğinde öncelik sırası:

1. Güvenlik ve veri izolasyonu kuralları (şartname §0)
2. Bu klasördeki uç dosyaları (`01-…`, `02-…`): panelin bugün çağırdığı ve mock'ta çalışan sözleşme
3. [00-conventions.md](00-conventions.md): ortak kurallar
4. Şartname v1.1

Uç dosyasıyla şartname arasında fark görülürse uç dosyası esas alınır ve fark [README.md](README.md) "Açık kararlar" tablosuna yazılır. Belgede olmayan bir uç, alan veya kural uydurulmaz.

## 2. Kapsam

Backend iki paneli ve public delivery yüzeyini besler. Kapsam dışı olanlar (şartname §1):

- e-ticaret sepeti, sipariş, ödeme ve stok
- site oluşturucu
- tema ve eklenti pazarı
- CRM ve ERP
- rezervasyon motoru
- hasta kaydı
- bağış ve aidat tahsilatı

## 3. Teknoloji

Şartname §2 aşağıdaki önerileri yapar. Bunlar ürün sahibinin henüz onaylamadığı önerilerdir; kesin seçim backend ekibine ve ürün sahibine aittir. Panel yalnız HTTP sözleşmesine bağlıdır ve backend teknolojisinden etkilenmez.

| Katman | Şartname önerisi |
|---|---|
| Uygulama | Node.js LTS + NestJS (TypeScript), REST + OpenAPI 3.x, modüler monolit |
| Veri | PostgreSQL. İlişkisel çekirdek + JSONB; SQL migration; full-text search |
| Nesne deposu | S3 uyumlu, private; imzalı URL |
| İş kuyruğu | PostgreSQL tabanlı kalıcı job + outbox; worker ayrı süreç |
| Medya | Sharp, FFmpeg/ffprobe; kısıtlı worker; virüs tarama adaptörü |
| Kimlik | Opaque sunucu oturumu, Argon2id; e-posta + şifre (MFA yok, ADR-055) |

## 4. Değişmez kurallar

Kaynak: şartname §13, §14 ve §19. Özet olarak:

- **Tenant izolasyonu:**
  - Her sorgu tenant ve site kapsamıyla çalışır.
  - Tenant ve site taşıyan tablolarda composite FK `(tenant_id, site_id, id)` ve PostgreSQL RLS (defense in depth) kullanılır.
  - API'nin DB rolü tablo sahibi değildir ve `BYPASSRLS` yetkisi yoktur.
  - Bağlam transaction'a özgü olarak ayarlanır (`SET LOCAL`).
- **Önce tanımla, sonra izin ver:** Yetki varsayılan olarak reddedilir. Format `resource.action` + kapsamdır.
- **Değişmez kayıtlar:** Revizyon, yayın snapshot'ı ve audit tablolarında `UPDATE` yapılmaz.
- **Yalnız hash saklanır:** Oturum, sıfırlama/kurulum, önizleme ve API anahtarlarının ham değeri tutulmaz.
- **Public yüzey yalnız yayınlananı okur.** Özel alan, secret, PII ve taslak hiçbir derinlikte dönmez.
- **Kullanıcı girdisi kod olarak çalıştırılmaz.** Kullanıcının verdiği JS, SQL, HTML, regex veya sorgu parçası çalıştırılmaz; izinli DSL ve allowlist kullanılır.
- **Hata durumunda kapalı kal:** Depo, tarayıcı veya DB arızasında işlem reddedilir ve `503` döner.

## 5. Uygulama sırası

Aşamalar panelle aynıdır ([../IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md)). Bir aşamanın uç dosyaları panel o aşamayı bitirdiğinde bu klasöre eklenir. Backend aşamayı şu sırayla uygular:

1. Uç dosyasındaki tabloları ve kısıtları migration olarak yazar.
2. Uçları yazar.
3. Dosyadaki hata kodlarını ve yan etkileri birebir uygular.
4. Paneli mock yerine backend'e bağlayarak aynı akışları doğrular.

Panelin yönlendirdiği adres `apps/*/.env.development` içindeki `MOCK_API_TARGET` değeridir.

## 6. Bitti tanımı (backend uç başına)

- Sözleşmedeki istek ve yanıt alanları, durum kodları ve hata kodları birebir uygulanmıştır.
- Yetki, kapsam ve izolasyon denetimi vardır; başka tenant'ın kimlikleriyle denendiğinde 404 döner.
- İlgili audit olayı yazılır.
- OpenAPI tanımı ve operationId vardır. Panelde görünen her aksiyon bir operationId ve izinle eşleşir (AT-61).
- Kabul testleri ve kanıtları [../TRACEABILITY.md](../TRACEABILITY.md) içinde ilgili satıra yazılmıştır.
