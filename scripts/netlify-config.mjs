// Netlify yayın dosyaları (backend ADR-0014): derlenmiş panelin yanına _redirects ve _headers yazar.
// - /api/* isteği aynı kökenden backend'e vekillenir: oturum çerezi birinci taraf kalır (SameSite=Lax), CORS gerekmez.
// - Tek sayfalık uygulama: bilinmeyen yol index.html'e düşer (yenilemede 404 olmaz).
// - Güvenlik başlıkları: satır içi tema betiğine yalnız SHA-256 özetiyle izin veren CSP.
// Kullanım: API_ORIGIN=https://api.ornek.com STORAGE_ORIGIN=https://<hesap>.r2.cloudflarestorage.com node scripts/netlify-config.mjs apps/customer-admin/dist
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const fail = (message) => {
  process.stderr.write(`netlify-config: ${message}\n`);
  process.exit(1);
};

const origin = (name, value) => {
  if (!value) fail(`${name} gerekli`);
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(`${name} geçerli bir adres değil: ${value}`);
  }
  if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash) fail(`${name} yol içermeyen bir https kökeni olmalı (ör. https://api.ornek.com)`);
  return url.origin;
};

const [dist] = process.argv.slice(2);
if (!dist) fail("derleme klasörü gerekli (ör. apps/customer-admin/dist)");
const api = origin("API_ORIGIN", process.env.API_ORIGIN);
// Medya önizlemeleri ve doğrudan yükleme nesne deposunun imzalı adreslerine gider (07-media.md).
const storage = origin("STORAGE_ORIGIN", process.env.STORAGE_ORIGIN);

const html = readFileSync(join(dist, "index.html"), "utf8");
const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
const hashes = inline.map((code) => `'sha256-${createHash("sha256").update(code, "utf8").digest("base64")}'`);

const csp = [
  "default-src 'self'",
  `script-src 'self' ${hashes.join(" ")}`.trim(),
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${storage}`,
  `media-src 'self' blob: ${storage}`,
  `connect-src 'self' ${storage}`,
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

writeFileSync(join(dist, "_redirects"), `/api/*  ${api}/api/:splat  200!\n/*  /index.html  200\n`);
writeFileSync(join(dist, "_headers"), `/*
  Content-Security-Policy: ${csp}
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
/index.html
  Cache-Control: no-cache
/assets/*
  Cache-Control: public, max-age=31536000, immutable
`);
process.stdout.write(`netlify-config: ${dist} → _redirects, _headers (${hashes.length} satır içi betik özeti)\n`);
