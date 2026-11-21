# Mimari karar kayıtları (ADR)

Şartname v1.1 §0: karar değişikliği ADR ile kayıt altına alınır. Her kayıt: bağlam, karar, sonuç. Durum değerleri: **Kabul** (uygulanıyor), **Öneri** (ürün sahibi onayı bekliyor), **Açık** (karar verilmedi).

---

## ADR-001 — Bu repo yalnız frontend'dir

- **Durum:** Kabul (ürün sahibi, 16 Kas 2026)
- **Bağlam:** Şartname §2 monorepo içinde `apps/api`, `apps/worker`, `infra/` öngörür. Ürün sahibi backend'in bu repoda olmayacağını belirtti.
- **Karar:** Repoda `apps/platform-admin`, `apps/customer-admin`, `packages/ui`, `packages/mock-api` bulunur. API, worker, veritabanı, migration, kuyruk, medya işleme ve dağıtım altyapısı yazılmaz. Backend ayrı ekip tarafından [backend/](backend/README.md) sözleşmesine göre geliştirilir.
- **Sonuç:** Şartnamede backend'e ait gereksinimler (RLS, Argon2id, worker, SKIP LOCKED, S3, virüs tarama vb.) bu repoda kod olarak değil, backend sözleşmesinde kural olarak yer alır. TRACEABILITY'de "BE" sorumluluğuyla izlenir. Şartname §2'deki "TypeScript yalnız backend" önerisi bu repoyu etkilemez; frontend JavaScript'tir.

## ADR-002 — npm workspaces monorepo ve ortak `packages/ui` katmanı

