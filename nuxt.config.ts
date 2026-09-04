import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/*
 * A /confirmar/<slug> não é linkada de lugar nenhum no site: o link só existe
 * na mensagem que o Moderador manda, com o token na query. Sem estas rotas o
 * crawler do `nuxt generate` nunca chegaria nela e o endereço voltaria 404 em
 * produção — a página some justamente para quem recebeu o link.
 */
const confirmationRoutes = readdirSync(fileURLToPath(new URL('content/iniciativas', import.meta.url)))
  .filter((file) => file.endsWith('.yml'))
  .map((file) => `/confirmar/${file.replace(/\.yml$/, '')}`)

export default defineNuxtConfig({
  compatibilityDate: '2026-08-17',
  nitro: {
    prerender: { routes: confirmationRoutes },
  },
  modules: ['@nuxt/ui', '@nuxt/content', '@nuxtjs/turnstile'],
  turnstile: {
    // Chave pública de TESTE do Cloudflare (sempre passa). A de produção
    // vem por NUXT_PUBLIC_TURNSTILE_SITE_KEY no ambiente do deploy
    siteKey: '1x00000000000000000000AA',
  },
  runtimeConfig: {
    public: {
      /*
       * Base absoluta do site, usada por og:image e pelo botão de compartilhar
       * (card de rede social não aceita caminho relativo). O deploy sobrescreve
       * com NUXT_PUBLIC_SITE_URL, inclusive nas previews do Cloudflare Pages.
       */
      siteUrl: 'https://mapadaspatas.pages.dev',
      umamiWebsiteId: '',
      umamiHostUrl: 'https://cloud.umami.is',
      umamiPublicUrl: '',
    },
  },
  css: ['~/assets/css/main.css'],
  fonts: {
    /*
     * As duas famílias são variáveis. A Bricolage Grotesque é usada com o eixo
     * de largura (wdth) nos nomes longos das Iniciativas, então é o arquivo
     * variável que precisa chegar ao navegador, não instâncias estáticas.
     */
    families: [
      { name: 'Bricolage Grotesque', provider: 'google', weights: ['400 800'] },
      { name: 'Instrument Sans', provider: 'google', weights: ['400 700'] },
    ],
  },
  /*
   * O tema claro é o padrão em que o site foi desenhado, então é ele que abre
   * na primeira visita — inclusive para quem está com o sistema no escuro. O
   * escuro continua existindo e fica a um clique no cabeçalho; a escolha vale
   * a partir daí (o @nuxtjs/color-mode guarda em localStorage).
   */
  colorMode: {
    preference: 'light',
    fallback: 'light',
  },
  devtools: { enabled: true },
  icon: {
    // Site estático: todos os ícones ficam no client bundle e o SSR os inline,
    // sem nenhuma dependência da API externa do Iconify em runtime.
    serverBundle: false,
    clientBundle: {
      scan: true,
      icons: [
        'lucide:paw-print',
        'lucide:sun',
        'lucide:moon',
        'lucide:arrow-left',
        'lucide:shield-check',
        'lucide:copy',
        'lucide:qr-code',
        'lucide:x',
        'lucide:check',
        'lucide:external-link',
        'lucide:globe',
        'lucide:link',
        'lucide:badge-check',
        'lucide:search',
        'lucide:history',
        'lucide:heart-handshake',
        'lucide:arrow-right',
        'lucide:trash-2',
        'lucide:plus',
        'lucide:circle-alert',
        'lucide:send',
        'lucide:pencil',
        'lucide:image-plus',
        'lucide:package',
        'lucide:share-2',
        'lucide:mail',
        'simple-icons:github',
        'simple-icons:instagram',
        'simple-icons:facebook',
        'simple-icons:tiktok',
        'simple-icons:youtube',
        'simple-icons:x',
        'simple-icons:whatsapp',
      ],
    },
  },
  content: {
    // Usa o SQLite nativo do Node (>=22.5), sem dependência binária de better-sqlite3
    experimental: { nativeSqlite: true },
    // dev e build gravam o mesmo SQLite local, e o build dropa todas as tabelas
    // `_content_%` antes de recriá-las. Separar os arquivos evita que um
    // `pnpm generate` derrube as tabelas do dev server que está rodando.
    _localDatabase: {
      type: 'sqlite',
      filename: `.data/content/contents-${process.env.NODE_ENV === 'production' ? 'build' : 'dev'}.sqlite`,
    },
  },
})
