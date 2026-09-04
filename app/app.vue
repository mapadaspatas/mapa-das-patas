<script setup lang="ts">
import { pt } from '@nuxt/ui/locale'

useSiteHead()
</script>

<template>
  <UApp :locale="pt">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
