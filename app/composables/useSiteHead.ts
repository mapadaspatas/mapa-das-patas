/**
 * Cabeçalho comum do site (idioma, título e favicon).
 *
 * Vive num composable porque `app/error.vue` substitui o `app.vue` inteiro
 * quando o Nuxt renderiza um erro: sem isto, a página de erro perderia o
 * `lang`, o sufixo do título e o ícone da aba, e as duas cópias divergiriam.
 */
export function useSiteHead() {
  const config = useRuntimeConfig()
  const umamiWebsiteId = config.public.umamiWebsiteId
  const umamiHostUrl = (config.public.umamiHostUrl || 'https://cloud.umami.is').replace(/\/+$/, '')

  useHead({
    htmlAttrs: { lang: 'pt-BR' },
    titleTemplate: (title) => (title ? `${title} · ${strings.siteName}` : strings.siteName),
    link: [
      // A pata-Brasil em tile na cor da marca, a mesma do cabeçalho (scripts/build-logo.ts)
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      // O iOS ignora SVG aqui: PNG de 180px gerado pelo mesmo script
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
    ],
    meta: [
      /*
       * Barra do navegador no mobile. Segue o fundo da página em cada tema (o
       * site respeita a preferência do sistema): uma cor de marca fixa deixaria
       * a barra âmbar sobre uma página branca em um dos dois temas.
       */
      { name: 'theme-color', content: '#ffffff', media: '(prefers-color-scheme: light)' },
      { name: 'theme-color', content: '#1c1917', media: '(prefers-color-scheme: dark)' },
    ],
    script: [
      ...(umamiWebsiteId
        ? [
            {
              src: `${umamiHostUrl}/script.js`,
              defer: true,
              'data-website-id': umamiWebsiteId,
            },
          ]
        : []),
    ],
  })
}
