<script setup lang="ts">
import { ufShapes } from '~/utils/uf-map'

useSeoMeta({ description: strings.home.subtitle })

const { data: initiatives } = await useAsyncData('iniciativas-home', () =>
  queryCollection('iniciativas')
    .select('stem', 'nome', 'estado', 'cidade', 'tipo', 'especies', 'imagem', 'verificado', 'doacoes')
    .all(),
)

const all = computed(() => initiatives.value ?? [])

const search = ref('')

function submitSearch() {
  navigateTo({ path: '/iniciativas', query: search.value ? { q: search.value } : {} })
}

/** Clicar num estado do mapa é o mesmo que chegar na listagem já filtrada. */
function openState(uf: string) {
  navigateTo({ path: '/iniciativas', query: { estado: uf } })
}

const countsByState = computed(() => {
  const counts: Record<string, number> = {}
  for (const initiative of all.value) {
    counts[initiative.estado] = (counts[initiative.estado] ?? 0) + 1
  }
  return counts
})

const cityCount = computed(() => new Set(all.value.map((i) => i.cidade)).size)

/**
 * Estados sem nenhuma Iniciativa. São o pedido da home, não uma lacuna
 * escondida: o mapa mostra o buraco e o texto convida a preenchê-lo.
 */
const emptyStates = computed(() =>
  Object.keys(ufShapes)
    .filter((uf) => !countsByState.value[uf])
    .map((uf) => ufShapes[uf as keyof typeof ufShapes].nome),
)

/** Três exemplos bastam para a frase soar concreta sem virar lista. */
const emptyExamples = computed(() => {
  const [a, b, c] = emptyStates.value
  if (!a) return ''
  if (!b) return `no ${a}`
  if (!c) return `em ${a} ou ${b}`
  return `em ${a}, ${b} ou ${c}`
})

const hasVerified = computed(() =>
  all.value.some((i) => verificationOf(i.verificado)),
)

// Verificadas primeiro; completa com as demais em ordem alfabética
const featured = computed(() =>
  [...all.value]
    .sort((a, b) => {
      const av = verificationOf(a.verificado) ? 0 : 1
      const bv = verificationOf(b.verificado) ? 0 : 1
      return av - bv || a.nome.localeCompare(b.nome, 'pt-BR')
    })
    .slice(0, 6),
)

/** O fim do título recebe a cor da marca; o resto fica em tinta. */
const title = computed(() => {
  const index = strings.home.title.lastIndexOf(strings.home.titleAccent)
  return index < 0
    ? { lead: strings.home.title, accent: '' }
    : { lead: strings.home.title.slice(0, index), accent: strings.home.titleAccent }
})

const pillars = [
  strings.home.trust.source,
  strings.home.trust.history,
  strings.home.trust.moderation,
]
</script>

<template>
  <div>
    <!-- Herói: a tese, a busca e o mapa do que já existe, tudo na dobra -->
    <section class="border-b border-muted">
      <UContainer class="grid gap-11 py-12 lg:grid-cols-[1fr_26rem] lg:gap-16 lg:py-14">
        <div>
          <h1 class="max-w-[12ch] font-display text-4xl/[1.03] font-bold text-highlighted sm:text-6xl/[1.02]">
            {{ title.lead }}<span class="text-primary">{{ title.accent }}</span>
          </h1>
          <p class="mt-5 max-w-[44ch] text-lg text-muted">{{ strings.home.subtitle }}</p>

          <form class="mt-7 flex max-w-lg gap-2" @submit.prevent="submitSearch">
            <UInput
              v-model="search"
              icon="i-lucide-search"
              size="xl"
              :placeholder="strings.list.searchPlaceholder"
              class="flex-1"
            />
            <UButton type="submit" size="xl" color="primary" class="cursor-pointer">
              {{ strings.home.searchButton }}
            </UButton>
          </form>

          <ul class="mt-9 grid gap-5 border-t border-muted pt-7 sm:grid-cols-3">
            <li v-for="pillar in pillars" :key="pillar.title">
              <p class="font-mono text-[10.5px] font-bold tracking-[0.13em] text-secondary uppercase">
                {{ pillar.title }}
              </p>
              <p class="mt-1.5 text-sm/relaxed text-muted">{{ pillar.text }}</p>
            </li>
          </ul>
        </div>

        <div class="rounded-2xl border border-muted bg-elevated/40 p-5">
          <div class="mb-3 flex items-baseline justify-between gap-3">
            <h2 class="font-display text-base font-bold text-highlighted">{{ strings.map.title }}</h2>
            <span class="font-mono text-xs text-muted">
              {{ strings.map.coverage(all.length, cityCount) }}
            </span>
          </div>

          <UfMap :counts="countsByState" @select="openState" />

          <p v-if="emptyStates.length" class="mt-4 border-t border-muted pt-3.5 text-sm/relaxed text-muted">
            <span class="font-semibold text-highlighted">{{ strings.map.gaps(emptyStates.length) }}</span>
            {{ strings.map.gapsHint(emptyExamples) }}
            <NuxtLink to="/cadastrar" class="text-primary underline underline-offset-3">
              {{ strings.home.ctaButton }}
            </NuxtLink>
          </p>
        </div>
      </UContainer>
    </section>

    <!-- Destaques -->
    <section>
      <UContainer class="py-11 sm:py-14">
        <div class="flex flex-wrap items-baseline justify-between gap-3">
          <h2 class="font-display text-2xl font-bold text-highlighted">
            {{ strings.home.featuredTitle }}
          </h2>
          <UButton to="/iniciativas" color="neutral" variant="link" trailing-icon="i-lucide-arrow-right" class="px-0">
            {{ strings.initiatives.viewAll }}
          </UButton>
        </div>
        <p v-if="!hasVerified" class="mt-1 max-w-2xl text-sm text-muted">
          {{ strings.home.featuredNoneVerified }}
        </p>
        <div class="mt-8 grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          <InitiativeCard v-for="item in featured" :key="item.stem" :initiative="item" />
        </div>
      </UContainer>
    </section>

    <!-- CTA de cadastro -->
    <section class="border-t border-muted bg-secondary/5">
      <UContainer class="flex flex-col items-start gap-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:py-14">
        <div>
          <h2 class="font-display text-2xl font-bold text-highlighted">
            {{ strings.home.ctaTitle }}
          </h2>
          <p class="mt-1 text-muted">{{ strings.home.ctaText }}</p>
        </div>
        <UButton to="/cadastrar" size="xl" color="secondary" icon="i-lucide-heart-handshake">
          {{ strings.home.ctaButton }}
        </UButton>
      </UContainer>
    </section>
  </div>
</template>
