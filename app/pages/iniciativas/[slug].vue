<script setup lang="ts">
import { donationTypeMetadata } from '~~/shared/schema/vocabulary'

const route = useRoute()
const slug = route.params.slug as string

const { data: initiative } = await useAsyncData(`iniciativa-${slug}`, () =>
  queryCollection('iniciativas').where('stem', '=', `iniciativas/${slug}`).first(),
)

if (!initiative.value) {
  throw createError({ statusCode: 404, statusMessage: strings.errors.initiativeNotFound })
}

const verification = computed(() => verificationOf(initiative.value?.verificado))

/**
 * "Toda chave publicada aqui aparece também no canal oficial" só faz sentido
 * quando existe alguma chave ou link publicado nesta página. Nas Iniciativas
 * que só têm `pix-na-fonte` — a maioria do diretório — a frase prometeria uma
 * conferência que não há o que conferir, então ela não entra.
 */
const hasPublishedDonation = computed(() =>
  (initiative.value?.doacoes ?? []).some(
    (donation) => donationTypeMetadata[donation.tipo]?.field !== 'none',
  ),
)

/**
 * Compartilhar precisa de URL absoluta, tanto no card das redes quanto no menu
 * do sistema. A base vem do runtimeConfig (NUXT_PUBLIC_SITE_URL no deploy).
 */
const siteUrl = useRuntimeConfig().public.siteUrl
const pageUrl = `${siteUrl}/iniciativas/${slug}`

useSeoMeta({
  title: initiative.value.nome,
  description: initiative.value.descricao,
  ogTitle: `${initiative.value.nome} · ${strings.siteName}`,
  ogDescription: initiative.value.descricao,
  ogSiteName: strings.siteName,
  ogType: 'website',
  ogUrl: pageUrl,
  // Só a foto que a própria Iniciativa enviou. Sem foto, nenhum og:image:
  // um placeholder genérico no card do WhatsApp engana mais do que ajuda.
  ogImage: initiative.value.imagem ? `${siteUrl}${initiative.value.imagem}` : undefined,
  // A imagem é quadrada (ver docs/adr/0003), então o card pequeno a mostra
  // inteira; o grande cortaria as laterais.
  twitterCard: 'summary',
})

const toast = useToast()
const analytics = useAnalytics()

/**
 * Web Share no mobile (abre WhatsApp, Telegram, Instagram e o resto do sistema)
 * e cópia do link como reserva onde a API não existe, como no desktop.
 */
async function share() {
  analytics.trackShare(slug)
  const payload = {
    title: initiative.value!.nome,
    text: strings.detail.shareText(initiative.value!.nome),
    url: pageUrl,
  }
  if (navigator.share) {
    // Cancelar o menu de compartilhar rejeita a promise: não é erro nosso
    await navigator.share(payload).catch(() => {})
    return
  }
  await navigator.clipboard.writeText(pageUrl)
  toast.add({ title: strings.detail.shareLinkCopied, color: 'success', icon: 'i-lucide-check' })
}
</script>

