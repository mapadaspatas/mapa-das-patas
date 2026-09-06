<script setup lang="ts">
import { initiativeTypes, needs as needValues, species as speciesValues } from '~~/shared/schema/vocabulary'
import type { Filters } from '~/utils/filter'
import { ufShapes } from '~/utils/uf-map'

useSeoMeta({ title: strings.initiatives.title, description: strings.list.description })

const { data: initiatives } = await useAsyncData('iniciativas-listagem', () =>
  queryCollection('iniciativas')
    .select('stem', 'nome', 'estado', 'cidade', 'tipo', 'especies', 'necessidades', 'imagem', 'verificado', 'doacoes', 'redes')
    .all(),
)

const route = useRoute()
const router = useRouter()

/**
 * Estado dos filtros em um objeto só, na mesma forma que `filterInitiatives`
 * consome: filtro desligado é string vazia, que a função já trata como ausente.
 */
type FilterState = Required<Filters>

/** Os nomes dos parâmetros na URL são pt-BR, como as rotas. */
const queryKeys = {
  search: 'q',
  state: 'estado',
  city: 'cidade',
  type: 'tipo',
  species: 'especie',
  need: 'necessidade',
} as const satisfies Record<keyof FilterState, string>

function queryValue(key: string): string {
  const value = route.query[key]
  return typeof value === 'string' ? value : ''
}

const filters = reactive<FilterState>({
  search: queryValue(queryKeys.search),
  state: queryValue(queryKeys.state),
  city: queryValue(queryKeys.city),
  type: queryValue(queryKeys.type),
  species: queryValue(queryKeys.species),
  need: queryValue(queryKeys.need),
})

const analytics = useAnalytics()

/*
 * Os filtros mudam a cada tecla, e um evento por tecla não diz nada: esperamos
 * a pessoa parar de digitar. O timer precisa morrer com a página, senão quem
 * sai da lista logo depois de filtrar tem o evento registrado na URL seguinte.
 */
let searchTimeout: ReturnType<typeof setTimeout> | null = null
onScopeDispose(() => {
  if (searchTimeout) clearTimeout(searchTimeout)
})

// Trocar de estado invalida a cidade selecionada
watch(() => filters.state, () => (filters.city = ''))

watch(filters, () => {
  router.replace({
    query: Object.fromEntries(
      Object.entries(queryKeys)
        .map(([field, key]) => [key, filters[field as keyof FilterState]])
        .filter(([, value]) => value),
    ),
  })

  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    analytics.trackSearch({
      search: filters.search,
      state: filters.state,
      city: filters.city,
      type: filters.type,
      species: filters.species,
      need: filters.need,
    })
  }, 600)
})

const all = computed(() => initiatives.value ?? [])

const results = computed(() => filterInitiatives(all.value, filters))

/** Contagem do mapa: o diretório inteiro, não o resultado filtrado. Ele é o
 * controle de navegação, então precisa mostrar para onde ainda dá ir. */
const countsByState = computed(() => {
  const counts: Record<string, number> = {}
  for (const initiative of all.value) {
    counts[initiative.estado] = (counts[initiative.estado] ?? 0) + 1
  }
  return counts
})

/** Nome do estado por extenso; UF que não conhecemos volta como veio da URL. */
function stateName(uf: string) {
  return ufShapes[uf as keyof typeof ufShapes]?.nome ?? uf
}

/**
 * Resultados em blocos por estado, dos maiores para os menores. A ordem é a
 * concentração real do diretório (São Paulo tem quase metade), e quem procura
 * um estado específico chega nele pelo mapa ou pelo filtro, não rolando.
 */
const groups = computed(() => {
  const byState = new Map<string, typeof results.value>()
  for (const initiative of results.value) {
    const bucket = byState.get(initiative.estado)
    if (bucket) bucket.push(initiative)
    else byState.set(initiative.estado, [initiative])
  }
  return [...byState.entries()]
    .map(([uf, items]) => ({
      uf,
      nome: stateName(uf),
      items: [...items].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    }))
    .sort((a, b) => b.items.length - a.items.length || a.nome.localeCompare(b.nome, 'pt-BR'))
})

/**
 * O USelect (Reka UI) lança erro em item com valor '': ele reserva a string vazia
 * para "sem seleção". Então a opção "Todos/Todas" usa um valor sentinela, traduzido
 * de volta para '' (= filtro desligado) no v-model de cada select.
 */
const ALL = '__todos'

function withAll(label: string, items: { label: string, value: string }[]) {
  return [{ label, value: ALL }, ...items]
}

function selection(field: keyof FilterState) {
  return computed({
    get: () => filters[field] || ALL,
    set: (value: string) => (filters[field] = value === ALL ? '' : value),
  })
}

const stateSelection = selection('state')
const citySelection = selection('city')
const typeSelection = selection('type')
const speciesSelection = selection('species')
const needSelection = selection('need')

