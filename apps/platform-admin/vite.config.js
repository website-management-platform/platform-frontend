import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { APP_NAME, BREAKPOINTS, STORAGE_PREFIX } from './src/config/app.config.js'

const HTML_PLACEHOLDERS = {
  APP_NAME,
  STORAGE_PREFIX,
}

const SCSS_CONFIG_URL = 'app:config'

const appConfigScss = {
  canonicalize: (url) => (url === SCSS_CONFIG_URL ? new URL(SCSS_CONFIG_URL) : null),
  load: () => ({
    contents: Object.entries(BREAKPOINTS)
      .map(([name, value]) => `$breakpoint-${name}: ${value}px;`)
      .join('\n'),
    syntax: 'scss',
  }),
}

const APP_SRC = fileURLToPath(new URL('./src', import.meta.url))
const UI_SRC = fileURLToPath(new URL('../../packages/ui/src', import.meta.url))

// Fontlar packages/ui içindedir. Preload adresi CSS'in kullandığı adresle aynı olmalı:
// geliştirmede Vite kök dışı dosyayı /@fs/ ile sunar, derlemede göreli yol hash'li dosyaya çevrilir.
const uiFontsDir = (isDev) => (isDev ? `/@fs${UI_SRC}/assets/fonts` : '../../packages/ui/src/assets/fonts')

const appConfigHtml = () => ({
  name: 'app-config-html',
  transformIndexHtml: {
    order: 'pre',
    handler: (html, { server }) => Object.entries({ ...HTML_PLACEHOLDERS, UI_FONTS_DIR: uiFontsDir(Boolean(server)) }).reduce(
      (result, [key, value]) => result.replaceAll(`%${key}%`, value),
      html,
    ),
  },
})

// Ortak katman packages/ui içindedir; uygulamaya özel olan yalnız config ve features klasörleridir.
// Ortak kod "@/config/..." istediğinde çalışan uygulamanın kendi yapılandırması gelir.
const APP_OWNED_DIRS = /^@\/(config|features)(\/|$)/

// Geliştirmede /api ve /__dev (posta kutusu, demo hesaplar) yerel backend'e yönlendirilir.
const apiProxy = (target) => (target ? { '/api': { target }, '/__dev': { target } } : undefined)

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), appConfigHtml()],
  server: {
    port: 5300,
    strictPort: true,
    proxy: apiProxy(loadEnv(mode, process.cwd(), '').API_TARGET),
  },
  preview: {
    port: 5300,
    strictPort: true,
  },
  css: {
    preprocessorOptions: {
      scss: {
        importers: [appConfigScss],
      },
    },
  },
  resolve: {
    alias: [
      { find: APP_OWNED_DIRS, replacement: `${APP_SRC}/$1$2` },
      { find: /^@\//, replacement: `${UI_SRC}/` },
    ],
  },
}))
