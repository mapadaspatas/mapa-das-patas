<script setup lang="ts">
import type { Initiative } from '../../../shared/schema/initiative'

/**
 * Campos que a listagem seleciona da coleção. Os tipos vêm do schema (e não de
 * `string`) para que os rótulos sejam indexados sem cast: se um valor novo
 * entrar no domínio sem rótulo, o erro aparece aqui e não na tela.
 * O @nuxt/content devolve `null` no campo ausente, daí os `| null`.
 */
interface ListItem {
  stem: string
  nome: string
  estado: string
  cidade: string
  tipo: Initiative['tipo']
  imagem?: string | null
  especies?: readonly NonNullable<Initiative['especies']>[number][] | null
  verificado?: { em: string, canal: string } | false | null
  doacoes?: readonly { fonte: string }[] | null
}

const props = withDefaults(
  defineProps<{
    initiative: ListItem
    /**
     * A listagem agrupa por estado e já imprime a sigla no cabeçalho do bloco:
     * repeti-la em cada verbete embaixo dele era dizer "SP" trinta vezes.
     */
    showState?: boolean
  }>(),
  { showState: true },
)

const slug = computed(() => props.initiative.stem.replace(/^iniciativas\//, ''))

/**
 * A Fonte impressa no verbete é a promessa do site cumprida antes do clique: dá
 * para ver de onde veio o dado sem abrir a página. Toda doação tem Fonte, e a
 * primeira basta — o detalhe mostra todas.
 */
const source = computed(() => {
  const first = props.initiative.doacoes?.[0]?.fonte
  return first ? sourceLabel(first) : undefined
})
</script>

<template>
  <!--
    Verbete, não cartão: o diretório é um catálogo, e catálogo se lê por nome.
    A moldura saiu (borda, fundo tingido, filete inteiro, chips em caixa alta)
    porque ela gastava a cor do Tipo três vezes no campo que menos distingue —
    50 das 68 Iniciativas caem em dois tipos, então trinta caixas coloridas
    viravam ruído. Sobra o nome grande, o lugar, o tipo dito por extenso e a
    Fonte. A cor do Tipo vive num lugar só: a aba sobre o filete.
  -->
  <NuxtLink
    :to="`/iniciativas/${slug}`"
    class="verbete group relative z-0 block border-t border-muted pt-3.5 pb-1"
    :class="typeColorClass[initiative.tipo]"
  >
    <span class="verbete-aba" aria-hidden="true" />

    <div class="flex items-start gap-3">
      <img
        v-if="initiative.imagem"
        :src="initiative.imagem"
        :alt="`Foto de ${initiative.nome}`"
        loading="lazy"
        decoding="async"
        class="mt-0.5 size-10 shrink-0 rounded-lg object-cover ring-1 ring-default"
      >
      <h3 class="verbete-nome font-display text-[1.375rem]/[1.12] font-bold text-balance text-highlighted">
        {{ initiative.nome
        }}<UIcon
          v-if="verificationOf(initiative.verificado)"
          name="i-lucide-badge-check"
          class="ml-1.5 inline-block size-4.5 -translate-y-0.5 text-success"
          :aria-label="strings.badge.verified"
        />
      </h3>
    </div>

    <p class="mt-2 font-mono text-xs text-muted">
      {{ initiative.cidade
      }}<template v-if="showState">, <span class="font-bold text-default">{{ initiative.estado }}</span></template>
    </p>

    <!-- Tipo e Espécie ditos como frase; eram dois blocos em caixa alta -->
    <p class="mt-1 text-sm/snug text-muted">
      {{ kindSentence(initiative.tipo, initiative.especies) }}
    </p>

    <p v-if="source" class="mt-3 flex items-baseline gap-1.5 font-mono text-[11px] text-dimmed">
      <span class="shrink-0 text-secondary">{{ strings.card.source }}</span>
      <span class="min-w-0 truncate">{{ source }}</span>
    </p>
  </NuxtLink>
</template>

<style scoped>
/*
 * Sem moldura, o alvo do clique precisa se mostrar na hora em que a pessoa
 * pergunta por ele: passar o mouse acende o verbete inteiro num sopro da cor
 * do Tipo, que é o mesmo tingimento que o Card tinha fixo — agora ele responde
 * a uma ação em vez de ficar ligado o tempo todo. O respiro sangra para fora do
 * texto sem encostar na coluna vizinha (10px de cada lado contra 32px de gap).
 */
.verbete::before {
  content: '';
  position: absolute;
  inset: 0 -10px -6px;
  z-index: -1;
  border-radius: var(--ui-radius);
  background: color-mix(in oklab, var(--tipo) 10%, var(--tipo-base));
  opacity: 0;
  transition: opacity 0.14s ease;
}
.verbete:hover::before,
.verbete:focus-visible::before {
  opacity: 1;
}
.verbete:focus-visible {
  outline: 2px solid var(--ui-text-highlighted);
  outline-offset: 6px;
  border-radius: 2px;
}
/* O nome é o link: sublinhar ele, e não a linha inteira, é o sinal honesto. */
.verbete:hover .verbete-nome {
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
  text-decoration-color: var(--tipo);
}

/*
 * A aba do Tipo: marcador de ficha sobre o filete, do jeito que uma pasta de
 * arquivo se identifica na gaveta. É o único lugar onde a cor do Tipo aparece,
 * e é o que deixa varrer trinta verbetes por tipo sem ler nenhum.
 */
.verbete-aba {
  position: absolute;
  top: -1px;
  left: 0;
  width: 2.5rem;
  height: 3px;
  background: var(--tipo);
}

@media (prefers-reduced-motion: reduce) {
  .verbete::before { transition: none; }
}
</style>
