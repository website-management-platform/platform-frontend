# Universal Website Admin — Backend API sözleşmesi

Bu klasör, backend'in uygulayacağı REST sözleşmesidir ve hedef okuyucu backend geliştiricisidir. Sözleşme backend teknolojisinden bağımsızdır.

**Kaynak ve doğruluk**

- Buradaki her uç, panellerin gerçekten çağırdığı ve backend'de uygulanmış davranıştır.
- Metinlerdeki **[Mock: uygulandı]** ve **[Sözleşme]** etiketleri geliştirme dönemindendir; bugün hepsi backend'de uygulanmıştır.
- Mock ile bu dokümanlar arasında fark görülürse doküman esastır; fark bildirilir ve mock düzeltilir.

**Başlarken:** önce [00-UYGULAMA-REHBERI.md](00-UYGULAMA-REHBERI.md), sonra [00-conventions.md](00-conventions.md) okunur. Yapay zekâ aracı kullanılacaksa giriş dosyası [CLAUDE.md](CLAUDE.md)'dir.

## Yüzeyler

| Yüzey | Açıklama | Durum |
|---|---|---|
| Platform Admin | Platform sahibinin paneli (`apps/platform-admin`), realm `platform` | Aşama 1: kimlik, müşteri ve tek müşteri hesabı (ADR-056), site, denetim kaydı. Aşama 2: alan registry'si, şablon, preset, site modülleri, şema sürümleri. Aşama 6: site entegrasyonu (alan adı, anahtar, webhook, manifest). Aşama 7: form tanımları, dil değişikliği, iş kuyruğu ve sağlık |
| Customer Admin | Müşterinin içerik paneli (`apps/customer-admin`), realm `customer` | Aşama 1: kimlik, ilk şifre belirleme, site seçimi, site bağlamı. Aşama 2: bootstrap modülleri, etkin şema. Aşama 3: içerik kayıtları. Aşama 4: medya ve çeviri deneyimi. Aşama 5: revizyon, planlı yayın, önizleme (inceleme ADR-056, yayın paketi ADR-057 ile kaldırıldı). Aşama 6: sayfalar, bölümler, menüler, yönlendirmeler, site ayarları. Aşama 7: başvurular, sabit ana ekran, arama, bildirimler, dışa aktarma |
| Delivery (public) | Müşteri web sitelerinin ve SDK'nın okuduğu yayın API'si | Aşama 6 ([11-delivery.md](11-delivery.md)) |
| Preview | Müşteri web sitesinin önizleme modu | Aşama 5 (kayıt), Aşama 6 (sayfa ve bundle) |

## Dosyalar

