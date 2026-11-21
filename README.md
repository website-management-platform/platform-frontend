# platform-frontend

Website Management Platform'un **platform paneli**: platform sahibinin müşterileri, siteleri, şablonları, entegrasyonları ve operasyonu yönettiği arayüz. React 19, Vite, JavaScript.

| Depo | Görevi |
|---|---|
| [platform-api](https://github.com/website-management-platform/platform-api) | Platform paneli API'si (8781); migration'lar, demo verisi, ortak belgeler |
| [panel-api](https://github.com/website-management-platform/panel-api) | Müşteri paneli ve yayın API'si (8782) |
| **platform-frontend** (bu depo) | Platform paneli arayüzü |
| [panel-frontend](https://github.com/website-management-platform/panel-frontend) | Müşteri paneli arayüzü ve örnek müşteri sitesi |

`packages/ui` ve `packages/schema` iki panelde ortaktır; bir değişiklik iki depoda da aynı şekilde yapılmalıdır.

| Klasör | İçerik |
|---|---|
| `apps/platform-admin` | Panelin kendisi: `src/config` (ad, rotalar) ve `src/features` (ekranlar) |
| `packages/ui` | Ortak katman: bileşenler, tasarım token'ları, API istemcisi, sayfa kabuğu |
| `packages/schema` | Alan tipleri ve şema motoru; backend'de birebir aynısı çalışır |
| `docs/backend` | API sözleşmesi: uçlar, alanlar, hata kodları (iki API için) |
| `docs/DECISIONS.md` | Frontend mimari kararları |

## Yerelde çalıştırma

Gerekenler: Node.js 22.12 veya üzeri ve çalışan platform-api (8781).

```sh
npm ci
npm run dev           # http://localhost:5300
```

Giriş ekranındaki "Demo hesapları" bölümü demo hesabını tek tıkla doldurur. Yalnız geliştirmede açık sayfalar: `/bilesenler` (bileşen kütüphanesi), `/dev/posta-kutusu` (gönderilen e-postalar).

## Kontroller

```sh
npm run lint
npm run build
```

CI her değişiklikte lint, derleme, bağımlılık denetimi (`npm audit`) ve sır taraması yapar.

## Yayına alma (Netlify)

Panel tek bir Netlify sitesidir; ayarlar `apps/platform-admin/netlify.toml` içinde. Sitede iki ortam değişkeni tanımlanır:

| Değişken | Değer |
|---|---|
| `API_ORIGIN` | API'nin https adresi (platform-api) |
| `STORAGE_ORIGIN` | Cloudflare R2 uç noktası, ör. `https://<hesap>.r2.cloudflarestorage.com` |

Derleme sonunda `scripts/netlify-config.mjs`, `/api` isteklerini API'ye aktaran yönlendirmeyi ve güvenlik başlıklarını (CSP, HSTS) üretir. Değişkenlerden biri eksikse derleme durur. Adım adım kurulum: platform-api deposundaki [docs/runbooks/deploy-northflank.md](https://github.com/website-management-platform/platform-api/blob/main/docs/runbooks/deploy-northflank.md).
