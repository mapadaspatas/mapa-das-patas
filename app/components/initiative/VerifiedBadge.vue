<script setup lang="ts">
const props = defineProps<{ date: string }>()

const formattedDate = computed(() =>
  new Date(`${props.date}T00:00:00`).toLocaleDateString('pt-BR'),
)
</script>

<template>
  <UTooltip :text="strings.badge.verifiedOn(formattedDate)">
    <UBadge color="success" variant="subtle" icon="i-lucide-badge-check" size="lg">
      {{ strings.badge.verified }}
    </UBadge>
  </UTooltip>
</template>
