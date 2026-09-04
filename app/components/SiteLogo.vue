<script setup lang="ts">
import { logoPad, logoPadStroke, logoToes, logoViewBox } from '~/utils/logo'

/**
 * A marca do site: uma pata cuja almofada é a silhueta do Brasil.
 *
 * Substitui o `i-lucide-paw-print` onde a pata é marca (cabeçalho, rodapé,
 * favicon), não onde é só ilustração. Herda a cor do texto, como um ícone:
 * `class="size-6 text-primary"` basta. A almofada leva traço da mesma cor por
 * cima do preenchimento — é o que a engorda e arredonda o bastante para ler
 * como pata em 24px, enquanto em 128px o Brasil continua reconhecível.
 *
 * Geometria em `app/utils/logo.ts`, gerada por `scripts/build-logo.ts`.
 */
</script>

<template>
  <svg :viewBox="logoViewBox" fill="currentColor" aria-hidden="true" focusable="false">
    <path :d="logoPad" stroke="currentColor" :stroke-width="logoPadStroke" stroke-linejoin="round" />
    <circle v-for="dedo in logoToes" :key="dedo.cx" :cx="dedo.cx" :cy="dedo.cy" :r="dedo.r" />
  </svg>
</template>
