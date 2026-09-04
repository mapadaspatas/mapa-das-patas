<script setup lang="ts">
const props = withDefaults(
  defineProps<{ name: string, image?: string | null, size?: 'sm' | 'lg' }>(),
  { image: null, size: 'sm' },
)

const initials = computed(() => initialsOf(props.name))
const colorClass = computed(() => avatarColorOf(props.name))
const sizeClass = computed(() =>
  props.size === 'lg' ? 'size-20 text-2xl sm:size-24 sm:text-3xl' : 'size-11 text-sm',
)
</script>

<template>
  <img
    v-if="image"
    :src="image"
    :alt="`Foto de ${name}`"
    loading="lazy"
    decoding="async"
    class="shrink-0 rounded-full object-cover ring-1 ring-default"
    :class="sizeClass"
  >
  <div
    v-else
    aria-hidden="true"
    class="flex shrink-0 items-center justify-center rounded-full font-display font-semibold"
    :class="[sizeClass, colorClass]"
  >
    {{ initials }}
  </div>
</template>
