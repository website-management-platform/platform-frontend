# 11 — Delivery (public) API, sayfa önizlemesi ve SDK (`delivery`)

Şartname §9, §15, §16, §25.4, §25.6, §25.8. Müşteri web sitelerinin (ve `@wmp/sdk` istemcisinin) okuduğu **oturumsuz** API.

Temel kural: delivery **yalnız yayın kopyasını** okur (`published_snapshots`; [08-publishing.md](08-publishing.md)). Taslak, revizyon, gizli alan, hassas alan ve `public: false` alan hiçbir koşulda dönmez.

| Yöntem | Yol (`/api/v1` altında) | Amaç |
|---|---|---|
| GET | `/delivery/sites/{publicKey}/info` | Site adı, diller, ayarlar, bakım, etkin manifest |
| GET | `/delivery/sites/{publicKey}/content/{moduleKey}` | Modülün yayındaki kayıtları (süzgeç, sıralama, imleç) |
| GET | `/delivery/sites/{publicKey}/content/{moduleKey}/{entryId}` | Tek kayıt; tek kayıtlı modülde `{entryId}` yerine `singleton` |
| GET | `/delivery/sites/{publicKey}/pages/resolve?path=` | Adres çözme: sayfa, kayıt, yönlendirme |
| GET | `/delivery/sites/{publicKey}/pages/bundle?path=` | Sayfa + ayarlar + bütün menüler tek tutarlı okumada |
| GET | `/delivery/sites/{publicKey}/menus/{location}` | Tek menü |
| GET | `/delivery/sites/{publicKey}/sitemap` | Site haritası verisi |
| GET | `/delivery/sites/{publicKey}/redirects` | Yönlendirme tablosu (edge/CDN için) |
| GET | `/delivery/sites/{publicKey}/robots` | Dizinleme bilgisi |
| GET · HEAD | `/delivery/sites/{publicKey}/assets/{assetId}/{variant}` | Yayındaki medya (Range destekli) |
| OPTIONS | `/delivery/sites/{publicKey}/*` | CORS ön kontrolü |
| GET | `/preview/sites/{publicKey}/pages/resolve?path=` | Sayfa önizlemesi (belirteçli) |
| GET | `/preview/sites/{publicKey}/pages/bundle?path=` | Bundle önizlemesi (belirteçli) |
| GET | `/preview/sites/{publicKey}/assets/{assetId}/{variant}?token=` | Önizleme medyası |

Ortak sorgu parametresi: `locale` (verilmezse sitenin varsayılan dili). Sitede olmayan dil `400 MALFORMED_REQUEST`.

**Durum:** Bütün uçlar backend'de uygulanmıştır (`customer-api`, `com.wmp.customer.delivery`; backend ADR-0008, ADR-0009, ADR-0010). Form bölümü ve form uçları da backend'dedir ([13-forms.md](13-forms.md)). Örnek frontend `apps/site-demo` (port 5310) bu uçları SDK ile gerçek backend'den okur.

---

## 1. Site ve erişim

| Durum | Yanıt |
|---|---|
| `publicKey` bilinmiyor, site veya kiracı arşivli | `404 NOT_FOUND` (numaralandırma yok) |
| Site veya kiracı askıda | `503 SITE_UNAVAILABLE`. Frontend bakım sayfası gösterir. |
| `deliveryAccess: private` ve geçerli anahtar yok | `401 CREDENTIAL_REQUIRED` |

**Özel mod** (`deliveryAccess: private`): Yalnız sunucudan sunucuya okuma. İstek `Authorization: Bearer wmp_sk_…` taşır. Anahtar bu siteye ait, etkin, süresi geçmemiş ve `delivery:read` kapsamlı olmalıdır. Rotasyonda eski anahtar 24 saat daha geçerlidir ([12-integrations.md](12-integrations.md) §3). Anahtar tarayıcıya konmaz; SDK'ya yalnız sunucu ortamında verilir.

