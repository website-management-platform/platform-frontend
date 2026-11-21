# 01 — Kimlik (`identity`)

Bu modül şunları kapsar:

- CSRF token'ı
- E-posta ve şifreyle giriş
- Çıkış ve oturum yönetimi
- Şifre sıfırlama ve yeni müşteri hesabında ilk şifrenin belirlenmesi

Bütün uçlar realm'lidir. Yoldaki `{realm}` değeri yalnız `platform` veya `customer` olabilir; başka bir değer `404 NOT_FOUND` döner. İki realm birbirinden tamamen ayrı kimlik alanıdır: aynı e-posta adresi iki realm'de iki ayrı hesaptır (şartname §13).

Ortak kurallar [00-conventions.md](00-conventions.md)'dedir: §3 oturum, §4 CSRF ve Origin, §5 hata biçimi.

| Yöntem | Yol | Amaç | Kimlik |
|---|---|---|---|
| GET | `/api/v1/auth/{realm}/csrf` | CSRF token çerezini yazar | Yok |
| POST | `/api/v1/auth/{realm}/login` | E-posta + şifre ile giriş; başarılıysa oturum açar | Yok |
| POST | `/api/v1/auth/{realm}/logout` | Oturumu kapatır | İsteğe bağlı |
| GET | `/api/v1/auth/{realm}/me` | Oturumdaki kullanıcı ve izin özeti | Oturum |
| GET | `/api/v1/auth/{realm}/sessions` | Kullanıcının açık oturumları | Oturum |
| DELETE | `/api/v1/auth/{realm}/sessions/{sessionId}` | Bir oturumu sonlandırır | Oturum |
| POST | `/api/v1/auth/{realm}/forgot` | Şifre sıfırlama bağlantısı ister | Yok |
| POST | `/api/v1/auth/{realm}/reset` | Bağlantıdaki token ile yeni şifre belirler | Yok |
| POST | `/api/v1/auth/{realm}/password` | Oturumdaki kullanıcı şifresini değiştirir | Oturum |

Bütün uçlar mock'ta uygulanmıştır.

**Şartnamede olup kullanılmayan uç:** `POST /auth/{realm}/refresh`. Oturum opak ve kayan sürelidir; her başarılı istek oturumu tazeler. Bu nedenle ayrı bir yenileme ucuna gerek yoktur (DECISIONS ADR-015).

---

## Ortak kurallar

### Kimlik deposu

| Konu | Kural |
|---|---|
| E-posta | Kırpılır ve küçük harfe çevrilir; realm içinde benzersizdir |
| Şifre özeti | Argon2id (şartname §13). Mock, Node'da yerleşik olduğu için scrypt kullanır (ADR-013). |
| Şifre politikası | 15–128 karakter (tek faktörlü giriş için NIST önerisi; backend ADR-0003); yaygın şifre kabul edilmez; e-postanın yerel kısmı (4 karakter ve üstü) şifrede geçemez. Aynı kurallar panelde ve sunucuda uygulanır. Hata kodları: `TOO_SHORT`, `TOO_LONG`, `COMMON`, `CONTAINS_EMAIL`. |
| Hesap durumu | `ACTIVE`, `SUSPENDED`, `CLOSED`. `ACTIVE` dışındaki hesap giriş yapamaz; açık oturumları bir sonraki istekte kapanır. |

### İki adımlı doğrulama

Yoktur. Giriş yalnız e-posta ve şifreyle yapılır; hesap güvenliği ayarlarında MFA bölümü bulunmaz. Bu, şartname §13'teki "platform MFA zorunlu, müşteri sahibi için varsayılan zorunlu" kuralından ürün sahibi kararıyla ayrılmadır (DECISIONS ADR-055). Hesap koruması şunlarla sağlanır: şifre politikası, başarısız giriş sınırı, hesap varlığının gizlenmesi, oturum süreleri ve oturum sonlandırma.

### Oturum

[00-conventions.md](00-conventions.md) §3:

