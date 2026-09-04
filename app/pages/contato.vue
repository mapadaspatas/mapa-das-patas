<script setup lang="ts">
/*
 * Página de contato. Ela **roteia** em vez de atender: cada situação aponta
 * para o caminho mais curto dela, e o e-mail fica para os dois casos que
 * precisam mesmo de canal privado (pedido de titular e Selo Verificado).
 *
 * Sem formulário, de propósito. Um formulário aqui seria a primeira coleta de
 * dado pessoal do site — que hoje não pede contato de ninguém — e o único
 * destino gratuito que o projeto tem (GitHub) tornaria público justamente o
 * pedido que não pode ser público, o de remoção.
 *
 * É página Vue, e não markdown em `content/paginas/` como /sobre e
 * /privacidade, porque o conteúdo aqui é afordância de canal (links, ícones,
 * endereços que vêm de `strings`), não prosa. A rota estática tem precedência
 * sobre o catch-all `[pagina].vue`, então as duas convivem sem conflito.
 */
const t = strings.contact

useSeoMeta({
  title: t.title,
  description: t.subtitle,
})

const channels = [
  { icon: 'i-lucide-mail', label: t.emailLabel, value: t.email, href: `mailto:${t.email}`, external: false },
  { icon: 'i-simple-icons-instagram', label: t.instagramLabel, value: t.instagramHandle, href: t.instagramUrl, external: true },
  { icon: 'i-simple-icons-github', label: t.githubLabel, value: t.githubRepo, href: t.githubUrl, external: true },
]
</script>

<template>
  <UContainer class="max-w-3xl py-8 sm:py-12">
    <h1 class="font-display text-3xl font-semibold text-highlighted">{{ t.title }}</h1>
    <p class="mt-4 max-w-[52ch] text-lg/relaxed text-muted">{{ t.subtitle }}</p>

    <div class="mt-10 space-y-9">
      <!-- Correção primeiro: é a única que não depende de ninguém ler e-mail -->
      <section>
        <h2 class="font-display text-xl font-semibold text-highlighted">{{ t.correction.title }}</h2>
        <p class="mt-2 leading-relaxed text-muted">{{ t.correction.text }}</p>
        <UButton
          to="/iniciativas"
          color="neutral"
          variant="subtle"
          trailing-icon="i-lucide-arrow-right"
          class="mt-3.5"
        >
          {{ t.correction.action }}
        </UButton>
      </section>

      <!--
        Pedido de titular: o único bloco com prazo, porque é o único com relógio
        legal correndo (art. 18 da LGPD). O prazo dito aqui tem de bater com o
        que a /privacidade já publica.
      -->
      <section class="rounded-2xl border border-muted bg-elevated/40 p-5 sm:p-6">
        <h2 class="font-display text-xl font-semibold text-highlighted">{{ t.owner.title }}</h2>
        <p class="mt-2 leading-relaxed text-muted">{{ t.owner.text }}</p>
        <p class="mt-3 font-mono text-xs text-secondary">{{ t.owner.deadline }}</p>
        <div class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
          <UButton :to="`mailto:${t.email}`" color="primary" icon="i-lucide-mail">
            {{ t.email }}
          </UButton>
          <NuxtLink to="/privacidade" class="text-sm text-primary underline underline-offset-3">
            {{ t.owner.privacyLink }}
          </NuxtLink>
        </div>
      </section>

      <section>
        <h2 class="font-display text-xl font-semibold text-highlighted">{{ t.verified.title }}</h2>
        <p class="mt-2 leading-relaxed text-muted">{{ t.verified.text }}</p>
      </section>

      <section>
        <h2 class="font-display text-xl font-semibold text-highlighted">{{ t.code.title }}</h2>
        <p class="mt-2 leading-relaxed text-muted">{{ t.code.text }}</p>
        <UButton
          :to="t.githubIssuesUrl"
          target="_blank"
          rel="noopener"
          color="neutral"
          variant="subtle"
          trailing-icon="i-lucide-external-link"
          class="mt-3.5"
        >
          {{ t.code.action }}
        </UButton>
      </section>
    </div>

    <section class="mt-11 border-t border-muted pt-7">
      <h2 class="font-mono text-[10.5px] font-bold tracking-[0.13em] text-secondary uppercase">
        {{ t.channelsTitle }}
      </h2>
      <ul class="mt-4 space-y-3">
        <li v-for="channel in channels" :key="channel.label" class="flex items-center gap-3">
          <UIcon :name="channel.icon" class="size-4 shrink-0 text-muted" />
          <a
            :href="channel.href"
            :target="channel.external ? '_blank' : undefined"
            :rel="channel.external ? 'noopener' : undefined"
            class="font-mono text-sm text-default hover:text-primary"
          >
            {{ channel.value }}
          </a>
        </li>
      </ul>
      <p class="mt-6 max-w-[58ch] text-sm/relaxed text-dimmed">{{ t.dataNote }}</p>
    </section>
  </UContainer>
</template>