- **Durum:** Kabul
- **Bağlam:** Şartname §2 iki ayrı build, ayrı origin ve "tek ortak erişilebilir component/design system" ister. Aynı bileşen setini iki uygulamaya kopyalamak ikinci bir sistem yaratır.
- **Karar:**
  - npm workspaces; tek `package-lock.json`.
  - Ortak kod `packages/ui/src` altında: `components`, `hooks`, `utils`, `context`, `styles`, `assets`, `api`, `layouts`, `pages` (NotFound, ServerError, ComponentLibrary), `app` (router, provider'lar).
  - Uygulamaya özel olan yalnız `apps/*/src/config` ve `apps/*/src/features`.
  - Bütün kod `@/...` ile import eder. Vite alias sırası: `@/config/*` ve `@/features/*` çalışan uygulamaya, diğer `@/*` yolları `packages/ui/src`'ye çözülür. Böylece ortak kod `@/config/app.config` istediğinde çalışan panelin adı, realm'i ve depolama öneki gelir.
  - SCSS breakpoint'leri her uygulamanın `app.config.js` dosyasından `app:config` Sass importer'ı ile gelir.
- **Sonuç:** Bileşen ve davranış iki panelde aynıdır; bir düzeltme iki panele birlikte yansır. Bir panele özel kabuk ihtiyacı doğarsa ortak kabuğa yapılandırma (config) ile eklenir, kopya oluşturulmaz.

## ADR-003 — Varsayılan yapı `ibb-istirak-yonetimi`'nden alınmıştır

- **Durum:** Kabul (ürün sahibi talebi)
- **Karar:** `~/Desktop/ibb-istirak-yonetimi` projesinin altyapısı (50+ bileşen, 5 katmanlı token sistemi, hook'lar, yardımcılar, tema/onay context'leri, API istemcisi, ana kabuk, hata sayfaları, bileşen kütüphanesi) olduğu gibi alındı. İştirak iş kodu (`features/companies`, Koordinasyon Panosu) alınmadı.
- **Uyarlamalar:**
  - Hata nesnesi şartname §15 biçimine çevrildi: `requestId`, `errors[{path,code,message}]`, 412/422/428 kodları (ADR-006).
  - CSRF ucu realm'li hâle geldi (ADR-005).
  - `queryKeys` boşaltıldı.
  - Kenar menü ilk açılışta açık gelir (ürün sahibi talebi, 16 Kas 2026); kullanıcı daraltırsa tercih saklanır.
  - Marka sağlanmadığı için favicon boş bırakıldı.

## ADR-004 — Ortak mock API sunucusu (resto-360 modeli)

- **Durum:** Kaldırıldı (20–21 Kas 2026: bütün uçlar gerçek backend'de; `packages/mock-api` silindi). Aşağıdaki metin tarihsel kayıttır.
- **Bağlam:** Backend yok. Şartname §0 sahte API'yi yasaklar; ürün sahibi geliştirme için mock'u açıkça istedi. Mock üretim derlemesine girmemelidir.
- **Karar:** `packages/mock-api` ayrı bir Node süreci olarak çalışır:
  - MSW handler'ları HTTP üzerinden sunulur.
  - Veri `packages/mock-api/.data/db.json` dosyasında tutulur.
  - Her istek transaction gibi işlenir: istekler sırayla çalışır, hata olursa istek öncesi kopyaya dönülür.
  - Paneller geliştirmede Vite proxy ile bağlanır. Tarayıcı içi mock yoktur; panel paketlerinde MSW bağımlılığı yoktur.
- **Kurallar:**
  1. Mock'taki her uç [backend/](backend/README.md) dosyalarında aynı işte belgelenir. Fark varsa doküman esastır, fark düzeltilir.
  2. Mock'ta olmayan bir uç panelde kullanılmaz; panel yalnız sözleşmedeki uçları çağırır.
  3. Mock yalnız davranışı taklit eder; güvenlik garantisi vermez. Üretim güvenlik kuralları backend sözleşmesindedir.
  4. Örnek veri (seed) açıkça örnek veridir; gerçek müşteri verisi kullanılmaz.
- **Portlar:** Platform Admin 5300, Customer Admin 5301, örnek site 5310 (`strictPort`); backend platform-api 8781, customer-api 8782 (mock 8790 kaldırıldı). Kullanıcının başka projelerindeki 5173/8787 portlarına dokunulmaz.

## ADR-005 — Realm ve çerez adları

- **Durum:** Kabul
- **Bağlam:** Şartname §13 iki ayrı kimlik alanı (platform ve customer) ve host-only çerez ister. Geliştirmede iki panel `localhost`'u paylaşır; çerezler porta göre ayrılmaz.
- **Karar:**
  - Her uygulamanın `app.config.js` dosyasında `API_REALM` tanımlıdır (`platform` / `customer`).
  - CSRF ucu `GET /api/v1/auth/{realm}/csrf`'tir.
  - Çerez adları realm önekli olur: `PLATFORM-XSRF-TOKEN`, `CUSTOMER-XSRF-TOKEN`. Oturum çerezleri Aşama 1'de aynı kurala göre adlandırılır.
- **Sonuç:** Üretimde farklı host'larda da aynı adlar kullanılır; çakışma olmaz. Ayrıntı: backend/00-conventions.md §3–4.

## ADR-006 — Hata biçimi şartname §15'e göre

- **Durum:** Kabul
- **Karar:** `application/problem+json` alanları şunlardır: `type`, `title`, `status`, `detail`, `instance`, `code`, `requestId`, `errors[{path,code,message}]`. İz başlığı `X-Request-Id`'dir. Kod kataloğu backend/00-conventions.md §5'te tanımlıdır.
- **Şartnamede açık bırakılan noktaların kararı:**
  - `If-Match` başlığı eksikse `428 PRECONDITION_REQUIRED` döner (RFC 6585).
  - `errors[].path` alanı noktalı yol kullanır (`values.fullName`, `fields.2.key`).

## ADR-007 — Şartname §2 frontend kütüphaneleri ihtiyaç doğan aşamada eklenir

- **Durum:** Kabul
- **Bağlam:** Şartname §2 TanStack Table, React Hook Form, Ajv ve TipTap'i önerir. Varsayılan yapıda tablo, form alanları ve doğrulama yardımcıları zaten vardır. Kurallar, kullanılmayan paketin eklenmemesini ister.
- **Karar:** Her paket, onu gerçekten kullanan aşamada eklenir. Eklemeden önce mevcut yapının yetip yetmediği, bakım durumu, güvenlik açığı ve lisans kontrol edilir, karar bu dosyaya yazılır. Beklenen eşleşme:
  - Ajv → Aşama 2 (şema doğrulama)
  - TipTap → Aşama 4 (zengin metin)
  - React Hook Form / TanStack Table → dinamik form ve liste ihtiyacına göre Aşama 3

## ADR-008 — Git kullanılmaz

- **Durum:** Kabul (kullanıcı kuralı, AI_FRONTEND_RULES_V2 §22)
- **Karar:** Şartname §21 "repo checkpoint ve commit" der; bu repoda git komutu çalıştırılmaz. Sürüm kontrolü kullanıcının sorumluluğundadır. Aşama ilerlemesi TRACEABILITY ve bu dosya ile izlenir.

## ADR-009 — Test kapsamı

- **Durum:** Açık
- **Bağlam:** Şartname §20–22 Vitest, Playwright, axe ve AT-01–68'i ister. Kullanıcının kalıcı kuralı, açıkça istenmedikçe test yazılmaması ve test aracı paketi eklenmemesidir.
- **Bugünkü durum:** Otomatik test yazılmadı. Doğrulama lint, build ve tarayıcıda elle kontrolle yapılıyor. Kabul testleri TRACEABILITY'de "bekliyor" olarak izleniyor.
- **Karar bekleyen:** Frontend ve mock testlerinin hangi aşamadan itibaren yazılacağı.

## ADR-010 — Marka ve ürün adı yer tutucudur

- **Durum:** Açık
- **Karar:**
  - Panel adları yer tutucudur ve `app.config.js` içindedir: Platform Admin için "Platform Yönetimi" (PY), Customer Admin için "Site Yönetimi" (SY).
  - Depolama önekleri `wmp_platform_` ve `wmp_customer_`'dır.
  - Marka adı, logo ve favicon şartname §24 gereği henüz sağlanmadı.

## ADR-011 — Rota modeli ve ortak katmanın genişleme noktaları

- **Durum:** Kabul (Aşama 1)
- **Bağlam:** Aşama 0'da menü, breadcrumb ve rota yardımcıları her uygulamanın `routes.config.js` dosyasında kopya duruyordu. Müşteri panelinde adres site kimliği taşır (`/siteler/:siteId`, şartname §12); menünün bu parametreyi bulunulan adresten çözmesi gerekir.
- **Karar:**
  - Uygulama `routes.config.js` içinde yalnız `routeGroups` bildirir.
  - Menü, komut paleti, breadcrumb ve router modeli `packages/ui/src/app/routing.js` içindedir. Parametreli yollar bulunulan adresin parametreleriyle doldurulur; çözülemeyen öğe menüde görünmez.
  - Uygulamanın isteğe bağlı dışa aktarımları:
    - `useRouteAccess`: rota izni
    - `useHomeCrumb`: breadcrumb kökü
    - `ContextSwitcher`: başlıktaki bağlam seçici
    - `SessionScope`: oturumlu kabuğu saran bağlam
    - `publicRoutes`: oturumsuz sayfalar
    - `sessionRoutes`: kabuk dışındaki oturumlu sayfalar
  - Platform paneli izinleri oturum özetinden, müşteri paneli site bootstrap'ından okur.
- **Sonuç:** İki panel aynı kabuğu kopyasız kullanır; bağlama özgü davranış yapılandırmayla eklenir. Arayüzdeki izin denetimi yalnız deneyim içindir, asıl denetimi API her istekte yapar.

## ADR-012 — Rol izin setleri öneridir

- **Durum:** Yerine geçti: ADR-056 (rol yok)
- **Bağlam:** Şartname §13 rol adlarını ve izin biçimini verir, ama hangi rolün hangi izinlere sahip olduğunu belirtmez.
- **Karar:** İzinler sektördeki yaygın CMS rol ayrımına göre dağıtıldı. Örneğin `EDITOR` yayınlayamaz, `PUBLISHER` yayınlar, `REVIEWER` yalnız inceler. Tablolar `docs/backend/03-access-control.md` içindedir.
- **Sonuç:** Dağılım değişirse yalnız mock'taki tablo, panel metni ve sözleşme tablosu güncellenir. Özel rol tanımı (şartname §13 "custom role permission set") sonraki aşamalarda gelecek.

## ADR-013 — Mock'ta parola özeti scrypt, sözleşmede Argon2id

- **Durum:** Kabul
- **Karar:** Mock, Node'un yerleşik `scrypt` fonksiyonunu kullanır; bunun için native paket eklenmez. Backend sözleşmesi şartname §13'teki gibi Argon2id ister.

## ADR-014 — Sürüm bilgisi hem ETag başlığında hem gövdede

- **Durum:** Kabul
- **Karar:** Değiştirilebilir kayıtların yanıtı `ETag` başlığını taşır. Gövdede de aynı değerle bir `version` alanı bulunur (ör. `"\"3\""`).
- **Gerekçe:** Önbellekten ya da liste yanıtından gelen kayıtta başlık bulunmaz; istemci `If-Match` için `version` alanını kullanır. Değer opaktır, istemci yorumlamaz.

## ADR-015 — Ayrı oturum yenileme (refresh) ucu yok

- **Durum:** Kabul
- **Karar:** Şartname §15 `POST /auth/{realm}/refresh` ucunu sayar, ama §13 opak ve sunucu tarafında tutulan oturum ister. Kayan süreli opak oturumda her başarılı istek oturumu zaten tazeler; ayrı bir token yenileme akışına gerek yoktur. Bu uç tanımlanmadı.

## ADR-016 — Şartname tablosunda olmayan uçlar

- **Durum:** Öneri
- **Karar:** Aşağıdaki uçlar ekran sözleşmesini (şartname §11–12) karşılamak için eklendi. Sözleşmede **[ÖNERİ]** etiketiyle işaretlidirler.

| Uç | Gerekçe |
|---|---|
| `GET /platform/overview` | Genel bakış sayılarını tek istekte döner |
| `GET /platform/sites` | Bütün sitelerin listesi (§11 "Web siteleri") |
| `GET /platform/roles` | Rol kataloğu |
| `DELETE /platform/tenants/{id}/invitations/{invitationId}` | Daveti geri alma |
| `POST /auth/customer/invite/preview` | Davet bilgisi. Token yol yerine gövdede taşınır; böylece log kayıtlarına ve `Referer` başlığına düşmez. |

## ADR-017 — Müşteri panelinde aktif olmayan site görünmez

- **Durum:** Kabul
- **Karar:** Şu siteler müşteri panelinde listelenmez:
  - askıdaki veya arşivdeki siteler
  - askıdaki veya arşivdeki bir müşterinin siteleri
  - kullanıcının üyeliği askıdaysa o müşterinin siteleri

  Bu sitelere doğrudan adresle gelindiğinde API 404 döner ve panel "Bu siteye erişiminiz yok" ekranını gösterir. Sitenin hangi nedenle erişilemez olduğu sızdırılmaz.
- **Gerekçe:** Şartname §13 askıdaki site için public delivery'nin 503 dönmesini ister; yönetim paneli için ayrı bir kural koymaz. En güvenli varsayılan erişimi kapatmaktır. Askıdaki siteye salt okunur erişim istenirse bu ayrı bir karar konusudur.

## ADR-018 — Bu projede soru sorulmaz, onay beklenmez

- **Durum:** Kabul (ürün sahibi, 16 Kas 2026: "bana soru sorma onay isteme bildiğin gibi yaz")
- **Karar:** Şartnamenin çözmediği noktalarda sektör standardına göre karar verilir ve bu dosyaya ADR olarak yazılır. Aşamalar arasında onay beklenmez. Veri kaybı veya güvenlik riski taşıyan, geri alınamaz işlemler bu kuralın dışındadır.

## ADR-019 — Şema motoru ortak pakette (`@wmp/schema`)

- **Durum:** Kabul
- **Karar:** Şu mantık `packages/schema` içinde saf JavaScript olarak yazıldı:
  - alan registry'si
  - şema ve değer doğrulama
  - koşul ve ifade motoru
  - güvenli regex denetimi
  - fark, dry-run ve yayın projeksiyonu

  Platform paneli (canlı doğrulama, önizleme), mock (sunucu tarafı doğrulama) ve backend dokümanı aynı paketi kullanır. Paket bağımlılıksızdır (Ajv vb. eklenmedi). Kurallar şartnameye özgüdür ve JSON Schema ile ifade edilemeyen çapraz denetimler içerir: koşul döngüsü, hassas alan sızıntısı, kimlikle başvuru.
- **Gerekçe:** Şartname §6 koşul değerlendirmesinin "backend ve FE ortak test vektörleriyle aynı" olmasını ister. Tek kaynaktan çalışan kod, panel ile sunucunun farklı karar vermesini engeller.
- **Açık:** Ortak test vektörleri (girdi → beklenen hata kodu) dosyası ADR-009 kapsamında; test yazımı kullanıcı kuralı gereği yapılmadı.

## ADR-020 — Değerler ve arayüz başvuruları alan kimliğiyle tutulur

- **Durum:** Kabul
- **Karar:** Şu veriler alanın değişmez UUID'siyle tutulur:
  - kayıt değerleri: `values: { "<alan uuid>": … }`, grup ve satırların içinde de aynı
  - şemadaki arayüz başvuruları: `titleField`, `columns`, `sort`, `group`, koşullar

  API anahtarı yalnız dış sözleşmede kullanılır.
- **Gerekçe:** Şartname §6.1 "Alanlar DB içinde UUID ile bağlı; config referansları field ID'ye normalize edilir". Anahtar değişikliği veri taşımaz, yalnız API sözleşmesini etkiler (`breaking`, açık onay).

## ADR-021 — Kütüphane izinleri: `platform.library.read` ve `platform.library.manage`

- **Durum:** Kabul; izinler korunur, ADR-056 ile her platform kullanıcısında vardır
- **Karar:** Şablon, preset ve alan grubu yönetimi ayrı iki izinle yapılır. Site modülleri ve şema yayını site izinlerinde kalır: okuma `platform.site.read`, değişiklik `platform.site.manage`.
  - Yapılandırma sorumlusu iki izne de sahiptir.
  - Destek, operasyon ve denetçi rolleri yalnız okur.
- **Gerekçe:** Kütüphane platform geneli bir varlıktır; bir sitenin yapılandırmasını değiştirme yetkisi bütün sitelerin şablonlarını değiştirme yetkisi anlamına gelmemeli.

## ADR-022 — Aşama 2'de şartname tablosunda olmayan uçlar

- **Durum:** Öneri
- **Karar:** Aşağıdaki uçlar ekran sözleşmesini karşılamak için eklendi ve **[ÖNERİ]** etiketiyle işaretlendi:

| Uç | Gerekçe |
|---|---|
| `GET /platform/templates/{id}/versions/{n}` | §11 "version history": sürümün alanlarını gösterme |
| `GET /platform/templates/{id}/usages` | §11 "dependency usage" |
| `POST /platform/field-groups/{id}/actions/{archive,restore}` | Grup silinmez; arşivlenir |
| `POST /platform/presets/{id}/actions/{clone,archive,restore}` | §11 "Site presetleri: clone" |
| `POST /platform/sites/{siteId}/presets/apply` | §25.1 "mevcut siteye seçmeli ekleme" |
| `POST .../modules/{id}/actions/{restore,upgrade,discard-draft}` | Arşivden dönüş; §6.2 "template upgrade her site için açıkça seçilir"; taslağı bırakma |
| `GET .../modules/{id}/schema/versions(/{n})` | §11 "Şema versiyonları: rollback history" |

## ADR-023 — Site modülü şablonun bağımsız kopyasıdır

- **Durum:** Kabul
- **Karar:**
  - **Kopyalama:** Modül eklenirken şablon sürümünün şeması kopyalanır. Her alan yeni UUID alır (şartname §25.2: "global UUID benzersiz"); `templateFieldId` şablondaki kimliği tutar.
  - **İlk sürüm:** Şema `v1` hemen yayınlanmış sayılır, çünkü şablon sürümleri yayında doğrulanmıştır. Modülün müşteriye görünmesi `enabled` seçimine bağlıdır.
  - **Yükseltme:** `actions/upgrade` ile taslağa alınır. Eşleşen alanlar kimliğini korur, modüle özel alanlar korunur, şablondan kalkan alanlar arşivlenir. Sonra normal fark, dry-run ve yayın akışı işler.
- **Gerekçe:** Şartname §3 "TemplateVersion immutable; aktif kullanım otomatik değişmez" ve §6.2 "otomatik global overwrite yok" (AT-21, AT-42).

## ADR-024 — Taslak modül satırında; doğrulama yayında yeniden yapılır

- **Durum:** Kabul
- **Karar:**
  - **Taslak saklama:** Şablon ve modül taslağı kendi satırında tutulur (`draft`, `row_version`). Panel taslağı ~1,2 sn beklemeyle `PATCH` + `If-Match` ile otomatik kaydeder. `412` gelirse kaydı durdurur ve kullanıcıya güncel taslağı yükletir; sessizce üzerine yazmaz.
  - **Durumlar:** Şartname §6.2'deki `draft → validated` ara durumu ayrı satır olarak tutulmaz. Doğrulama, dry-run ve yayın her seferinde güncel taslak üzerinde yeniden yapılır.
  - **Geri alma:** Yeni bir sürüm doğrudan yaratılmaz; taslak hazırlanır ve yayın normal akıştan geçer.
- **Gerekçe:** Ara durum, taslak sonradan değiştiğinde bayatlar. `dataWatermark` ve `migrationPlanHash` ile "dry-run ile yayın arasında değişiklik yok" garantisi sağlanır (şartname §25.3).

## ADR-025 — Tip ve widget ayrımı

- **Durum:** Kabul
- **Karar:** Şartname §6 tablosundaki `radio`, `checkboxGroup` ve `toggle` ayrı tip değil, widget'tır:
  - `radio` → `select` tipinin widget'ı
  - `checkboxGroup` → `multiselect` tipinin widget'ı
  - `toggle` → `boolean` tipinin widget'ı (`switch`)

  `fieldGroup`, `object` tipidir. Böylece kayıtlı registry 46 tiptir.
- **Gerekçe:** Şartname §25.2 "Field türü ile widget ayrıdır; widget değişikliği migration gerektirmez". Aynı değer biçimini taşıyan iki ayrı tip, gereksiz migration üretirdi.

## ADR-026 — Şema yayını senkron tek transaction (Aşama 2)

- **Durum:** Kabul (geçici)
- **Karar:** Yayında kayıt dönüşümü, istek içinde tek transaction'da yapılır. Mock dönüştürülen değeri kayıt satırına yazar. Gerçek backend:
  - değişmez revizyon ve snapshot üretir
  - büyük modülleri arka plan işinde stage eder; uçlar `schema-migrations/{id}`, `cancel` ve `retry` (Aşama 8)
- **Gerekçe:** Kayıt uçları (Aşama 3) ve revizyonlar (Aşama 5) henüz yok. Sözleşme (dry-run raporu, watermark, plan özeti, hata kodları) şimdiden kesindir; arka plan işine geçiş istemciyi değiştirmez.

## ADR-027 — Kütüphane ve modül sınırları

- **Durum:** Öneri
- **Karar:**
  - Bir sitede en çok **60 etkin modül** (`QUOTA_EXCEEDED`) olabilir.
  - Bir presette en çok **40 modül** olabilir.
  - Şema başına şartname §6 "derinlik, boyut, field sayısı sınırları" için şu değerler seçildi: 200 alan, 4 düzey derinlik, 256 KiB, 200 seçenek, 20 blok türü, koşulda 10 kural, ifade 500 karakter.
- **Gerekçe:** Şartname sayı vermez ("operasyonel limit ayarlanabilir"). Değerler `packages/schema/src/constants.js` ve mock'ta tek yerdedir; ortam ayarına taşınabilir.

## ADR-028 — Zengin metin düzenleyici: TipTap

- **Durum:** Kabul
- **Karar:** Müşteri panelinde zengin metin TipTap 3 ile düzenlenir. Kullanılan paketler: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-table` (MIT, aktif bakımda).
  - **Biçim:** TipTap'ın JSON biçimi (ProseMirror) şemadaki `richText` biçimiyle birebir aynıdır. Bağlantı bir işarettir (`marks: [{ type: "link", attrs: { href } }]`). Sunucu düğüm ve işaretleri izin listesine göre doğrular.
  - **Araç çubuğu:** Alanın `allowedNodes` ayarıyla sınırlıdır. İzinsiz öğe düzenleyiciye yüklenmez.
  - **Yükleme:** Düzenleyici ayrı paket olarak tembel yüklenir; zengin metin alanı olmayan formlar indirmez.
- **Gerekçe:** Şartname §6 "versioned structured JSON, güvenli HTML render, paste sanitize". Ham HTML saklanmaz; yapıştırılan içerik şemaya dönüştürülür.

## ADR-029 — Aşama 3'te kayıt tek satır; revizyonlar Aşama 5'te

- **Durum:** Kabul (geçici)
- **Karar:** Kayıt; taslak değerleri ve son yayının kopyasını (`published_values`, `published_checksum`) aynı satırda taşır.
  - Yayındaki kayıt düzenlenince yayın kopyası değişmez; `hasUnpublishedChanges` işaretlenir.
  - Aşama 5'te değişmez `entry_revisions`, dil bazlı iş akışı ve `published_snapshots` bu yapının yerine geçecek. Uç adresleri, yanıt alanları ve istemci davranışı değişmeyecek.
- **Gerekçe:** Şartname §21 aşamaları revizyon ve yayını Aşama 5'e koyar. Aşama 3'te müşteri yine de "yayında olan" ile "üzerinde çalışılan"ı ayırabilmeli (şartname §10: canlı içerik yayına kadar değişmez).

## ADR-030 — Ağaç taşıma için ayrı `move` işlemi; ağaç listesi bütün olarak döner

- **Durum:** Öneri
- **Karar:**
  - Ağaçta üst kaydı ve konumu birlikte değiştiren `POST …/entries/{id}/actions/move { parentId, afterId }` eklendi. Döngü (`TREE_CYCLE`) ve kapsam aynı transaction'da denetlenir.
  - Ağaç modülünün listesi sayfalamasız döner (en çok 500 kayıt). Panel hiyerarşiyi `parentId` ile kurar.
  - Klavyeyle yukarı/aşağı, alta alma ve üste çıkarma düğmeleri sürükle bırakın erişilebilir karşılığıdır (şartname §5.1).
- **Gerekçe:** `reorder` tek düzeyin sırasıdır. Üst kayıt değişikliği ayrı bir PATCH olursa iki istek arasında tutarsız ağaç oluşabilir.

## ADR-031 — Veriden üretilen menü grupları (`useDynamicMenuGroups`)

- **Durum:** Kabul
- **Karar:**
  - **Kanca:** Rota modeline (ADR-011) isteğe bağlı `useDynamicMenuGroups` kancası eklendi. Müşteri panelinde "İçerik" grubu, bootstrap'taki açık ve yayınlanmış modüllerden üretilir.
  - **Rota:** Tek bir parametreli rota vardır: `/siteler/:siteId/icerik/:moduleKey`. Menü öğeleri bu rotaya somut adresler olarak eklenir.
  - **Ortak kullanım:** Komut paleti de aynı öğeleri kullanır.
- **Gerekçe:** Şartname §12: müşteri yalnız izinli modüllerini görür ve menü platform yapılandırmasından gelir. Panel tasarımcısı (menü grupları ve sırası) Aşama 6'da bu kancanın girdisini zenginleştirecek.

## ADR-032 — Medya alanları Aşama 4'e kadar salt okunur

- **Durum:** Kabul (geçici)
- **Karar:** Görsel, video, belge ve galeri alanları formda var olan değeri gösterir ve korur. Yeni dosya eklenemez. Kullanıcıya bunun nedeni açıkça yazılır.
- **Gerekçe:** Yükleme hattı, karantina ve varyantlar (şartname §8) Aşama 4'ün kapsamıdır. Sahte bir yükleme davranışı kurulmadı.

## ADR-033 — Medya klasörleri ve toplu işlem uçları

- **Durum:** Öneri
- **Karar:** Şartname §14 `asset_folders` tablosunu ve §8 "klasörler, bulk move" işlevini ister, ama §15 uç tablosunda bu uçlar yoktur. Bu nedenle `…/asset-folders` (liste, oluşturma, ad, boş klasörü silme) ve `…/assets/bulk` (`move`, `archive`) eklendi ve **[ÖNERİ]** etiketiyle işaretlendi.
  - Klasörler tek düzeylidir.
  - Klasör değişikliği dosya kimliğini ve adresini bozmaz.
- **Gerekçe:** Müşteri deneyimi (şartname §12, §25.7) düzenli bir kütüphane ister. İç içe klasör ihtiyacı doğarsa `parent_id` eklenir; sözleşme geriye uyumlu kalır.

## ADR-034 — Mock medya işlemesi canlandırmadır

- **Durum:** Kabul (yalnız geliştirme)
- **Karar:** Mock dosyayı gerçekten dönüştürmez:
  - Görsel boyutunu dosya başlığından okur. Varyant kayıtları oluşur, ama orijinal baytı sunar.
  - İşleme süresi (görsel ~1,5 sn, video ~4 sn) zamana bağlı canlandırılır.
  - Virüs taraması EICAR test imzasıyla canlandırılır.

  Tür tespiti, ret kuralları, tekilleştirme, kota, kullanım engeli ve durum makinesi gerçek kurallarla çalışır.
- **Gerekçe:** Repo yalnız frontend'dir (ADR-001). Panelin işleme durumlarını, hatalarını ve yeniden denemesini gerçekçi biçimde göstermesi için durum makinesi yeterlidir. Gerçek dönüştürme ve tarama backend worker'ının işidir ([07-media.md](backend/07-media.md) §2.3).

## ADR-035 — Çeviri deneyimi Aşama 4'te; dil bazlı iş akışı Aşama 5'te

- **Durum:** Kabul
- **Karar:** Kayıt formuna şunlar eklendi:
  - eksik çeviri sayısı
  - kaynak dil değeri ve "kaynaktan kopyala"
  - sağdan sola dil yönü
  - medyada dile göre alt metin ve açıklama

  Şartname §7'deki dil bazlı durumlar (`draft`, `review`, `published`, `outdated`), ortak alan değişiminde "outdated" işareti ve dil bazlı yayın, revizyon ve dil iş akışı tablolarıyla (`locale_workflows`) Aşama 5'te eklenecek. Delivery'deki katı/izinli geri dönüş (fallback) kuralı Aşama 6'dadır.
- **Gerekçe:** Bu durumlar revizyon kimliklerine bağlıdır (kaynak revizyon ↔ çeviri revizyonu). Revizyonsuz bir "outdated" işareti yanlış güven verirdi.

## ADR-036 — Revizyon ve yayın kopyası; kayıt satırı okuma kopyası taşır

- **Durum:** Kabul
- **Karar:** ADR-029'daki geçici tek satır modeli kaldırıldı.
  - Her değişiklik değişmez bir `entry_revisions` satırıdır. Yayın, revizyondan değişmez bir `published_snapshots` satırı yazar.
  - `entries` yalnız işaretçileri (`draft_revision_id`, `published_snapshot_id`), iş akışı durumunu ve okuma kopyalarını (`values`, `published_values`) taşır. Kopyalar aynı transaction'da yazılır; kaynak doğruluk revizyon ve kopya tablolarıdır.
  - Durum (`status`) iş akışı konumudur; yayında olmak ayrı bir işarettir (`isPublished`). Yayındaki kayıt düzenlenince `DRAFT` + `isPublished: true` + `hasUnpublishedChanges: true` olur.
  - ADR-029'da "yanıt alanları değişmeyecek" denmişti; `status` alanında `PUBLISHED`'ın anlamı daraldı ("güncel taslak yayında"). Panel rozetleri `isPublished` ile çizildiği için müşteri deneyimi değişmedi; backend bu anlamı uygulamalıdır.
- **Gerekçe:** Şartname §10 "canlı içerik yalnız yayın olayıyla değişir" ve §25.5 revizyon geçmişi. İnceleme ve yayın aynı kayıtta aynı anda farklı revizyonlara işaret edebilmeli (yayında v3, incelemede v5). Okuma kopyası liste ve delivery okumasında birleştirme maliyetini kaldırır.

## ADR-037 — Çeviri durumu türetilir; yayın kayıt bütünüdür

- **Durum:** Kabul
- **Karar:** ADR-035'te Aşama 5'e bırakılan dil bazlı durum şöyle uygulandı:
  - Her dilin son değiştiği revizyon numarası `entries.locale_versions` içinde tutulur. `missing` / `outdated` / `current` bundan türetilir ([08-publishing.md](backend/08-publishing.md) §7). Ayrı bir `locale_workflows` tablosu açılmadı.
  - Yayın, inceleme ve plan **kayıt bütünü** içindir; diller ayrı ayrı yayınlanmaz ve onaylanmaz.
  - Ortak alan değişikliği yayın kopyasını değiştirmez (yayın olayına kadar); dolayısıyla "ortak alan değişimi yayındaki EN'i değiştirmez" kuralı sağlanır.
- **Gerekçe:** Dil bazlı ayrı yayın, aynı kaydın farklı dillerde farklı revizyonlardan servis edilmesini gerektirir; bu durumda ortak alanlar için iki yayın kopyası arasında tutarsızlık doğar ve ilişki/benzersizlik kuralları dil başına çoğalır. Kurumsal sitelerde çeviri genellikle aynı yayın paketine eklenerek birlikte yayınlanır. İhtiyaç doğarsa `locale_workflows` eklenmesi geriye uyumludur (yeni alan).

## ADR-038 — Onay revizyona bağlıdır; görevler ayrılığı kişi bazlıdır

- **Durum:** Kabul
- **Karar:**
  - Onay `{ revisionId }` taşır; yayın yalnız onaylanan revizyon güncel taslaksa yapılır (`APPROVAL_REQUIRED`). Onay ve değişiklik isteği gövdesinde inceleyenin gördüğü `revisionId` zorunludur (`STALE_REVISION`).
  - İncelemedeki veya onaylı kayıt düzenlenirse onay düşer ve kayıt `DRAFT` olur; yeniden gönderilmesi gerekir.
  - İncelemeye gönderen kişi kendi kaydını onaylayamaz; kural rolden bağımsızdır (sahip dahil).
  - Planlı yayın, planlandığı andaki onayı taşır; uygulama anında onayın sabitlenen revizyona ait olduğu yeniden denetlenir.
- **Gerekçe:** Şartname §10 inceleme modu ve AT-16. Rol bazlı istisna ("sahip kendini onaylayabilir") denetim izini zayıflatır; tek kişilik ekipler `direct` akışı seçer.

## ADR-039 — Planlı işlemin zamanı ofsetli UTC anıdır; worker kurtarmalıdır

- **Durum:** Kabul
- **Karar:**
  - API yalnız saat dilimi ofsetli zaman kabul eder. Panel tarih ve saati site saat diliminde alır ve UTC'ye çevirir; yaz saati geçişindeki var olmayan/çift saatler istemcide çözülür, sunucu belirsiz yerel saat yorumlamaz.
  - Plan revizyonu (veya yayın kopyasını) sabitler; sonraki düzenleme plana girmez.
  - Worker açılışta vadesi geçmiş görevleri işler; tek uygulama `FOR UPDATE SKIP LOCKED` + kira + `unique idempotency_key` ile sağlanır. Veri kaynaklı hata yeniden denenmez.
  - Mock: süreç içi 5 saniyelik zamanlayıcı ve açılışta tarama; tek süreç olduğu için kilit yerine sıra (`runExclusive`) kullanılır.
- **Gerekçe:** Şartname §10 ve AT-17. Sunucuda yerel saat yorumlamak DST kenarında çift veya hiç yayın riskini doğurur.

## ADR-040 — Yayın paketi revizyonları ekleme anında sabitler; geri alma yeni yayın olayıdır

- **Durum:** Kabul
- **Karar:**
  - Pakete eklenen kayıt, eklendiği andaki taslak revizyonuyla sabitlenir. Sonraki düzenleme pakette `newerDraft` olarak gösterilir; güncel hâl için kalem çıkarılıp yeniden eklenir.
  - Doğrulama bağımlılık grafiğini içerir: ilişki hedefi yayında olmalı veya aynı pakette yayınlanmalı.
  - Yayın atomiktir (tek transaction); `releaseVersion` paket başına bir kez artar.
  - Geri alma, kalemlerin önceki yayın kopyalarını yeni bir yayın olayıyla etkinleştirir; geçmiş silinmez. Önceki kopya eski şemaya aitse geri alma reddedilir.
  - Paket menüsü ve uçları `entry.publish` iznine bağlıdır; paketi denetleme (`validate`) ve görüntüleme `entry.read` ile yapılabilir.
- **Gerekçe:** Şartname §10 release ve AT-18. Kalemin yayın anında "en son taslağı" alması, incelenmemiş değişikliğin paketle yayına çıkmasına yol açardı.


## ADR-041 — Site yapısı ayrı API değil, sistem modülleridir

- **Durum:** Kabul
- **Karar:**
  - Site ayarları, sayfalar, menüler ve yönlendirmeler, şablon anahtarı `site-settings`, `pages`, `menus`, `redirects` olan sıradan modüllerdir. Revizyon, inceleme, plan, yayın paketi, önizleme, yetki ve audit kuralları aynen geçerlidir ([10-site-structure.md](backend/10-site-structure.md)).
  - Delivery'nin okuduğu alanlar **sistem alanıdır**: silinemez, arşivlenemez, tipi değiştirilemez (`SYSTEM_FIELD`). Diğer alanlar site başına serbestçe eklenir.
  - Sayfa bölümleri `unionBlocks` alanıdır. Bölüm türü blok anahtarı, tasarım varyantı `variant` seçeneğinin id'sidir. Bölüm, modül verisini kopyalamaz; `contentSource` ile hangi modülden okunacağını söyler.
  - Menü öğeleri yeni `menuTree` tipindedir (iç içe dizi; döngü yapısal olarak oluşamaz).
  - Yayında adresi değişen sayfanın eski adresi `route_history`'ye yazılır; delivery eski adrese 301, yayından kalkmış sayfaya 410 döner.
  - Müşteri menüsü modülün `area` alanına göre "Site yapısı" ve "İçerik" olarak ikiye ayrılır.
- **Gerekçe:** Şartname §9 sayfa/menü/SEO ister ve §6 "kod deploy etmeden yeni modül" ilkesini koyar. Ayrı sayfa API'si, revizyon, onay, plan, paket ve önizlemenin ikinci kez yazılması demekti; aynı kurallar iki yerde ayrışırdı. Panel, sayfa düzenleyicisini şemadan ürettiği için yeni bir sitenin yapısı panel kodu yazılmadan kurulur. Yapıya özgü kurallar (adres, menü hedefi, yönlendirme döngüsü, manifest uyumu) tek bir doğrulama katmanında toplanır.

## ADR-042 — Basit ve gelişmiş yayın araçları; katlanabilir isteğe bağlı gruplar

- **Durum:** Kısmen yerine geçti: ADR-057 (yayın paketi ve basit/gelişmiş ayrımı kalktı; katlanabilir gruplar geçerli)
- **Bağlam:** Ürün sahibi müşteri panelini karmaşık buldu: tek kişilik bir ofis için yayın paketi, planlama ve yorum sekmesi gereksiz; sayfa düzenleyici bütün bölümleri açık gösterince çok uzun.
- **Karar:**
  - Sitede `publishingTools: basic | advanced` (varsayılan `basic`). `basic` sitede panel yalnız "Kaydet" ve "Yayınla"yı gösterir; yayın paketleri menüsü, "Yayını planla" ve "Pakete ekle" gizlenir. Platform yöneticisi site düzenleme penceresinden açar. Uçlar ve izinler değişmez; bu yalnız arayüz kararıdır.
  - Yorumlar sekmesi yalnız inceleme akışlı (`workflow: review`) modülde görünür.
  - Şema grubu `collapsed: true` taşıyabilir; müşteri formunda "İsteğe bağlı ayarlar" altında katlı gelir, hatalı alan varsa açılır. Şablonlarda SEO, analiz, çerez izni ve bakım grupları katlıdır.
  - Sayfa bölümleri katlanabilir listedir: başlıkta bölüm türü ve asıl başlık. Yeni eklenen ve hatalı bölüm açık gelir.
  - Varyant seçimi kutucuklarla yapılır; tek seçenek varsa alan gizlenir. Tek dilli sitede dil ipucu gösterilmez.
  - İçerik kaynağı alanında kayıtların düzenlendiği modüle bağlantı verilir.
- **Gerekçe:** Şartname §25.7 "ilk kullanıcı görevleri" ve kademeli açılım ilkesi. Özellikleri kaldırmak yerine görünürlüğünü site düzeyinde ayarlamak, büyük kurumların gelişmiş akışını korur ve küçük sitelerin panelini sadeleştirir. Veri modeli ve sözleşme değişmediği için geri dönüşü serbesttir.

## ADR-043 — Frontend manifest'i panelin ve yayının sınırıdır

- **Durum:** Kabul
- **Karar:**
  - Her sitenin frontend'i, çizebildiği bölüm türlerini ve varyantlarını, okuduğu modülleri ve şema sürümlerini, kayıt adres kalıplarını ve dilleri bir manifest ile bildirir ([12-integrations.md](backend/12-integrations.md) §5). Manifest sürümleri değişmezdir; CI `manifest:write` anahtarıyla kaydeder, etkinleştirme platform yöneticisinindir.
  - Etkin manifest varsa bölüm düzenleyici yalnız manifest'teki türleri ve varyantları sunar; yayında manifest dışı bölüm `SECTION_NOT_SUPPORTED` ile reddedilir.
  - Yayındaki içerikle uyumsuz manifest etkinleştirilemez. Manifest'in desteklemediği kırıcı şema sürümü yayınlanamaz (AT-53); önce yeni manifest etkinleştirilir.
  - Manifest yoksa sınır yoktur (yeni kurulan site).
- **Gerekçe:** Şartname §16 ve §25.8. Panelde seçilebilen ama sitede çizilmeyen bir bölüm, müşterinin "yayınladım ama görünmüyor" sorununu doğurur. Şema ile frontend'in aynı anda değişmesi gerektiğinde sıralamayı sözleşme belirler: önce frontend sürümü yeni şemayı destekler, sonra şema yayınlanır.

## ADR-044 — Webhook outbox'ı ve mock'ta ağa çıkmayan teslim

- **Durum:** Kabul
- **Karar:**
  - Olay ve teslim satırları yayınla aynı transaction'da yazılır (outbox); gönderim ayrı worker'dadır ve teslim hatası yayını etkilemez.
  - Yük kişisel veri ve alan değeri taşımaz; alıcı güncel veriyi delivery'den okur.
  - İmza `v1=HMAC-SHA256("{timestamp}.{gövde}")`; sır rotasyonunda 24 saat iki imza. Yeniden deneme 1 dk–12 sa arası beş kez, sonra ölü mektup; elle yeniden deneme vardır.
  - SSRF: https, 443, IP ve yerel ad yok; her denemede DNS çözümü engelli aralıklara karşı denetlenir.
  - Mock gerçek HTTP isteği atmaz. Mock DNS kaydına göre `SSRF_BLOCKED`, `CONNECTION_FAILED` veya başarı üretir; başarılı istek imzasıyla `/__dev/webhook-inbox` kutusuna yazılır.
- **Gerekçe:** Şartname §16 ve AT-26. Mock'un dış ağa istek atması geliştirici makinesinden SSRF yüzeyi açardı; imza ve yeniden deneme davranışı ağ olmadan da doğrulanabilir.

## ADR-045 — Delivery önbelleği: kısa max-age, gövde ETag'i, releaseVersion

- **Durum:** Kabul
- **Karar:**
  - Delivery yanıtları `public, max-age=60`; `stale-while-revalidate=300` yalnız site açarsa. Zayıf ETag gövde özetidir; `If-None-Match` → `304`.
  - Her yanıt `meta.releaseVersion` taşır. Önbellek anahtarı site, dil, sorgu ve `releaseVersion` içerir; yayın sayacı artınca eski anahtarlar kendiliğinden düşer.
  - Sayfa, ayarlar ve menüler için `pages/bundle` tek tutarlı okumadır. Ayrı istekler için SDK `consistent()` farklı `releaseVersion` gördüğünde yeniden dener.
  - Önizleme yanıtları `no-store` ve `noindex`'tir; hiçbir paylaşımlı önbelleğe girmez.
- **Gerekçe:** Şartname §15 ve §25.4. Uzun TTL + yayın anında CDN temizliği, temizlik başarısız olduğunda eski içeriğin saatlerce kalmasına yol açar. 60 saniyelik pencere, yayın sonrası gecikmeyi sınırlarken kaynak yükünü düşürür; bundle, karışık sürümden oluşan sayfa riskini kaldırır.

## ADR-046 — Delivery rate limit ve medya sayacı

- **Durum:** Kabul
- **Karar:** JSON uçları IP + site başına 100 istek/dk (şartname §25.8 başlangıç değeri). Medya ucu ayrı sayaçla 600 istek/dk; üretimde CDN önünden sunulur. **[Sözleşme]** Özel modda anahtar başına sayaç kullanılır (SSR frontend tek IP'den çok ziyaretçi adına okur); mock yalnız IP + site sayacını uygular.
- **Gerekçe:** Tek bir sayfa onlarca görsel isteği üretir; medya ile JSON aynı sayaçta olursa sıradan bir ziyaret sınıra takılır. Mock ilk sürümde 600/dk tek sayaç kullanıyordu; doküman yazımında şartnameye çekildi.

## ADR-047 — Formlar ayrı güvenlik sınıfıdır; tanım platformda, başvuru müşteride

- **Durum:** Kabul
- **Karar:**
  - Formlar içerik modülü değildir. Tanımı platform yöneticisi yapar ve değişmez sürümlerle yayınlar. Başvurular ayrı tablolarda, ayrı izinlerle (`formSubmission.*`) tutulur ([13-forms.md](backend/13-forms.md)).
  - Alan tipleri kısa bir izinli listeyle sınırlıdır. Dosya eki varsayılan kapalıdır ve form başına açılır.
  - Onay metni sürümlenir. Her başvuru kabul ettiği sürümü ve zamanını saklar. Pazarlama izni ayrı ve isteğe bağlıdır.
  - Gönderim denetimleri:
    - sunucu tarafı köken denetimi,
    - IP + form başına hız sınırı (hatalı denemeler dahil),
    - 64 KB sınırı, honeypot, idempotency,
    - form sürümü denetimi, satır sonu yasağı.
  - Yanıt yalnız opak onay kodu döner. Ham IP saklanmaz; günlük tuzlu özet 7 gün tutulur.
  - Ekler başvurudan önce yüklenir. Yükleme form sürümüne, alana ve gönderim anahtarına (nonce) bağlıdır, taranır, medya kütüphanesine girmez ve yalnız panelden indirilir.
  - Sayfaya form, `form` bölümüyle yerleştirilir; bölüm yalnız form anahtarını taşır.
- **Gerekçe:** Şartname §17 formu "içerik modülünden ayrı güvenlik sınıfı" olarak tanımlar. Başvurular kişisel veri taşır: aramaya, içerik dışa aktarmasına ve delivery'ye girmemelidir. Tanımın platformda olması, müşterinin kişisel veri toplayan yeni alanları denetimsiz eklemesini önler.

## ADR-048 — Bildirimler olayla aynı transaction'da yazılır; e-posta yalnız bağlantı taşır

- **Durum:** Kabul
- **Karar:**
  - Panel içi bildirim, olayın gerçekleştiği transaction'da yazılır: inceleme, onay, planlı yayın hatası, başvuru, kota eşiği, aktarma.
  - Alıcı, o anda sitede izni olan etkin kullanıcılardır. Aynı anahtarlı okunmamış bildirim tekilleştirilir.
  - E-posta tür başına kapatılabilir; panel içi bildirim kapatılamaz.
  - Bildirim ve e-posta kişisel veri taşımaz: başlık ve panel bağlantısı.
  - Panel okunmamış sayısını 60 saniyede bir sorar. Anlık kanal (SSE/WebSocket) bu sürümde yoktur.
- **Gerekçe:** Şartname §18 "durable outbox, no sensitive payload, dedup". Yoklama, oturum ve CSRF modelini değiştirmeden yeterli gecikme sağlar; anlık kanal Aşama 8 sonrası eklenebilir.

## ADR-049 — İçe aktarma yalnız içerik modüllerini taşır; atomik ve taslak

- **Durum:** Yerine geçti: ADR-057 (içe aktarma yok)
- **Karar:**
  - Müşteri içe aktarması aynı anahtarlı modüllere içerik taşır. Site yapısı modülleri (ayarlar, sayfalar, menüler, yönlendirmeler) atlanır; bunlar tasarıma bağlı yapılandırmadır.
  - Alan tipi uyuşmazlığı planı engeller. Şema değişikliği platform izni ister (şartname §18: "Import config schema requires platform permission").
  - Akış: yükle → denetle (kuru çalıştırma) → uygula.
    - Uygulama planı yeniden kurar ve tek transaction'da yazar. Kısmi uygulama yoktur.
    - Kayıtlar yeni kimlik alır; ilişkiler ve ağaç üst kayıtları eşlenir.
    - Hiçbir kayıt yayınlanmaz.
  - `upsert` kipi yalnız daha önce aynı kaynaktan içe aktarılmış kayıtları (`import_key`) günceller; sessiz üzerine yazma yoktur.
  - Medya baytları taşınmaz; bulunmayan medya referansı uyarıyla kaldırılır. Medyayla birlikte tam taşıma platformun site kopyalama işlemidir (Aşama 8).
- **Gerekçe:** Sayfa ve menüler sayfa kimliklerine ve frontend manifest'ine bağlıdır. Başka bir siteye ham taşınmaları kırık adres ve desteklenmeyen bölüm üretir. İçerikte ise kimlik eşlemesi güvenle yapılabilir. Atomiklik ve taslak kuralı "yanlış dosya canlı siteyi bozar" riskini kaldırır.

## ADR-050 — Ana ekran kartları izinli türlerden yapılandırılır

- **Durum:** Yerine geçti: ADR-057 (sabit ana ekran)
- **Karar:**
  - Müşteri ana ekranı sekiz izinli kart türünden oluşur; platform kart seçer, sıralar, başlık ve küçük ayarlar verir, yayınlar.
  - Serbest sorgu, SQL veya betik yoktur. Her kart müşterinin izniyle ayrıca süzülür.
  - Menü gruplaması yapılandırma gerektirmez; modülün `area` alanından türetilir (ADR-031, ADR-041).
- **Gerekçe:** Şartname §18 "allowlisted query types, arbitrary SQL/JS yok". Kart türü sabit olunca veri kapsamı ve performansı sözleşmede bellidir.

## ADR-051 — Dil değişikliği etki raporu belirteciyle uygulanır; kaldırılan dil arşivlenir

- **Durum:** Kabul
- **Karar:**
  - Dil ekleme, kaldırma ve varsayılan dil değişimi ayrı uçla yapılır.
  - Önce etki raporu alınır. Rapor kaldırılacak adresleri, arşivlenecek değerleri, form metinlerini, eksik çevirileri, yayın engellerini, SEO değişikliğini ve bekleyen planları sayar.
  - Uygulama yalnız raporun belirteciyle yapılır; arada site değiştiyse `IMPACT_CHANGED` döner.
  - Engelleyen durumlar: manifest dili desteklemiyor, yayındaki sayfa yeni varsayılan dilde adressiz kalıyor.
  - Kaldırılan dilin değerleri silinmez (`archived_locales`); dil yeniden eklenince geri gelir.
- **Gerekçe:** Şartname §7, §25.4 ve AT-51. Dil kaldırma geri dönüşü zor bir canlı etki yaratır (404, SEO). Raporun okunmadan uygulanamaması yanlışlıkla yapılan değişikliği önler; arşiv modeli veri kaybını önler.

## ADR-052 — Ortak kabuğa iki isteğe bağlı genişleme noktası

- **Durum:** Kabul
- **Karar:** `routes.config` iki isteğe bağlı dışa aktarım alabilir:
  - `HeaderActions`: üst çubukta uygulamaya özel öğe (müşteri panelinde bildirim zili),
  - `useCommandSearch(query)`: komut paletinde uygulama verisinde arama (müşteri panelinde site içi arama).

  Tanımlamayan uygulamada davranış değişmez.
- **Gerekçe:** Ortak kabuk (`packages/ui`) iki panelde aynıdır; uygulamaya özel veri bileşenini kabuğa gömmek paketler arası bağımlılık yaratırdı. Mevcut `ContextSwitcher` ve `useDynamicMenuGroups` modeliyle aynı yaklaşımdır (ADR-011, ADR-031).

## ADR-053 — Site kopyalama yeni kimliklerle ve taslak; kalıcı silme yalnız arşivden ve yasal saklama yokken

- **Durum:** Kabul; yasal saklama ADR-057 ile kaldırıldı
- **Karar:**
  - Site kopyalama her zaman yapılandırmayı taşır: modüller ve etkin şema sürümleri, tasarım manifest'i, form tanımları, ana ekran. İçerik ve medya isteğe bağlıdır.
  - Kayıt ve medya yeni kimlik alır; aradaki bütün başvurular eşlenir. Kopyalanan kayıtlar taslaktır.
  - Kullanıcılar, sırlar, alan adları, webhook'lar ve form başvuruları hiçbir zaman kopyalanmaz ([15-site-data.md](backend/15-site-data.md)).
  - Yasal saklama müşteri düzeyindedir. Açıkken başvuru temizliği ve kalıcı silme durur.
  - Kalıcı silme yalnız arşivlenmiş müşteride, müşteri adı yazılarak yapılır.
    - Müşteri satırı mezar taşı olarak kalır.
    - Silme defterine kayıt düşer.
    - Denetim kaydı silinmez.
- **Gerekçe:** Şartname §18 "never clone users/secrets/webhook credentials/submissions by default" ve §25.8 veri yaşam döngüsü (arşiv → dışa aktarma penceresi → silme → yasal saklama denetimi → mezar taşı). Taslak kuralı ADR-049 ile aynı gerekçeyi taşır: kopya, onay olmadan canlı içerik üretmez.

## ADR-054 — Aşama 8 doğrulama yöntemi: betikli regresyon repoda değil; erişilebilirlik elle ve izinle axe

- **Durum:** Kabul
- **Karar:**
  - Regresyon betiği çalışma alanında tutulur ve sonuçları kanıt olarak TRACEABILITY ve RELEASE_CHECKLIST'e yazılır. Kullanıcı kararıyla repoya test eklenmez (ADR-009).
  - Erişilebilirlik bu teslimde elle denetlendi: 320 px taşma ölçümü, form hata akışı, başlık ve odak.
  - Otomatik axe taraması, tarayıcıya dış betik yükleme izni verilmediği için yapılamadı. Kullanıcı izniyle aynı yöntemle veya CI'da yapılacak.
- **Gerekçe:** Proje kuralları (test yok, araç paketi eklenmez) ile şartnamenin "tam regresyon, axe/manual" kapısı arasında denge. Yapılmayan doğrulama raporda açıkça yazılır.

## ADR-055 — İki adımlı doğrulama kaldırıldı; giriş yalnız e-posta ve şifre

- **Durum:** Kabul (ürün sahibi, 18 Kas 2026)
- **Bağlam:** Şartname §13 platform kullanıcıları için MFA'yı zorunlu, müşteri sahipleri için varsayılan zorunlu tutar. Ürün sahibi sadeleştirme kapsamında iki adımlı doğrulamanın ve ayarlarının kaldırılmasını istedi.
- **Karar:**
  - Giriş iki realm'de de yalnız e-posta ve şifreyle yapılır. Başarılı giriş doğrudan oturum açar.
  - Kaldırılanlar:
    - MFA uçları (`/mfa`, `/mfa/enroll`, `/mfa/verify`, `/mfa/recovery/regenerate`), challenge'lar ve kurtarma kodları.
    - Kullanıcı sunumundaki `mfaEnabled` ve `mfaRequired` alanları.
    - `MFA_*` hata kodları, ilgili tablolar ve audit olayları.
    - Hesap güvenliği sayfasındaki MFA bölümü (sayfada yalnız açık oturumlar kalır).
    - Mock'taki `/__dev/mfa-code` yardımcısı.
  - Korunan hesap güvenliği önlemleri: şifre politikası (12+ karakter, yaygın şifre yok), başarısız giriş sınırı (15 dakikada 5), hesap varlığının gizlenmesi, oturum süreleri, oturum sonlandırma, sıfırlamada bütün oturumların kapanması, CSRF ve köken denetimi.
- **Sonuç:** Ele geçirilmiş bir şifre doğrudan hesaba erişim verir. Platform hesapları bütün kiracılara eriştiği için risk en çok oradadır. Risk kabulü ürün sahibindedir ([SECURITY_REVIEW.md](SECURITY_REVIEW.md) §4). Gerekirse MFA geriye uyumlu biçimde yeniden eklenebilir: giriş yanıtındaki `status` alanı bu yüzden korunmuştur.

## ADR-056 — Sade yetki modeli: rol yok, davet yok, müşteri başına tek hesap

- **Durum:** Kabul (ürün sahibi, 18 Kas 2026)
- **Bağlam:** Şartname §13 RBAC (platform rolleri, site rolleri, özel roller), davet ve görevler ayrılığıyla inceleme akışı ister. Ürün sahibi bu tarafın olabildiğince yalın olmasını istedi: platformda kayıtlı herkes tam yetkili yönetici; müşteri tarafında tek müşteri, birden fazla site; başkasını davet etme veya yetki verme yok.
- **Karar:**
  - **Platform:** Kayıtlı her platform kullanıcısı bütün platform izinlerine sahiptir. Kullanıcı sunumunda ve veri modelinde rol yoktur. `platform.member.manage` izni kalktı.
  - **Müşteri:** Her müşterinin panele giren tek hesabı vardır. Hesap müşterinin bütün sitelerinde bütün site izinlerine sahiptir. Bir hesap yalnız bir müşteriye bağlıdır; e-posta müşteri realm'inde tekildir.
  - **Hesap yönetimi platformdadır:** Müşteri oluşturulurken hesap (`account: { email, displayName }`) birlikte oluşur. Hesap şifresiz açılır; e-postasına 7 gün geçerli şifre belirleme bağlantısı gider. Platform hesabın e-postasını ve adını değiştirebilir (e-posta değişince oturumlar kapanır, yeni adrese bağlantı gider) ve bağlantıyı yeniden gönderebilir ([backend/02-tenancy.md](backend/02-tenancy.md) "Müşteri hesabı").
  - **Kaldırılanlar:** platform ve site rolleri, rol kataloğu, üye ve davet uçları (platform ve müşteri), davet önizleme/kabul, `site_grants` ve `invites` tabloları, alan düzeyinde rol kısıtı (`permissions.editRoles` artık uygulanmaz), müşteri panelindeki "Kullanıcılar" ekranı, platformdaki üye/davet ekranları.
  - **Sonucu olarak inceleme akışı da kaldırıldı:** Tek kişilik hesapta görevler ayrılığı (gönderen onaylayamaz) mümkün değildir. `submit`/`approve`/`request-changes`, yorumlar, görev kutusu, `IN_REVIEW`/`CHANGES_REQUESTED`/`APPROVED` durumları, `review.*` bildirimleri ve ilgili hata kodları kalktı. `behavior.workflow` yalnız `direct` alır. Ana ekrandaki "Bekleyen işler" kartı "Yayın bekleyenler" oldu (yayınlanmamış veya yayınlanmamış değişikliği olan kayıtlar).
  - **Korunanlar:** İzin adları ve her uçtaki izin denetimi kalır. `tenant_memberships` hesap–müşteri bağı olarak kalır (`role` her zaman `TENANT_OWNER`). Böylece ileride rol eklenirse uç sözleşmesi değişmez.
- **Sonuç:**
  - Şartname §13 RBAC, davet ve görevler ayrılığı maddelerinden ve AT-16 (stale approval), AT-35 (rol/yetki matrisi) kabul testlerinden bilinçli ayrılmadır; risk kabulü ürün sahibindedir.
  - Bir müşteride birden çok kişi çalışacaksa aynı hesabı paylaşmak zorundadır; işlem geçmişi kişiyi ayırt edemez. Bu ihtiyaç doğarsa rol ve davet bu ADR'nin korunan noktaları üzerine geriye uyumlu eklenebilir.
  - Platform kullanıcısı ekleme ekranı ve ucu tanımlanmadı; ilk kullanıcı bootstrap CLI ile oluşturulur (şartname §19).

## ADR-057 — Sadeleştirme 3: yayın paketi, ana ekran yapılandırması, yasal saklama, içe aktarma ve bildirim tercihleri yok

- **Durum:** Kabul (ürün sahibi, 18 Kas 2026: "genel yapımızı bozmayacak ve yine her siteyi yönetebileceğimiz şekilde sadeleştir")
- **Bağlam:** Tek kişilik müşteri hesabıyla (ADR-056) bazı özellikler anlamını yitirdi; bazıları bu ürünün ölçeği için ağırdı. Platformun her siteyi yönetme yeteneği (müşteri, site, modül/şema, form, entegrasyon, dil, kopyalama, kalıcı silme) korunmalıydı.
- **Karar:**
  - **Yayın paketi kaldırıldı:** `releases/**` uçları, paket önizlemesi, paket planı, `release.published` webhook olayı, `RELEASE_INVALID` ve `ROLLBACK_BLOCKED`. Kayıt tek tek yayınlanır.
  - **Basit/gelişmiş yayın araçları ayrımı (`publishingTools`) kaldırıldı:** "Yayını planla" her sitede açıktır.
  - **Ana ekran sabittir:** platformdaki "Ana ekran" sekmesi ve `config/**` uçları kalktı; her sitede aynı kartlar aynı sırayla gelir. Az kullanılan "İçerik sayıları" kartı çıktı.
  - **Yasal saklama kaldırıldı:** kalıcı silmenin koruması arşiv şartı ve müşteri adını yazarak onaydır. `LEGAL_HOLD` kodu yok.
  - **İçe aktarma kaldırıldı:** `imports/**` uçları, `import.*` işleri, bildirimi ve `IMPORT_NOT_VALIDATED`. Dışa aktarma (site JSON yedeği, bölüm ve başvuru CSV'si) kalır; menüde "Dışa aktarma" adını alır. Yeni siteye içerik taşıma platformdaki site kopyalamayla yapılır.
  - **Bildirim e-posta tercihleri kaldırıldı:** e-posta gönderimi türe göre sabittir; bildirim zili kalır.
  - **Anahtarlar sunucuda üretilir:** müşteri ve site oluşturmada `key` isteğe bağlıdır; verilmezse addan üretilir (Türkçe harfler sadeleşir, çakışırsa `-2`, `-3`). Panel anahtar sormaz.
  - **Platform ekranları:** müşteri detayı iki sekme (Genel: bilgiler, müşteri hesabı, kalıcı silme · Siteler); site oluşturma iki adım (site bilgileri · başlangıç modülleri; saat dilimi varsayılan İstanbul, sonradan düzenlenir).
- **Sonuç:**
  - Şartname §10 (release), §18 (içe aktarma, pano yapılandırması, bildirim tercihleri) ve §25.8 (legal hold) maddelerinden bilinçli ayrılmadır. AT-18 kapsam dışıdır; AT-27 ve AT-64 daraltılmıştır.
  - Kalan yapı değişmedi: izin denetimi, revizyon ve yayın kopyası, planlı yayın, önizleme, delivery ve `releaseVersion` sayacı aynen çalışır. Kaldırılan özellikler gerekirse bu yapının üzerine geriye uyumlu eklenebilir.

## ADR-058 — Anlaşılırlık: platformda müşteriyle aynı terimler, şifre değiştirme, eski izlerin temizliği

- **Durum:** Kabul (ürün sahibi, 18 Kas 2026)
- **Bağlam:** Sadeleştirmelerden sonra yapılan kontrolde müşteri panelinde teknik terim kalmadığı görüldü. Platform panelinde ise aynı kavram farklı adla geçiyordu (platformda "modül", müşteride "içerik bölümü") ve teknik terimler vardı (preset, şema, manifest, dry-run). MFA kalktıktan sonra "Hesap güvenliği" sayfasında şifre değiştirme yoktu.
- **Karar:**
  - **Terimler (yalnız ekranda görünen metin ve sunucu mesajları):** modül → bölüm, modül şablonu → bölüm şablonu, preset → site şablonu, şema → yapı, manifest → tasarım dosyası, dry-run → kayıt denetimi. Sayfa bölümü (section) ile karışabilecek yerlerde "sayfa bölümü" ve "içerik bölümü" ayrımı yazılır. API yolları, alan adları, kodlar ve veri değişmez (`/moduller`, `moduleKey`, `presets` aynen kalır).
  - **"Alan tipleri" sekmesi kaldırıldı:** 48 yerleşik tip tasarımcının alan paletinde açıklamalarıyla ve aramayla zaten seçiliyor. Menü öğesi "Alan grupları" oldu.
  - **Şema paketinde eski izler temizlendi:** yeni alanlara `permissions: { editRoles: [] }`, yeni şemalara `behavior.workflow` yazılmaz; koşulda rol kısıtı çatışma denetimi kalktı. Eski şemalar okunmaya devam eder.
  - **Şifre değiştirme eklendi:** `POST /auth/{realm}/password` (`currentPassword`, `newPassword`). Mevcut şifre yanlışsa `422 INVALID_CREDENTIALS` (giriş sınırıyla aynı sayaç); politika ve `SAME_AS_CURRENT` denetlenir. Bu oturum açık kalır, diğerleri kapanır; audit `auth.password_changed`. Panelde "Hesap güvenliği → Şifre değiştir".
- **Sonuç:** İki panel aynı dili konuşur. Backend sözleşmesindeki uç ve alan adları değişmediği için entegrasyon etkilenmez; yalnız insanlara gösterilen mesaj metinleri değişti. Şifre değişikliği "Şifremi unuttum" yoluna gerek kalmadan yapılır.
