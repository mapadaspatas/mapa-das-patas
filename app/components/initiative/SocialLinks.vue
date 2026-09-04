<script setup lang="ts">
import type { Initiative } from '../../../shared/schema/initiative'

const props = defineProps<{
  social: NonNullable<Initiative['redes']>
  /** Slug da Iniciativa, que identifica o evento de métrica. */
  slug: string
}>()

const analytics = useAnalytics()
const links = computed(() => socialLinks(props.social))

function onSocialClick(channel: string) {
  analytics.trackOpenSocial(props.slug, channel)
}
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <UButton
      v-for="link in links"
      :key="link.name"
      :to="link.url"
      target="_blank"
      color="neutral"
      variant="outline"
      size="sm"
      :icon="link.icon"
      @click="onSocialClick(link.name)"
    >
      {{ link.name }}
    </UButton>
  </div>
</template>