| Konu | Kural |
|---|---|
| Çerezler | `PLATFORM-SESSION` / `CUSTOMER-SESSION`; `HttpOnly; Secure; SameSite=Lax; Path=/` |
| Saklama | Ham değer saklanmaz; yalnız SHA-256 özeti tutulur |
| Boşta kalma | Platform 30 dk, müşteri 60 dk |
| Mutlak süre | Platform 12 saat, müşteri 24 saat |
| Yenileme | Girişte yeni oturum açılır ve CSRF token'ı yenilenir. Şifre sıfırlamada kullanıcının bütün oturumları kapanır. |

### Rate limit

| Kapsam | Sınır | Anahtar |
|---|---|---|
| Başarısız giriş | 15 dakikada 5 | realm + e-posta + IP |
| Şifre sıfırlama isteği | 15 dakikada 3 | realm + e-posta |

Başarılı giriş, o anahtarın başarısız giriş sayacını sıfırlar. Sınır aşılınca `429 RATE_LIMITED` ve `Retry-After` döner.

### Hesap varlığının gizlenmesi

- Giriş: hesap yoksa, şifre yanlışsa veya hesap aktif değilse aynı yanıt döner: `401 INVALID_CREDENTIALS`, "E-posta veya şifre hatalı."
- Şifre sıfırlama isteği: hesap olsun olmasın aynı yanıt döner: `202`.

### Audit olayları

[04-audit.md](04-audit.md) katalogundaki olaylar:

- `auth.login`, `auth.login_failed`, `auth.logout`
- `auth.session_revoked`
- `auth.password_reset_requested`, `auth.password_reset`, `auth.password_changed`

Başarısız giriş de audit'e yazılır. Hata yanıtı dönse bile sayaç ve audit kaydı saklanır.

---

### `GET /api/v1/auth/{realm}/csrf`

Realm'e özel CSRF token'ını üretir ve çereze yazar. Panel ilk mutasyondan önce ve `CSRF_TOKEN_INVALID` aldıktan sonra bu ucu çağırır.

| | |
|---|---|
| Kimlik | Oturum gerekmez · CSRF: hayır |
| Yetki | Yok |

**Yanıt** — `200`

```json
{ "realm": "platform" }
```