**Rate limit:** İstemci IP'si + site başına 100 istek/dakika (şartname başlangıç değeri, yapılandırılabilir). Medya ucu ayrı sayaçtadır: 600 istek/dakika; üretimde CDN önünden sunulduğu için kaynağa düşen istek azdır. Aşımda `429 RATE_LIMITED` ve `Retry-After` ([00-conventions.md](00-conventions.md) §10). **[Sözleşme]** Sunucu tarafı (SSR) frontend tek IP'den çok ziyaretçi adına okur; bu yüzden özel mod anahtarıyla gelen istek anahtar başına ayrı sayaçla sınırlanır.

## 2. Yanıt zarfı, önbellek ve CORS

Bütün JSON yanıtları:

```json
{ "data": { … }, "meta": { "releaseVersion": 42, "requestedLocale": "tr", … } }
```

`meta.releaseVersion`, sitenin yayın sayacıdır. Her yayın, kaldırma, paket yayını ve geri alma onu artırır ([08-publishing.md](08-publishing.md) §4).

| Başlık | Değer |
|---|---|
| `ETag` | `W/"<gövde özeti>"`. Aynı gövde aynı ETag'i verir. |
| `If-None-Match` | ETag eşleşirse `304 Not Modified`, gövdesiz |
| `Cache-Control` | `public, max-age=60`. Sitede `allowStaleWhileRevalidate` açıksa ek olarak `stale-while-revalidate=300`. |
| `Vary` | `Origin` |
| `Access-Control-Allow-Origin` | Yalnız izinli köken (aşağıda); aksi hâlde başlık yok |
| `Access-Control-Expose-Headers` | `ETag, X-Request-Id, Retry-After` |

**Önbellek anahtarı [Sözleşme]:** CDN veya uygulama önbelleği `(siteId, yol, sorgu, locale, releaseVersion)` ile anahtarlanır. Bir site veya dilin yanıtı başka bir sitenin anahtarına düşemez (AT-31). Yayında sitenin `releaseVersion` değeri artar ve eski anahtarlar kendiliğinden geçersiz olur. Mock'ta 60 saniyelik `max-age` vardır; yayından hemen sonra eski yanıt görülebilir.

**İzinli kökenler (CORS):** Sitenin `allowedOrigins` listesi ve **doğrulanmış** alan adlarının `https://` kökenleri. Yönetim panelleri hiçbir zaman izinli değildir. Ön kontrol (`OPTIONS`) yalnız `GET, HEAD` yöntemlerine ve `Authorization, If-None-Match` başlıklarına izin verir; `Access-Control-Max-Age: 600`. Kökeni izinsiz istek `204` alır ama izin başlığı almaz.

## 3. Public projeksiyon

Her kayıt ve ayar şu kurallarla dönüştürülür (`projectPublic`, `@wmp/schema`):

| Kural | Ayrıntı |
|---|---|
| Alan süzgeci | `public: false`, `sensitive`, `hidden` değer alanları, arşivli alanlar ve koşulu sağlanmayan alanlar çıkar (AT-24, AT-44) |
| Anahtar | Değerler alan **anahtarıyla** döner (iç kimlikle değil) |
| Dil | Dile bağlı alanlar istenen dilin değeridir; §4 geri dönüş kuralı |
| Medya | `{ id, kind, url, width, height, alt, caption, focalPoint, variants[] }` (görsel) veya `{ id, kind, url, fileName, mimeType, size, title }`. Yalnız `ready` dosya; değilse alan `null` ya da listeden çıkar. Dekoratif görselde `alt: ""`. |
| İlişki | Yalnız yayındaki hedeflerin kimlikleri. `include` ile istenen ilk düzey ilişki kayıt olarak gömülür; istek başına en çok 50 gömme. |
| Adres | Manifest'te modül için kalıp varsa kayıt `path` alanı taşır (§6) |
| Kimlik | Her kayıtta `id` |

Medya adresleri gelen isteğin herkese açık kökeniyle (`X-Forwarded-Proto`, `X-Forwarded-Host`) mutlak üretilir. **[Sözleşme]** Üretimde yapılandırılmış CDN kökeni kullanılır.