const stateOptions = computed(() =>
  withAll(strings.list.allMasculine, [...new Set(all.value.map((i) => i.estado))]
    .sort()
    .map((uf) => ({ label: uf, value: uf }))),
)
const cityOptions = computed(() =>
  withAll(strings.list.allFeminine, citiesOfState(all.value, filters.state)
    .map((name) => ({ label: name, value: name }))),
)
const typeOptions = withAll(strings.list.allMasculine, initiativeTypes
  .map((value) => ({ label: typeLabels[value], value })))
const speciesOptions = withAll(strings.list.allFeminine, speciesValues
  .map((value) => ({ label: speciesLabels[value], value })))
const needOptions = withAll(strings.list.allFeminine, needValues
  .map((value) => ({ label: needLabels[value], value })))

/**
 * O nome de cada critério, num lugar só: ele rotula o select e volta a aparecer
 * no chip do filtro em vigor. Em duas listas paralelas, o primeiro critério
 * novo sairia de sincronia entre as duas sem nada quebrar.
 */
const filterLabels: Record<keyof FilterState, string> = {
  search: strings.list.searchFilter,
  state: strings.list.stateFilter,
  city: strings.list.cityFilter,
  type: strings.list.typeFilter,
  species: strings.list.speciesFilter,
  need: strings.list.needFilter,
}

/** Um lugar só para desenhar os cinco selects, cada um com rótulo visível. */
const selects = computed(() => [
  { key: 'estado', label: filterLabels.state, model: stateSelection, items: stateOptions.value, disabled: false },
  { key: 'cidade', label: filterLabels.city, model: citySelection, items: cityOptions.value, disabled: !filters.state },
  { key: 'tipo', label: filterLabels.type, model: typeSelection, items: typeOptions, disabled: false },
  { key: 'especie', label: filterLabels.species, model: speciesSelection, items: speciesOptions, disabled: false },
  { key: 'necessidade', label: filterLabels.need, model: needSelection, items: needOptions, disabled: false },
])

const hasFilters = computed(() => Object.values(filters).some(Boolean))

function clearFilters() {
  for (const field of Object.keys(filters) as (keyof FilterState)[]) filters[field] = ''
}

/**
 * Um chip por filtro em vigor, cada um removível sozinho. Com Estado, Espécie
 * e Tipo aplicados ao mesmo tempo, a única saída era "Limpar filtros", que
 * apaga tudo: quem queria alargar a busca em um critério tinha que recomeçar
 * pelos cinco.
 *
 * O valor sai traduzido, nunca como o valor canônico do schema
 * (`abrigo-santuario`, `lar-temporario`), que não é escrito para ser lido.
 * Estado sai por extenso, e não pela sigla que o select mostra, para casar com
 * o controle do mapa, que também diz "Paraná" com o filtro em vigor.
 */
const activeChips = computed(() => {
  const valueLabel: Record<keyof FilterState, (value: string) => string> = {
    search: (value) => value,
    state: stateName,
    city: (value) => value,
    type: (value) => typeLabels[value as keyof typeof typeLabels] ?? value,
    species: (value) => speciesLabels[value as keyof typeof speciesLabels] ?? value,
    need: (value) => needLabels[value as keyof typeof needLabels] ?? value,
  }
  // A ordem dos chips é a de `filterLabels`: busca primeiro, depois os cinco
  // selects na ordem em que aparecem na coluna de controles.
  return (Object.keys(filterLabels) as (keyof FilterState)[])
    .filter((field) => filters[field])
    .map((field) => ({
      field,
      criterion: filterLabels[field],
      value: valueLabel[field](filters[field]),
    }))
})

/**
 * O mapa é o primeiro bloco da coluna de controles e ocupa 368px: no celular
 * ele empurrava a busca para 597px e o primeiro card para 944px, uma tela e
 * meia abaixo, e quem abria a listagem não via nem onde buscar. Abaixo de `lg`
 * ele começa recolhido atrás deste controle; de `lg` para cima a coluna é fixa
 * ao lado dos resultados, o mapa não atrapalha ninguém e continua sempre
 * aberto, por classe do Tailwind e não por medida de tela em JavaScript (o
 * site é gerado estático: uma media query em JS mudaria a tela na hidratação).
 */
const mapOpen = ref(false)

const mapToggleLabel = computed(() => {
  if (mapOpen.value) return strings.map.hideMap
  if (!filters.state) return strings.map.showMap
  /* Com o mapa recolhido, ele é o único lugar onde o estado escolhido aparece
   * desenhado. O controle repete qual é, para o recolhimento não esconder um
   * filtro em vigor de quem só olha o topo da página. */
  return strings.map.showMapFiltered(stateName(filters.state))
})

/** Clicar de novo no estado já filtrado desliga o filtro. */
function toggleState(uf: string) {
  const selecting = filters.state !== uf
  filters.state = selecting ? uf : ''
  /* Escolheu um estado: o mapa cumpriu o papel e sai da frente dos resultados,
   * que é o que a pessoa foi ver. Ao desligar o filtro pelo próprio mapa ele
   * fica aberto, porque quem faz isso costuma estar trocando de estado. */
  if (selecting) mapOpen.value = false
}
</script>