<template>
  <UContainer v-if="initiative" class="max-w-3xl py-8 sm:py-12">
    <NuxtLink to="/iniciativas" class="inline-flex items-center gap-1 text-sm text-muted hover:text-default">
      <UIcon name="i-lucide-arrow-left" class="size-4" />
      {{ strings.initiatives.viewAll }}
    </NuxtLink>

    <!-- Cabeçalho -->
    <div
      class="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6"
      :class="typeColorClass[initiative.tipo]"
    >
      <InitiativeAvatar :name="initiative.nome" :image="initiative.imagem" size="lg" />
      <div class="flex-1">
        <div class="flex flex-wrap items-center gap-3">
          <h1 class="font-display text-3xl font-bold text-highlighted sm:text-4xl">
            {{ initiative.nome }}
          </h1>
          <InitiativeVerifiedBadge v-if="verification" :date="verification.em" />
        </div>
        <p class="mt-2 font-mono text-sm text-muted">
          {{ initiative.cidade }}, <span class="font-bold text-default">{{ initiative.estado }}</span>
        </p>
        <!-- Mesma frase do verbete: Tipo e Espécie ditos por extenso, com a
             cor do Tipo na aba que abre a linha, e não em dois chips. -->
        <p class="verbete-kind mt-2 text-sm text-muted">
          {{ kindSentence(initiative.tipo, initiative.especies) }}
        </p>
      </div>
      <UButton
        class="self-start"
        color="neutral"
        variant="outline"
        size="sm"
        icon="i-lucide-share-2"
        @click="share"
      >
        {{ strings.detail.share }}
      </UButton>
    </div>

    <p class="mt-6 max-w-prose text-lg/relaxed">{{ initiative.descricao }}</p>

    <!--
      Como doar: a área de confiança da página. Ela se destaca pela borda verde
      e pelos botões, e não por inverter o fundo — a chave fica no mesmo plano
      do resto do conteúdo, que é onde a pessoa está lendo.
    -->
    <section class="mt-8 rounded-2xl border border-muted border-t-4 border-t-mato-600 bg-default p-5 sm:p-6 dark:border-t-mato-500">
      <h2 class="font-display text-xl font-bold text-highlighted">
        {{ strings.detail.howToDonate }}
      </h2>
      <p v-if="hasPublishedDonation" class="mt-1 flex items-start gap-1.5 text-sm text-muted">
        <UIcon name="i-lucide-shield-check" class="mt-0.5 size-4 shrink-0 text-secondary" />
        {{ strings.detail.sourceExplanation }}
      </p>

      <div v-if="initiative.doacoes?.length" class="mt-4 space-y-3">
        <InitiativeDonationItem
          v-for="(donation, index) in initiative.doacoes"
          :key="index"
          :slug="slug"
          :donation="donation"
          :name="initiative.nome"
          :city="initiative.cidade"
        />
      </div>
      <p v-else class="mt-4 text-sm text-muted">{{ strings.detail.noDonations }}</p>

      <!-- Lembrete: doar não é só PIX, e o combinado acontece no canal oficial -->
      <div class="mt-4 flex items-start gap-2 border-t border-muted pt-4">
        <UIcon name="i-lucide-package" class="mt-0.5 size-4 shrink-0 text-dimmed" />
        <p class="text-sm text-muted">
          <span class="font-semibold text-highlighted">{{ strings.detail.inKindTitle }}:</span>
          {{ strings.detail.inKind }}
        </p>
      </div>
    </section>

    <!-- Necessidades -->
    <section v-if="initiative.necessidades?.length" class="mt-8">
      <h2 class="font-display text-xl font-bold text-highlighted">
        {{ strings.detail.needs }}
      </h2>
      <div class="mt-3 flex flex-wrap gap-2">
        <UBadge
          v-for="item in initiative.necessidades"
          :key="item"
          color="secondary"
          variant="soft"
          size="lg"
        >
          {{ needLabels[item] }}
        </UBadge>
      </div>
    </section>

    <!-- Redes -->
    <section v-if="initiative.redes" class="mt-8 mb-4">
      <h2 class="font-display text-xl font-bold text-highlighted">
        {{ strings.detail.social }}
      </h2>
      <div class="mt-3">
        <InitiativeSocialLinks :slug="slug" :social="initiative.redes" />
      </div>
    </section>

    <!-- Correção comunitária -->
    <div class="mt-10 border-t border-muted pt-6">
      <UButton
        :to="`/editar/${slug}`"
        color="neutral"
        variant="outline"
        size="sm"
        icon="i-lucide-pencil"
      >
        {{ strings.detail.suggestCorrection }}
      </UButton>
    </div>
  </UContainer>
</template>

<style scoped>
/* A aba do Tipo, do mesmo tamanho e no mesmo lugar que no verbete da listagem. */
.verbete-kind::before {
  content: '';
  display: inline-block;
  width: 1.25rem;
  height: 3px;
  margin-right: 0.5rem;
  vertical-align: 0.22em;
  background: var(--tipo);
}
</style>