Public→özel yapılan alan, şema yayını anından itibaren hiçbir delivery yanıtında dönmez. Projeksiyon her okumada etkin şemayla yapılır; önbellekteki eski yanıt `releaseVersion` ile düşer, çünkü şema yayını da yayın kopyalarını yeniden yazar (AT-49).

## 4. Dil geri dönüşü

Sitenin `localeFallback` ayarı ([12-integrations.md](12-integrations.md) §1):

| Değer | Davranış |
|---|---|
| `default` | İstenen dilde boş olan dile bağlı alan varsayılan dilin **yayındaki** değerini alır. Kayıtta `meta.fallbackUsed: true`, `meta.resolvedLocale` varsayılan dildir. |
| `none` | Geri dönüş yok; boş alan boş döner. Menüde bu dilde etiketi olmayan öğe atlanır. |

Taslaktan geri dönüş hiçbir zaman yapılmaz (AT-09).

## 5. Kayıt listesi

`GET /delivery/sites/{publicKey}/content/{moduleKey}` — modül açık olmalı ve yapı modülü olmamalı ([10-site-structure.md](10-site-structure.md) §1); aksi hâlde `404`.

| Parametre | Kural |
|---|---|
| `filter.<alan>[op]=değer` | Yalnız `filterable`, `public`, hassas olmayan, arşivli olmayan alan; operatör alan tipinin izin verdiği listeden (`eq`, `ne`, `in`, `contains`, `startsWith`, `gt`, `gte`, `lt`, `lte`, `exists`). `op` verilmezse `eq`. En çok 20 süzgeç. |
| `sort=<alan>:<asc\|desc>` | `position` (varsayılan), `publishedAt` veya `sortable` + `public` alan. Eşitlikte kayıt kimliği. |
| `limit` | 1–100, varsayılan 20 |
| `cursor` | Önceki yanıtın `meta.nextCursor` değeri |
| `fields` | Virgülle; yalnız public alanlar |
| `include` | Virgülle; yalnız public `relation`/`relationList` alanları |

- Sorgu en çok 2 KB'dir. İzinsiz süzgeç, sıralama, alan veya ilişki `400 MALFORMED_REQUEST` döner. Projeksiyon hiçbir parametreyle aşılamaz (AT-24).
- **İmleç** imzalıdır (HMAC). Modüle, dile, sıralamaya ve süzgeçlere bağlıdır. Başka sorguda kullanılan veya değiştirilen imleç `400 INVALID_CURSOR` döner.
- Yanıt: `data[]` kayıtlar; `meta: { moduleKey, schemaVersion, requestedLocale, nextCursor, releaseVersion }`. Geri dönüş kullanılan kayıtta ayrıca `meta`.

Tek kayıt ucu yalnız yayında olan kaydı döner (`404`). `include` parametresi alır. `meta`: `{ moduleKey, requestedLocale, resolvedLocale, fallbackUsed, releaseVersion }`.

## 6. Adres çözme ve sayfa bundle'ı

`GET …/pages/resolve?path=/kurumsal/hakkimizda&locale=tr`

`path` `/` ile başlamalı; `//`, boşluk, `?`, `#` içermemeli; en çok 500 karakter. URL çözülür, sondaki `/` kırpılır. Aksi hâlde `400 MALFORMED_REQUEST`.

Çözüm sırası:

1. **Sayfa:** Yayındaki sayfa ağacından bu dilde bu adrese sahip sayfa ([10-site-structure.md](10-site-structure.md) §2.1)
2. **Kayıt:** Etkin manifest'in adres kalıpları (`/haberler/:slug`, `/ekip/:id`). Kalıbın son parçası kaydın bu dildeki `slug` değeri (yoksa varsayılan dil) veya kimliğidir.
3. **Elle yönlendirme:** Etkin kurallardan tam eşleşme veya `*` önek eşleşmesi
4. **Adres geçmişi:** Eski adresse `301` ile yeni adres; sayfa yayında değilse `410 GONE`
5. Hiçbiri: `404 NOT_FOUND`

Yanıt (`data`):