| Dosya | İçerik | Durum |
|---|---|---|
| [00-UYGULAMA-REHBERI.md](00-UYGULAMA-REHBERI.md) | Belge önceliği, kapsam, teknoloji önerisi, değişmez kurallar, uygulama sırası, bitti tanımı | Hazır |
| [00-conventions.md](00-conventions.md) | Ortak kurallar: sürümleme, biçim, oturum, CSRF ve Origin, hata biçimi ve kod kataloğu, erişim denetimi sırası, idempotency, ETag, sayfalama ve süzme, rate limit, iz kimliği, önbellek, PATCH, güvenlik başlıkları | Hazır |
| [01-identity.md](01-identity.md) | Kimlik: CSRF, e-posta + şifre girişi, çıkış, oturumlar, şifre sıfırlama ve ilk şifre belirleme | Hazır |
| [02-tenancy.md](02-tenancy.md) | Müşteri ve site: yaşam döngüsü (askı/arşiv/geri alma), müşteri hesabı (tek hesap, kurulum bağlantısı), genel bakış, müşterinin site listesi ve site bootstrap'ı | Hazır |
| [03-access-control.md](03-access-control.md) | Sade yetki modeli: platform ve müşteri izinleri (rol yok), etkin erişim algoritması | Hazır |
| [04-audit.md](04-audit.md) | Denetim kaydı: olay biçimi, olay kataloğu, liste ucu | Hazır |
| [05-schema.md](05-schema.md) | Alan registry'si, alan grupları, şablon ve preset sürümleri, site modülleri, şema doğrulama, fark, dry-run, yayın, geri dönüş, müşterinin gördüğü şema | Hazır (`schema-migrations/**` Aşama 8) |
| [06-content.md](06-content.md) | Müşteri kayıtları: liste, oluşturma, PATCH (`set`/`unset`/`locale`), yayın, kopya, çöp kutusu, ağaç taşıma, sıralama, toplu işlem, salt okunur alan | Hazır (revizyon ve yayın: 08) |
| [07-media.md](07-media.md) | Medya kütüphanesi, yükleme hattı (niyet, bayt, tamamlama), tür tespiti ve ret kodları, işleme durumları, kullanım yerleri, klasörler, kayıtta medya referansı | Hazır (yayın tarafı medya ucu: 11) |
| [08-publishing.md](08-publishing.md) | Revizyonlar ve geri yükleme, doğrudan yayın, planlı yayın ve worker, önizleme belirteçleri, çeviri durumu | Hazır (webhook olayları: 12) |
| [09-data-model.md](09-data-model.md) | Tablolar, kısıtlar, RLS ve kapsam kuralları (Aşama 1–6 tabloları) | Aşama aşama büyür |
| [10-site-structure.md](10-site-structure.md) | Site yapısı sistem modülleri: sayfa adresleri ve adres geçmişi, bölüm kataloğu ve manifest uyumu, içerik kaynağı, menüler, yönlendirmeler, site ayarları | Hazır |
| [11-delivery.md](11-delivery.md) | Public API: projeksiyon, dil geri dönüşü, liste ve imleç, adres çözme, sayfa bundle'ı, menü, site haritası, yönlendirme, robots, medya (Range), sayfa önizlemesi, CORS ve önbellek, SDK | Hazır |
| [12-integrations.md](12-integrations.md) | Site entegrasyonu: erişim ayarları, alan adı doğrulaması, API anahtarları, webhook outbox ve imza, SSRF, frontend manifest'i | Hazır |
| [13-forms.md](13-forms.md) | Public formlar: tanım ve sürümler, başvuru gönderimi ve kötüye kullanım denetimleri, form ekleri, gelen kutusu, saklama | Hazır |
| [14-operations.md](14-operations.md) | Sabit ana ekran, site içi arama, bildirimler, dışa aktarma, işler, iş kuyruğu ve sağlık özeti, dil değişikliği | Hazır |
| [15-site-data.md](15-site-data.md) | Site kopyalama, yasal saklama, arşivlenmiş müşterinin kalıcı silinmesi ve silme defteri | Hazır |

Henüz tanımlanmamış uç: destek oturumu (`/platform/support-sessions/**`). Gerekçesi ve kalan işler: [../KNOWN_LIMITATIONS.md](../KNOWN_LIMITATIONS.md).

## Açık kararlar

Bu konular karar bekliyor. Karşılığında uç tanımı uydurulmamıştır.

| Konu | Durum |
|---|---|
| Backend teknolojisi | Şartname §2 NestJS + PostgreSQL önerir; ürün sahibi onayı bekliyor (00-UYGULAMA-REHBERI.md §3). |
| Marka, alan adları, SMTP, depolama, secret'lar | Sağlanmadı (şartname §24). Ortam ayarı olarak bırakılır. |
| Saklama süreleri | Şartname §10 varsayılanları: çöp kutusu 30 gün, revizyon 180 gün, audit 365 gün, form başvurusu 90 gün. Hukuki onay bekliyor. |
| Şema sınırları | Site başına 60 modül, preset başına 40 modül, şema başına 200 alan vb. öneridir (ADR-027). |
| Platform kullanıcı yönetimi | İlk platform kullanıcısı bootstrap CLI ile oluşturulur (şartname §19). Her platform kullanıcısı tam yetkilidir (ADR-056); platform kullanıcısı ekleme ekranı ve ucu tanımlanmadı. |
| Destek oturumu | Şartname §13 destek erişimi (salt okunur önizleme, süreli yetkili oturum) müşteri panelinde içerik ekranları geldikten sonra (Aşama 3 sonrası) tanımlanacak. |

## Backend ve geliştirme hesapları

Bütün uçlar gerçek backend'de uygulanmıştır (`platform-api` ve `panel-api` depoları; durum ve kararlar platform-api deposunun `docs` klasöründe). Mock API sunucusu ve `packages/mock-api` kaldırıldı. Geliştirme hesapları ve `/__dev/*` yardımcıları backend'in yerel profilindedir.

## Bakım kuralı

Panelde veya backend'de bir uç, alan, hata kodu ya da kural eklendiğinde, kaldırıldığında veya değiştiğinde ilgili dosyanın ilgili bölümü aynı işte güncellenir. Her dosyanın sonunda "Değişiklik geçmişi" bölümü vardır.
