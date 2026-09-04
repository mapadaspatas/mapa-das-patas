<script setup lang="ts">
import { ufShapes, ufViewBox } from '~/utils/uf-map'

/**
 * Mapa do Brasil por UF: superfície de busca da listagem e retrato honesto da
 * cobertura do diretório. Estado sem nenhuma Iniciativa não some nem fica
 * cinza-morto — ele fica clicável-não, mas visível, porque o buraco no mapa é
 * o que estamos pedindo à comunidade para preencher.
 *
 * Os contornos vêm da malha oficial do IBGE, geradas por
 * `scripts/build-uf-map.ts` (ver `app/utils/uf-map.ts`).
 */
const props = defineProps<{
  /** Quantas Iniciativas por sigla de UF. Sigla ausente conta como zero. */
  counts: Record<string, number>
  /** UF destacada no momento, se houver filtro de estado ativo. */
  selected?: string
}>()

const emit = defineEmits<{ select: [uf: string] }>()

/**
 * Abaixo desta fração do viewBox a sigla não cabe dentro do contorno: PB, AL,
 * SE, ES e RJ ficam sem rótulo fixo e se identificam no hover, no foco e no
 * título. O valor de `area` sai do próprio gerador.
 */
const AREA_MINIMA_ROTULO = 0.005

const states = Object.entries(ufShapes)
  .map(([uf, shape]) => ({ uf, ...shape }))
  .sort((a, b) => b.area - a.area)

function countOf(uf: string) {
  return props.counts[uf] ?? 0
}

/** Cinco degraus: 1, 2–3, 4–7, 8–24, 25+. A escala é a distribuição real. */
function stepOf(uf: string) {
  const n = countOf(uf)
  if (!n) return 0
  if (n >= 25) return 5
  if (n >= 8) return 4
  if (n >= 4) return 3
  if (n >= 2) return 2
  return 1
}

function labelOf(uf: string) {
  const n = countOf(uf)
  const nome = ufShapes[uf as keyof typeof ufShapes].nome
  if (!n) return `${nome}: nenhuma iniciativa cadastrada ainda`
  return `${nome}: ${n === 1 ? '1 iniciativa' : `${n} iniciativas`}`
}

/** Sigla desenhada dentro do estado: só onde há dado e onde cabe. */
function showsCode(state: { uf: string, area: number }) {
  return countOf(state.uf) > 0 && state.area >= AREA_MINIMA_ROTULO
}

const hovered = ref<string | null>(null)

/** O que a linha de leitura mostra: o estado sob o cursor, ou o filtro ativo. */
const readout = computed(() => {
  const uf = hovered.value ?? props.selected
  return uf ? labelOf(uf) : null
})

function activate(uf: string) {
  if (!countOf(uf)) return
  emit('select', uf)
}
</script>

<template>
  <div>
    <svg
      :viewBox="ufViewBox"
      class="w-full"
      role="group"
      :aria-label="strings.map.title"
      @mouseleave="hovered = null"
    >
      <path
        v-for="state in states"
        :key="state.uf"
        :d="state.d"
        class="uf"
        :class="[`uf-${stepOf(state.uf)}`, { 'uf-selecionada': selected === state.uf }]"
        :tabindex="countOf(state.uf) ? 0 : undefined"
        :role="countOf(state.uf) ? 'button' : undefined"
        :aria-pressed="countOf(state.uf) ? selected === state.uf : undefined"
        :aria-label="countOf(state.uf) ? labelOf(state.uf) : undefined"
        @mouseenter="hovered = state.uf"
        @focus="hovered = state.uf"
        @blur="hovered = null"
        @click="activate(state.uf)"
        @keydown.enter.prevent="activate(state.uf)"
        @keydown.space.prevent="activate(state.uf)"
      >
        <title>{{ labelOf(state.uf) }}</title>
      </path>

      <!-- Rótulos por cima de todos os contornos, para nenhum vizinho cobri-los -->
      <text
        v-for="state in states.filter(showsCode)"
        :key="`t-${state.uf}`"
        :x="state.cx"
        :y="state.cy"
        class="sigla"
        :class="stepOf(state.uf) >= 4 ? 'sigla-clara' : 'sigla-escura'"
        text-anchor="middle"
        dominant-baseline="central"
      >{{ state.uf }}</text>
    </svg>

    <p class="mt-2 min-h-5 text-center font-mono text-xs text-muted" aria-live="polite">
      {{ readout ?? strings.map.hint }}
    </p>
  </div>
</template>

<style scoped>
/*
 * Estado sem Iniciativa precisa continuar visível: é ele que mostra o tamanho
 * do buraco. Fundo neutro com contorno próprio, e não um cinza quase branco
 * que some contra a página e faz o mapa parecer recortado.
 */
.uf {
  fill: var(--ui-bg-accented);
  stroke: var(--ui-bg);
  stroke-width: 2;
  stroke-linejoin: round;
  transition: fill 0.12s ease;
}
.uf-1 { fill: var(--color-urucum-100); }
.uf-2 { fill: var(--color-urucum-200); }
.uf-3 { fill: var(--color-urucum-300); }
.uf-4 { fill: var(--color-urucum-500); }
.uf-5 { fill: var(--color-urucum-600); }

/*
 * No escuro a rampa é a mesma cor da marca dissolvida na superfície, em doses
 * crescentes, em vez de degraus fixos da escala. Laranja puro sobre quase
 * preto lia como brasa — alarme, não densidade —, e a mistura mantém o mapa
 * ancorado no fundo da página. O vazio é a superfície pura: nunca mais claro
 * que um estado com dado, senão o mapa diz o contrário dos números.
 */
.dark .uf { fill: var(--ui-bg-elevated); }
.dark .uf-1 { fill: color-mix(in oklab, var(--color-urucum-600) 22%, var(--ui-bg-elevated)); }
.dark .uf-2 { fill: color-mix(in oklab, var(--color-urucum-600) 38%, var(--ui-bg-elevated)); }
.dark .uf-3 { fill: color-mix(in oklab, var(--color-urucum-600) 56%, var(--ui-bg-elevated)); }
.dark .uf-4 { fill: color-mix(in oklab, var(--color-urucum-500) 78%, var(--ui-bg-elevated)); }
.dark .uf-5 { fill: var(--color-urucum-500); }

.uf:not(.uf-0) { cursor: pointer; }
.uf:not(.uf-0):hover,
.uf-selecionada {
  stroke: var(--ui-text-highlighted);
  stroke-width: 3;
}
.uf:focus-visible {
  outline: none;
  stroke: var(--ui-text-highlighted);
  stroke-width: 4;
}

.sigla {
  font-family: var(--font-mono);
  font-size: 21px;
  font-weight: 700;
  letter-spacing: 0.04em;
  pointer-events: none;
}
.sigla-escura { fill: var(--color-urucum-950); }
.sigla-clara { fill: #fff; }
/* A rampa do escuro inverte quem é fundo claro e quem é fundo escuro. */
.dark .sigla-escura { fill: var(--color-urucum-100); }
.dark .sigla-clara { fill: var(--color-urucum-950); }

@media (prefers-reduced-motion: reduce) {
  .uf { transition: none; }
}
</style>
