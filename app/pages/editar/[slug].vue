<script setup lang="ts">
/*
 * Correção de Iniciativa existente. O slug vive no caminho, e não na query,
 * porque é ele que discrimina a página: a key padrão do Nuxt interpola os
 * params da rota e ignora a query, então com `?editar=` o Vue Router
 * reaproveitava a mesma instância entre duas Iniciativas e entre correção e
 * cadastro novo — o formulário abria com os dados da Iniciativa anterior.
 */
const t = strings.register

const slug = useRoute().params.slug as string

const { data: initiative } = await useAsyncData(`editar-${slug}`, () =>
  queryCollection('iniciativas').where('stem', '=', `iniciativas/${slug}`).first(),
)

/*
 * Slug que não existe é 404 aqui, antes do formulário. Sem isto a tela abre
 * vazia com o título "Sugerir correção" e a pessoa só descobre o problema no
 * envio, quando o servidor recusa o `existingSlug` desconhecido, com tudo já
 * preenchido.
 */
if (!initiative.value) {
  throw createError({ statusCode: 404, statusMessage: strings.errors.initiativeNotFound })
}

/*
 * Uma página de correção por Iniciativa é HTML pré-renderizado de verdade, e
 * não tem nada que fazer num resultado de busca: quem chega aqui vem da página
 * da Iniciativa. Indexada, ela competiria com a própria página que edita.
 */
useSeoMeta({
  title: t.correctionTitle,
  description: t.subtitle,
  robots: 'noindex, follow',
})
</script>

<template>
  <InitiativeRegistrationForm :existing="{ slug, data: initiative! }" />
</template>