```json
{ "type": "page", "page": { "id": "…", "title": "…", "layout": "landing", "sections": [ … ], "path": "/", "alternates": { "tr": "/", "en": "/" }, "seo": { "title": "…", "description": "…", "image": { … }, "noindex": false }, "meta": { "resolvedLocale": "tr", "fallbackUsed": false } } }
{ "type": "entry", "moduleKey": "haberler", "entry": { "id": "…", "path": "/haberler/yeni-ofis", … }, "meta": { … } }
{ "type": "redirect", "statusCode": 301, "location": "/yeni-adres", "automatic": true }
```

| Sayfa alanı | Kural |
|---|---|
| `sections` | Gizli bölümler çıkar; `hidden` anahtarı dönmez. Her `contentSource` alanı `{ mode, module, items[] }` olarak çözülür. `items` kaynak modülün o anki yayındaki kayıtlarıdır (projeksiyonlu). |
| `alternates` | Sayfanın her dildeki adresi (`hreflang` için) |
| `seo.title` | `seoTitle` → `title` → ayarlardaki `defaultSeoTitle` |
| `seo.description` | `seoDescription` → `defaultSeoDescription` |
| `seo.image` | `shareImage` → ayarlardaki `shareImage` |
| `seo.noindex` | Sayfanın `noindex` değeri veya ayarlardaki `robots: noindex` |

`redirect` yanıtı `200` ile döner; HTTP yönlendirmesini frontend yapar (`statusCode`, `location`). Dış hedef yalnız izinli alan adlarındadır ([10-site-structure.md](10-site-structure.md) §5).

**Bundle** (`…/pages/bundle?path=`): `{ route, settings, menus: { header, footer, mobile, secondary } }`. Tanımlı olmayan menü yerleşimi anahtarı yoktur. Bütün parçalar **tek tutarlı okumadan** gelir: aynı `releaseVersion` (şartname §25.4, AT-52). **[Sözleşme]** Backend bunu tek transaction'da (repeatable read) veya aynı yayın işaretçi kümesinden okuyarak sağlar. `route` için 404/410 hataları bundle'da da aynıdır.

## 7. Menü, site haritası, yönlendirme, robots

**Menü** (`…/menus/{location}`): `location` `header` · `footer` · `mobile` · `secondary`; tanımsız veya yayında değilse `404`.

```json
{ "location": "header", "name": "Üst menü", "items": [ { "id": "…", "kind": "page", "label": "Hakkımızda", "href": "/hakkimizda", "cta": false, "children": [] } ] }
```

- Gizli öğe atlanır.
- Hedefi yayında olmayan öğe atlanır; `group` öğesinin alt öğeleri yine değerlendirilir.
- Bu dilde etiketi olmayan öğe atlanır (`localeFallback: none` ise).
- `newTab` öğesinde `target: "_blank"` ve `rel: "noopener noreferrer"`.
- `anchor` öğesinde `href: "#<anchor>"`; `group` öğesinde `href: null`.

**Site haritası** (`…/sitemap`): `data[]` → `{ type: page|entry, id, moduleKey?, alternates: { dil: yol }, lastModified }`. `meta`: `{ baseUrl, locales, defaultLocale }`. `noindex` sayfalar girmez. Kayıtlar yalnız manifest'te adres kalıbı olan modüllerden gelir. Site `robots: noindex` ise liste boştur. XML üretimi frontend'indir.

**Yönlendirmeler** (`…/redirects`): Edge/CDN'de uygulanmak için tam tablo:

```json
[ { "source": "/eski-blog/*", "wildcard": true, "location": "/blog", "statusCode": 301, "locales": ["tr", "en"], "automatic": false },
  { "source": "/hizmetler/eski", "wildcard": false, "location": null, "statusCode": 410, "locales": ["tr"], "automatic": true } ]
```

Elle yazılan kural her dil için çözülür; hedefi aynı olan diller tek satırda birleşir. Adres geçmişi satırları `automatic: true` taşır.

**Robots** (`…/robots`): `{ index, sitemap }`. `index` ayarlardaki `robots` değerinden gelir; `sitemap` = `publicBaseUrl` + `/sitemap.xml` (yoksa `null`).

