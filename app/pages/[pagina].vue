<script setup lang="ts">
const route = useRoute()
const name = route.params.pagina as string

/*
 * Rota única das páginas institucionais. Não há whitelist de nomes aqui: a
 * lista de páginas é o próprio `content/paginas/`, e uma segunda cópia dela no
 * código só criaria divergência (página nova publicada dando 404). Endereço que
 * não existe na coleção cai no 404 logo abaixo.
 */
const { data: page } = await useAsyncData(`pagina-${name}`, () =>
  queryCollection('paginas').where('stem', '=', `paginas/${name}`).first(),
)

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: strings.errors.pageNotFound })
}

useSeoMeta({ title: page.value.title, description: page.value.description })
</script>

<template>
  <UContainer v-if="page" class="max-w-3xl py-8 sm:py-12">
    <ContentRenderer :value="page" class="prose-page" />
  </UContainer>
</template>

<style scoped>
/* Tipografia das páginas institucionais: herda o tema, com o display nos títulos */
.prose-page :deep(h1) {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: 600;
  color: var(--ui-text-highlighted);
}
.prose-page :deep(h2) {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--ui-text-highlighted);
  margin-top: calc(var(--spacing) * 8);
}
.prose-page :deep(p),
.prose-page :deep(li) {
  margin-top: calc(var(--spacing) * 3);
  line-height: 1.7;
}
.prose-page :deep(ul),
.prose-page :deep(ol) {
  list-style: disc;
  padding-left: calc(var(--spacing) * 5);
}
.prose-page :deep(ol) {
  list-style: decimal;
}
.prose-page :deep(a) {
  color: var(--ui-primary);
  text-decoration: underline;
}
.prose-page :deep(strong) {
  color: var(--ui-text-highlighted);
}
.prose-page :deep(code) {
  background: var(--ui-bg-elevated);
  padding: 0.125rem 0.375rem;
  border-radius: 0.375rem;
  font-family: var(--font-mono);
  font-size: 0.875em;
}
</style>
