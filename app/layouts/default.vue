<script setup lang="ts">
const publicAnalyticsUrl = useRuntimeConfig().public.umamiPublicUrl
</script>

<template>
  <div class="flex min-h-screen flex-col bg-default">
    <header class="sticky top-0 z-20 border-b border-muted bg-default/90 backdrop-blur">
      <UContainer class="flex h-16 items-center justify-between gap-4">
        <NuxtLink to="/" class="flex items-center gap-2">
          <SiteLogo class="size-6 shrink-0 text-primary" />
          <span class="font-display text-xl font-bold whitespace-nowrap text-highlighted">
            {{ strings.siteName }}
          </span>
        </NuxtLink>
        <nav class="flex items-center gap-1 sm:gap-2">
          <UButton to="/iniciativas" color="neutral" variant="ghost" class="max-sm:hidden">
            {{ strings.initiatives.title }}
          </UButton>
          <UButton to="/como-contribuir" color="neutral" variant="ghost" class="max-md:hidden">
            {{ strings.nav.howToContribute }}
          </UButton>
          <!--
            Sem isto, quem tem o sistema no escuro não tinha como ver o site
            claro (e vice-versa) sem mexer no sistema operacional.
          -->
          <UColorModeButton />
          <UButton to="/cadastrar" color="primary">
            {{ strings.nav.register }}
          </UButton>
        </nav>
      </UContainer>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <!--
      Colofão: a nota de fechamento de quem fez, sob que licença e com que
      dados. Centralizado de propósito — é bloco curto, e alinhado à esquerda
      ele ficava pendurado num container largo, parecendo sobra de página. A
      pata abre o bloco fechando o que o cabeçalho abriu com pata e nome, e o
      Instagram o encerra: as duas únicas figuras da coluna, uma em cada ponta.
    -->
    <footer class="border-t border-muted py-10">
      <UContainer class="flex flex-col items-center gap-5 text-center text-sm text-muted">
        <SiteLogo class="size-5 text-primary" />

        <nav class="flex flex-wrap justify-center gap-x-5 gap-y-2">
          <NuxtLink to="/iniciativas" class="hover:text-default">{{ strings.initiatives.title }}</NuxtLink>
          <NuxtLink to="/cadastrar" class="hover:text-default">{{ strings.home.ctaButton }}</NuxtLink>
          <NuxtLink to="/sobre" class="hover:text-default">{{ strings.nav.about }}</NuxtLink>
          <NuxtLink to="/como-contribuir" class="hover:text-default">{{ strings.nav.howToContribute }}</NuxtLink>
          <NuxtLink to="/privacidade" class="hover:text-default">{{ strings.nav.privacy }}</NuxtLink>
          <NuxtLink to="/contato" class="hover:text-default">{{ strings.nav.contact }}</NuxtLink>
          <a
            v-if="publicAnalyticsUrl"
            :href="publicAnalyticsUrl"
            target="_blank"
            rel="noopener"
            class="hover:text-default"
          >
            {{ strings.nav.analytics }}
          </a>
        </nav>

        <div class="max-w-[46ch] space-y-1 text-balance">
          <p>{{ strings.footer.madeByCommunity }}</p>
          <p>{{ strings.footer.licenses }}</p>
        </div>

        <!-- Só o ícone: o nome já está na fileira de links, via /contato -->
        <a
          :href="strings.contact.instagramUrl"
          target="_blank"
          rel="noopener"
          :aria-label="strings.footer.instagramLabel"
          class="text-dimmed hover:text-primary"
        >
          <UIcon name="i-simple-icons-instagram" class="size-5" />
        </a>
      </UContainer>
    </footer>
  </div>
</template>