## 8. Medya ucu

`GET|HEAD …/assets/{assetId}/{variant}` — `variant`: `original` veya varlığın varyant adı.

| Kural | Ayrıntı |
|---|---|
| Görünürlük | Dosya bu siteye ait, `ready` ve **yayındaki bir kopyada kullanılıyor** olmalı. Aksi hâlde `404` (taslakta kullanılan dosya sızmaz; şartname §25.6, AT-54). |
| Başlıklar | `Content-Type` (tespit edilen tür), `X-Content-Type-Options: nosniff`, `ETag` (içerik özeti), `Accept-Ranges: bytes`, `Cache-Control: public, max-age=86400` |
| İndirme | Görsel, video ve ses dışındaki türler `Content-Disposition: attachment` ve güvenli dosya adı (`filename*` UTF-8) |
| Range | `bytes=a-b`, `bytes=a-`, `bytes=-n` → `206` + `Content-Range`. Geçersiz veya dosya dışı aralık `416` + `Content-Range: bytes */<boyut>`. |
| HEAD | Aynı başlıklar, gövdesiz |
| Koşullu | `If-None-Match` eşleşirse `304` |

Mock varyant üretmez; her varyant adı için orijinal baytları döner (ADR-034). **[Sözleşme]** Backend nesne deposundan imzalı CDN adresine yönlendirebilir; görünürlük kuralı aynıdır.

## 9. Sayfa önizlemesi

Önizleme belirteci [08-publishing.md](08-publishing.md) §6'dadır. Sayfa önizleme uçları delivery ile aynı kodu çalıştırır; tek fark okunacak değerlerdir:

| Belirteç kapsamı | Görünüm |
|---|---|
| Kayıt (`entryId`, `revisionId`) | O kayıt için belirtilen revizyon, diğer her şey yayındaki hâl |

Böylece taslak bir sayfa, yayındaki menü ve ayarlarla birlikte gerçek tasarımda görülür.

| Kural | Ayrıntı |
|---|---|
| Kimlik | `Authorization: Bearer pv_…` veya `X-Preview-Token`. Medya ucunda `?token=` (görsel etiketi başlık gönderemez). Medya adresleri belirteçli önizleme adresine yazılır. |
| Dil | Sayfa uçlarında belirtecin dili; başka dil `403 PREVIEW_SCOPE_DENIED`. Medya ucunda dil denetlenmez. |
| Başlıklar | `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow`, `Referrer-Policy: no-referrer`; `304` yok |
| `meta.preview` | `true` |
| `robots.index` | Önizlemede her zaman `false` |

Delivery uçları hiçbir koşulda belirteç kabul etmez ve taslak döndürmez (AT-19).

## 10. SDK (`@wmp/sdk`)

`packages/sdk` — tarayıcıda ve Node'da çalışan, bağımlılıksız istemci. Müşteri sitelerinin frontend ekipleri bunu kullanır.

```js
import { createClient, isWmpError, richTextToHtml } from "@wmp/sdk";

const wmp = createClient({ baseUrl: "https://api.ornek.com/api/v1", siteKey: "pk_…", locale: "tr" });
const { data, meta } = await wmp.getPageBundle("/hakkimizda");
```

| Seçenek | Varsayılan | Anlamı |
|---|---|---|
| `baseUrl`, `siteKey` | — | API kökü ve sitenin `publicKey` değeri (zorunlu) |
| `locale` | sitenin varsayılanı | Her çağrıda `options.locale` ile ezilebilir |
| `fetch` | `globalThis.fetch` | Özel fetch (SSR, test) |
| `timeoutMs` | 8000 | İstek başına zaman aşımı; `options.signal` ile birlikte çalışır |
| `retries` | 2 | `429`, `502`, `503`, `504` ve ağ hatasında üstel bekleme; `Retry-After` dikkate alınır |
| `credential` | `null` | Özel mod anahtarı; **yalnız sunucuda** |
| `previewToken` | `null` | Verilirse istekler `/preview/...` uçlarına gider ve önbelleğe alınmaz. Önizlemede karşılığı olan metotlar: `resolvePage`, `getPageBundle`, `getEntry`. |
| `cache` | `true` | ETag önbelleği: `If-None-Match`, `304`'te önbellekteki gövde |

