<script setup lang="ts">
import { pt } from '@nuxt/ui/locale'
import type { NuxtError } from '#app'

/**
 * Página de erro do site. O Nuxt a renderiza no lugar do `app.vue`, então ela
 * repete o `UApp` e o `NuxtLayout` para manter cabeçalho, rodapé e tema.
 */
const props = defineProps<{ error: NuxtError }>()

const isNotFound = computed(() => props.error.statusCode === 404)

/** Em 404 o `statusMessage` já diz o que faltou (página ou Iniciativa). */
const title = computed(() =>
  isNotFound.value
    ? props.error.statusMessage || strings.errors.pageNotFound
    : strings.errors.unexpectedTitle,
)

useSiteHead()
useSeoMeta({ title: title.value })
</script>

<template>
  <UApp :locale="pt">
    <NuxtLayout>
      <UContainer class="flex max-w-xl flex-col items-center gap-4 py-20 text-center sm:py-28">
        <SiteLogo v-if="isNotFound" class="size-14 text-primary" />
        <UIcon v-else name="i-lucide-circle-alert" class="size-14 text-error" />
        <p class="font-mono text-sm text-dimmed">{{ error.statusCode }}</p>
        <h1 class="font-display text-3xl font-semibold text-highlighted">{{ title }}</h1>
        <p class="text-muted">
          {{ isNotFound ? strings.errors.notFoundText : strings.errors.unexpectedText }}
        </p>
        <div class="mt-2 flex flex-wrap justify-center gap-2">
          <UButton to="/iniciativas" color="primary" icon="i-lucide-search">
            {{ strings.initiatives.viewAll }}
          </UButton>
          <UButton to="/" color="neutral" variant="outline" icon="i-lucide-arrow-left">
            {{ strings.errors.backHome }}
          </UButton>
        </div>
      </UContainer>
    </NuxtLayout>
  </UApp>
</template>