| Başlık | Değer |
|---|---|
| `Set-Cookie` | `PLATFORM-XSRF-TOKEN=<token>; Path=/; SameSite=Strict` (customer realm'inde `CUSTOMER-XSRF-TOKEN`). Üretimde `Secure` eklenir. HttpOnly değildir; istemci değeri `X-XSRF-TOKEN` başlığına koyar. |
| `Cache-Control` | `no-store` |

**Kurallar**

- Token en az 256 bit rastgele değerdir ve base64url ile kodlanır.
- Oturum varken token oturuma bağlanabilir (synchronizer token). Panel yalnız "çerez + başlık" kuralına uyar.

**Hatalar:** `404 NOT_FOUND` — `realm` tanımsız.

---

### `POST /api/v1/auth/{realm}/login`

| | |
|---|---|
| Kimlik | Oturum gerekmez · CSRF: evet · Origin: realm listesinde |
| Rate limit | Başarısız giriş: 15 dakikada 5 (realm + e-posta + IP) |
| Bilinmeyen alan | `422 VALIDATION_FAILED` / `UNKNOWN_FIELD` |

**İstek**

```json
{ "email": "sahip@platform.example.test", "password": "••••••••••••" }
```

| Alan | Kural |
|---|---|
| `email` | Zorunlu, geçerli e-posta. Kırpılır ve küçük harfe çevrilir. |
| `password` | Zorunlu, boş olamaz. Burada politika kontrolü yapılmaz. |

**Yanıt** — `200`. Oturum açılır; yanıt oturum çerezini ve yeni CSRF çerezini yazar.

```json
{ "status": "AUTHENTICATED", "user": { "id": "…", "email": "…", "displayName": "…", "locale": "tr" } }
```

`user` alanı `GET /me` yanıtındaki `user` ile aynıdır. `status` her başarılı girişte `AUTHENTICATED`'dır; alan geriye uyumluluk için korunur.

**Hatalar**

| HTTP | Kod | Ne zaman |
|---|---|---|
| 422 | `VALIDATION_FAILED` | `email` biçimi geçersiz veya `password` boş (`errors[].path`: `email`, `password`) |
| 401 | `INVALID_CREDENTIALS` | Hesap yok, şifre yanlış veya hesap aktif değil |
| 429 | `RATE_LIMITED` | Başarısız deneme sınırı aşıldı |
| 403 | `CSRF_TOKEN_INVALID` | CSRF veya Origin geçersiz |

**Yan etkiler**

- Başarısız denemede sayaç artar ve `auth.login_failed` yazılır.
- Başarılı denemede sayaç sıfırlanır ve `auth.login` yazılır.

---

### `POST /api/v1/auth/{realm}/logout`

| | |
|---|---|
| Kimlik | İsteğe bağlı · CSRF: evet |

- Geçerli oturum varsa iptal edilir (`revokedAt`) ve `auth.logout` yazılır.
- Oturum geçerli olsun olmasın yanıt `204` döner ve oturum çerezini silen başlığı taşır.

---

### `GET /api/v1/auth/{realm}/me`

| | |
|---|---|
| Kimlik | Oturum |

**Yanıt** — `200`

Platform realm'i:

```json
{
  "user": {
    "id": "uuid",
    "email": "sahip@platform.example.test",
    "displayName": "Platform Sahibi",
    "locale": "tr"
  },
  "permissions": ["platform.tenant.read", "platform.tenant.manage", "…"]
}
```

Platform kullanıcısında rol yoktur; her platform kullanıcısı bütün platform izinlerine sahiptir (ADR-056). Customer realm'i: yalnız `user` alanı döner; `permissions` yoktur. Müşteri izinleri site bağlamında `GET /customer/sites/{siteId}/bootstrap` ile alınır ([03-access-control.md](03-access-control.md)).

**Hatalar:** `401 UNAUTHENTICATED`. Panel bu durumu "oturum yok" olarak yorumlar ve giriş sayfasına yönlendirir.

---

### `GET /api/v1/auth/{realm}/sessions`

Kullanıcının bu realm'deki açık ve süresi dolmamış oturumlarını döner. Sıralama son etkinliğe göre yeniden eskiyedir.

```json
{
  "items": [
    {
      "id": "uuid",
      "current": true,
      "userAgent": "Mozilla/5.0 …",
      "createdAt": "…",
      "lastSeenAt": "…",
      "expiresAt": "…"
    }
  ]
}
```

- `expiresAt` = min(son etkinlik + boşta kalma süresi, oluşturma + mutlak süre).
- `userAgent` en fazla 300 karakterle saklanır. Panel bunu "Chrome · macOS" gibi kısa bir etikete çevirir.

### `DELETE /api/v1/auth/{realm}/sessions/{sessionId}`

- Yalnız kullanıcının kendi oturumu sonlandırılabilir; başka birinin oturumu `404` döner.
- Yanıt `204`'tür. Sonlandırılan oturum isteği yapan oturumsa, çerezi silen başlık da döner.
- `auth.session_revoked` yazılır.

---

### `POST /api/v1/auth/{realm}/forgot`

| | |
|---|---|
| Kimlik | Oturum gerekmez · CSRF: evet |
| Rate limit | 15 dakikada 3 (realm + e-posta) |

**İstek**

```json
{ "email": "kisi@ornek.com" }
```

**Yanıt** — `202 { "accepted": true }`. Hesap olsun olmasın aynı yanıt döner.

**Yan etkiler** (hesap varsa ve aktifse):

- Tek kullanımlık token üretilir; yalnız özeti saklanır.
- Token 30 dakika geçerlidir. Aynı kullanıcının önceki açık token'ı silinir.
- E-posta gönderilir: `password_reset` şablonu, bağlantı `{panel kökeni}/sifre-sifirla?token=…`. E-posta gövdesinde kişisel veri yoktur.
- `auth.password_reset_requested` yazılır.

**Hatalar:** `422` (e-posta biçimi) · `429 RATE_LIMITED`.

---

### `POST /api/v1/auth/{realm}/reset`

**İstek**

```json
{ "token": "…", "password": "Yeni-Guclu-Sifre-2026" }
```

**Yanıt** — `204`.

**Yan etkiler:**

- Şifre özeti güncellenir ve token tüketilir.
- Kullanıcının bu realm'deki **bütün oturumları** kapatılır.
- `auth.password_reset` yazılır.

**Hatalar** (`422 VALIDATION_FAILED`)

| `errors[].path` | `code` | Ne zaman |
|---|---|---|
| `token` | `TOKEN_INVALID` | Token tanınmıyor, kullanılmış, süresi dolmuş veya hesap aktif değil. Ayrım yapılmaz. |
| `password` | `TOO_SHORT` · `TOO_LONG` · `COMMON` · `CONTAINS_EMAIL` | Şifre politikası |

**Hesap kurulumu:** Platform yeni müşteri hesabı açtığında hesabın şifresi yoktur. Hesabın e-postasına bu uca giden bir bağlantı gider (`account_setup` şablonu, 7 gün geçerli; [02-tenancy.md](02-tenancy.md) "Müşteri hesabı"). Müşteri ilk şifresini bu uçla belirler. Şifresi olmayan hesapla giriş `401 INVALID_CREDENTIALS` döner.

**Panel davranışı:** Token adresten hemen silinir; tarayıcı geçmişinde ve `Referer` başlığında kalmaz. Token formdaki durumda tutulur.

---

### `POST /api/v1/auth/{realm}/password`

Oturumdaki kullanıcı şifresini değiştirir. Panelde "Hesap güvenliği → Şifre değiştir".

| | |
|---|---|
| Kimlik | Oturum · CSRF: evet |

**İstek**

```json
{ "currentPassword": "…", "newPassword": "Yeni-Guclu-Sifre-2026" }
```

**Yanıt** — `204`.

**Yan etkiler:**

- Şifre özeti güncellenir.
- Bu oturum açık kalır; kullanıcının bu realm'deki **diğer oturumları** kapatılır.
- `auth.password_changed` yazılır.

**Hatalar** (`422 VALIDATION_FAILED`, `429 RATE_LIMITED`)

| `errors[].path` | `code` | Ne zaman |
|---|---|---|
| `currentPassword` | `REQUIRED` · `INVALID_CREDENTIALS` | Boş · hatalı. Hatalı denemeler giriş sınırıyla aynı kuralla sayılır (15 dakikada 5) |
| `newPassword` | `REQUIRED` · `TOO_SHORT` · `TOO_LONG` · `COMMON` · `CONTAINS_EMAIL` · `SAME_AS_CURRENT` | Şifre politikası; mevcut şifreyle aynı |

---

## Değişiklik geçmişi

| Tarih | Değişiklik |
|---|---|
| 16 Kas 2026 | İlk sürüm: CSRF ucu (Aşama 0). |
| 16 Kas 2026 | Aşama 1: giriş, MFA (zorunlu kurulum dahil), kurtarma kodları, çıkış, `me`, oturumlar, şifre sıfırlama, davet önizleme ve kabul. |
| 18 Kas 2026 | İki adımlı doğrulama kaldırıldı (ürün sahibi kararı, ADR-055): `/mfa`, `/mfa/enroll`, `/mfa/verify`, `/mfa/recovery/regenerate` uçları, challenge, kurtarma kodları ve kullanıcı sunumundaki `mfaEnabled`/`mfaRequired` alanları yok. Giriş yalnız e-posta ve şifreyle. |
| 18 Kas 2026 | Sade yetki modeli (ADR-056): davet önizleme ve kabul uçları kaldırıldı; platform kullanıcı sunumundan `role`/`roleLabel` çıkarıldı; yeni müşteri hesabının ilk şifresi `reset` ucuyla belirlenir. |
| 18 Kas 2026 | Şifre değiştirme ucu `POST /auth/{realm}/password` eklendi (ADR-058). |
| 18 Kas 2026 | Şifre en az 15 karakter (backend ADR-0003). |