| Metot | Uç |
|---|---|
| `getSiteInfo()` | `info` |
| `getCollection(moduleKey, { limit, cursor, sort, fields, include, filter })` | `content/{moduleKey}`; `filter: { kategori: "x", puan: { gte: 3 } }` |
| `getSingleton(moduleKey)` · `getEntry(moduleKey, id, { include })` | Tek kayıt |
| `resolvePage(path)` · `getPageBundle(path)` | Sayfa |
| `getMenu(location)` · `getSitemap()` · `getRedirects()` · `getRobots()` | Diğer uçlar |
| `getForm(formKey)` · `submitForm(formKey, input, { idempotencyKey })` · `uploadFormFile(formKey, { formVersion, fieldKey, file, nonce })` | Formlar ([13-forms.md](13-forms.md)). `createSubmissionNonce()` başvuru başına anahtar üretir. Yazma istekleri `Idempotency-Key` taşıdığı için ağ hatasında güvenle yeniden denenir. Alan hataları `WmpError.errors[]`. |
| `consistent(task, { attempts })` | Birden çok isteğin aynı `releaseVersion` değerini görmesini sağlar; farklıysa yeniden dener |
| `releaseVersion` | Son görülen yayın sürümü |

- Hata durumunda `WmpError { status, code, message, requestId, retryAfter }` fırlatılır; `isWmpError(e)` ile ayırt edilir. Yanıt zarfı (`data`, `meta`) denetlenir; uymazsa `INVALID_RESPONSE`.
- `richTextToHtml(doc)`: zengin metni güvenli HTML'e çevirir. Bütün metin kaçışlanır; bağlantılar yalnız `https`, `http`, `mailto`, `tel`, `/` ile başlayan göreli adres veya `#` olabilir; `javascript:`, `//` ve diğerleri düşer. Dış bağlantıya `rel="noopener noreferrer"` eklenir.

## 11. Hata kodları

| HTTP | Kod | Ne zaman |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | Geçersiz dil, yol, süzgeç, sıralama, `fields`, `include`, `limit` |
| 400 | `INVALID_CURSOR` | İmleç imzası veya kapsamı geçersiz |
| 401 | `CREDENTIAL_REQUIRED` | Özel sitede anahtar yok, geçersiz veya kapsamsız |
| 401 | `PREVIEW_TOKEN_INVALID` | Önizleme belirteci geçersiz |
| 403 | `PREVIEW_SCOPE_DENIED` | Belirteç başka dil için |
| 404 | `NOT_FOUND` | Site, modül, kayıt, adres, menü veya medya yok ya da yayında değil |
| 410 | `GONE` | Adres eskiden bir sayfaya aitti, sayfa yayından kalktı |
| 416 | — | Geçersiz Range |
| 429 | `RATE_LIMITED` | Dakikalık sınır aşıldı |
| 503 | `SITE_UNAVAILABLE` | Site veya kiracı askıda |

## 12. Veri modeli

Delivery yeni tablo yazmaz; `published_snapshots`, `route_history`, `site_domains`, `api_credentials`, `frontend_manifests` okur. Okuma rolü **[Sözleşme]** revizyon ve taslak tablolarını okuyamaz (AT-62).

## Değişiklik geçmişi

| Tarih | Değişiklik |
|---|---|
| 17 Kas 2026 | İlk sürüm (Aşama 6): delivery uçları, projeksiyon, dil geri dönüşü, liste sorgusu ve imzalı imleç, adres çözme ve bundle, menü, site haritası, yönlendirme, robots, medya ucu (Range), sayfa önizlemesi, SDK. |
| 18 Kas 2026 | Aşama 7: SDK form metotları; sayfa bölümlerinde `form` (`form: { key } \| null`). |
| 18 Kas 2026 | Sadeleştirme (ADR-057): paket önizlemesi kaldırıldı; belirteç yalnız kayıt revizyonu içindir. |
