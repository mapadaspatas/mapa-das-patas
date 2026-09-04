<script setup lang="ts">
/*
 * Cadastro de Iniciativa nova. Casca fina: o formulário inteiro vive em
 * InitiativeRegistrationForm, compartilhado com /editar/<slug>.
 */
const t = strings.register

useSeoMeta({
  title: t.title,
  description: t.subtitle,
})
</script>

<template>
  <InitiativeRegistrationForm />
</template>