<template>
  <UContainer class="py-8 sm:py-11">
    <h1 class="font-display text-3xl font-bold text-highlighted">
      {{ strings.initiatives.title }}
    </h1>
    <p class="mt-1 text-muted">{{ strings.list.description }}</p>

    <!--
      Abaixo de lg as duas colunas viram uma pilha, e o vão entre elas é altura
      que empurra o primeiro resultado para fora da tela: aqui ele é menor que
      o vão lateral do desktop, onde ele não custa nada.
    -->
    <div class="mt-7 grid gap-6 lg:grid-cols-[17rem_1fr] lg:gap-10">
      <!-- Controles: mapa e filtros, cada um com rótulo à vista -->
      <div class="lg:sticky lg:top-6 lg:self-start">
        <UButton
          class="w-full justify-center lg:hidden"
          color="neutral"
          variant="outline"
          size="sm"
          :icon="mapOpen ? 'i-lucide-chevron-up' : 'i-lucide-map'"
          :aria-expanded="mapOpen"
          aria-controls="mapa-da-listagem"
          @click="mapOpen = !mapOpen"
        >
          {{ mapToggleLabel }}
        </UButton>

        <div
          id="mapa-da-listagem"
          class="rounded-2xl border border-muted bg-elevated/40 p-4 max-lg:mt-3"
          :class="{ 'max-lg:hidden': !mapOpen }"
        >
          <UfMap :counts="countsByState" :selected="filters.state" @select="toggleState" />
          <UButton
            v-if="filters.state"
            class="mt-2 w-full justify-center"
            color="neutral"
            variant="soft"
            size="xs"
            icon="i-lucide-x"
            @click="filters.state = ''"
          >
            {{ strings.map.clearState }}
          </UButton>
        </div>

        <UInput
          v-model="filters.search"
          icon="i-lucide-search"
          size="lg"
          class="mt-3 w-full lg:mt-4"
          :placeholder="strings.list.searchPlaceholder"
          :aria-label="strings.list.searchPlaceholder"
        />

        <div class="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-1">
          <div v-for="select in selects" :key="select.key">
            <label
              :for="`filtro-${select.key}`"
              class="mb-1 block font-mono text-[10.5px] font-bold tracking-[0.12em] text-muted uppercase"
            >
              {{ select.label }}
            </label>
            <USelect
              :id="`filtro-${select.key}`"
              v-model="select.model.value"
              :items="select.items"
              :disabled="select.disabled"
              class="w-full"
            />
          </div>
        </div>

        <UButton
          v-if="hasFilters"
          class="mt-4 w-full justify-center"
          color="neutral"
          variant="outline"
          size="sm"
          @click="clearFilters"
        >
          {{ strings.list.clearFilters }}
        </UButton>
      </div>

      <!-- Resultados -->
      <div>
        <!--
          Sem filtro em vigor o bloco não existe: nada de espaço reservado
          esperando por chip, que só empurraria os resultados para baixo.
        -->
        <div
          v-if="activeChips.length"
          role="group"
          :aria-label="strings.list.activeFilters"
          class="mb-4 flex flex-wrap gap-2"
        >
          <!--
            O chip inteiro é o botão de remover, e não um texto com um "x"
            colado do lado: no celular o alvo de toque é a peça toda. O
            aria-label diz o critério e o valor, porque "Tirar" sozinho, lido em
            sequência seis vezes, não distingue um chip do outro.
          -->
          <UButton
            v-for="chip in activeChips"
            :key="chip.field"
            color="neutral"
            variant="soft"
            size="xs"
            trailing-icon="i-lucide-x"
            :aria-label="strings.list.removeFilter(chip.criterion, chip.value)"
            @click="filters[chip.field] = ''"
          >
            {{ strings.list.activeFilter(chip.criterion, chip.value) }}
          </UButton>
        </div>

        <p class="font-mono text-xs text-muted" aria-live="polite">
          {{ strings.list.results(results.length) }}
        </p>

        <template v-if="results.length">
          <section v-for="group in groups" :key="group.uf" class="mt-7 first:mt-4">
            <div class="mb-5 flex items-center gap-3">
              <span class="rounded bg-inverted px-1.5 py-0.5 font-mono text-xs font-bold tracking-widest text-inverted">
                {{ group.uf }}
              </span>
              <span class="text-sm text-muted">{{ strings.map.stateGroup(group.nome, group.items.length) }}</span>
              <hr class="flex-1 border-muted">
            </div>
            <div class="grid gap-x-8 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
              <InitiativeCard
                v-for="item in group.items"
                :key="item.stem"
                :initiative="item"
                :show-state="false"
              />
            </div>
          </section>
        </template>

        <!-- Estado vazio -->
        <div v-else class="mt-12 flex flex-col items-center gap-3 text-center">
          <UIcon name="i-lucide-paw-print" class="size-10 text-dimmed" />
          <p class="font-display text-lg font-bold text-highlighted">
            {{ strings.list.emptyTitle }}
          </p>
          <p class="text-sm text-muted">{{ strings.list.emptyHint }}</p>
          <UButton v-if="hasFilters" color="neutral" variant="outline" @click="clearFilters">
            {{ strings.list.clearFilters }}
          </UButton>
        </div>
      </div>
    </div>
  </UContainer>
</template>
