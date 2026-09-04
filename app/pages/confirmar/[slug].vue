<script setup lang="ts">
import type { ConfirmationAction, ConfirmationResult } from '~~/shared/confirmation/process'
import { donationTypeMetadata } from '~~/shared/schema/initiative'

/*
 * Confirmação por link (ticket 20). A página mostra exatamente o que
 * /iniciativas/<slug> já mostra: o token não gateia a leitura, gateia o POST.
 * Por isso ela é pré-renderizada como qualquer outra — as rotas entram na mão
 * no nuxt.config, porque nada no site linka para cá (o link só existe na
 * mensagem que o Moderador manda).
 */
const t = strings.confirm
const slug = useRoute().params.slug as string

const { data: initiative } = await useAsyncData(`confirmar-${slug}`, () =>
  queryCollection('iniciativas').where('stem', '=', `iniciativas/${slug}`).first(),
)

if (!initiative.value) {
  throw createError({ statusCode: 404, statusMessage: strings.errors.initiativeNotFound })
}

// Duplica a página da Iniciativa e não tem nada que fazer numa busca, como
// acontece com /editar/<slug>.
useSeoMeta({
  title: t.title,
  description: t.subtitle(initiative.value.nome),
  robots: 'noindex, follow',
})

/*
 * O token só é lido depois da montagem: no `nuxt generate` a query não existe,
 * e ler no setup faria o HTML pré-renderizado (sem token) divergir da primeira
 * pintura do cliente (com token).
 */
const token = ref('')
onMounted(() => {
  const query = new URLSearchParams(window.location.search)
  const received = query.get('t')
  if (!received) return
  token.value = received
  /*
   * O token sai da URL no primeiro tick. Query string vira pageview registrado,
   * e token registrado num painel de métricas é token vazado. O `history.state`
   * é preservado para não quebrar a restauração de rolagem do Nuxt.
   */
  window.history.replaceState(window.history.state, '', window.location.pathname)
})

const donations = computed(() => (initiative.value?.doacoes ?? []).map((donation) => ({
  label: donationLabels[donation.tipo],
  value: 'chave' in donation ? donation.chave : 'url' in donation ? donation.url : '',
  published: donationTypeMetadata[donation.tipo]?.field !== 'none',
  source: donation.fonte,
})))

const social = computed(() => (initiative.value?.redes ? socialLinks(initiative.value.redes) : []))

const turnstileToken = ref('')
const sending = ref<ConfirmationAction | ''>('')
const confirmingLeave = ref(false)
const done = ref<{ action: ConfirmationAction, prUrl: string } | null>(null)
const problem = ref<{ reason: string, message: string } | null>(null)

async function send(action: ConfirmationAction) {
  sending.value = action
  problem.value = null
  try {
    // Sem tipo no $fetch: o corpo é conferido em api-result, não suposto aqui.
    const response = await $fetch('/api/confirmacao', {
      method: 'POST',
      // Só isto sobe: nenhum dado da Iniciativa vem daqui, ele é lido do
      // repositório pela Function (ver shared/confirmation/process.ts).
      body: { token: token.value, action, turnstileToken: turnstileToken.value },
      ignoreResponseError: true,
    })
    if (isApiSuccess<ConfirmationResult>(response)) {
      done.value = { action: response.action, prUrl: response.prUrl }
    } else {
      problem.value = problemOf(response)
    }
  } catch {
    problem.value = { reason: 'envio', message: strings.register.connectionFailure }
  } finally {
    sending.value = ''
    confirmingLeave.value = false
  }
}
</script>

<template>
  <UContainer v-if="initiative" class="max-w-2xl py-8 sm:py-12">
    <!-- Recebido -->
    <div v-if="done" class="flex flex-col items-center gap-4 py-16 text-center">
      <UIcon
        :name="done.action === 'confirmar' ? 'i-lucide-badge-check' : 'i-lucide-check'"
        class="size-14 text-success"
      />
      <h1 class="font-display text-2xl font-bold text-highlighted">
        {{ done.action === 'confirmar' ? t.successConfirmTitle : t.successLeaveTitle }}
      </h1>
      <p class="max-w-prose text-muted">
        {{ done.action === 'confirmar' ? t.successConfirmText : t.successLeaveText }}
      </p>
      <UButton
        :to="done.prUrl"
        target="_blank"
        rel="noopener"
        color="neutral"
        variant="outline"
        trailing-icon="i-lucide-external-link"
      >
        {{ t.viewProposal }}
      </UButton>
    </div>

    <template v-else>
      <h1 class="font-display text-3xl font-semibold text-highlighted">{{ t.title }}</h1>
      <p class="mt-4 max-w-[52ch] text-lg/relaxed text-muted">{{ t.subtitle(initiative.nome) }}</p>

      <!-- Os dados publicados, item a item: é o que se está confirmando -->
      <section class="mt-8 rounded-2xl border border-muted bg-elevated/40 p-5 sm:p-6">
        <h2 class="font-mono text-[10.5px] font-bold tracking-[0.13em] text-secondary uppercase">
          {{ t.dataTitle }}
        </h2>

        <div class="mt-4 flex items-center gap-3">
          <InitiativeAvatar :name="initiative.nome" :image="initiative.imagem" />
          <p class="font-display text-xl font-bold text-highlighted">{{ initiative.nome }}</p>
        </div>

        <dl class="mt-5 space-y-3.5">
          <div>
            <dt class="text-sm font-semibold text-highlighted">{{ t.location }}</dt>
            <dd class="text-muted">{{ strings.detail.location(initiative.cidade, initiative.estado) }}</dd>
          </div>
          <div>
            <dt class="text-sm font-semibold text-highlighted">{{ t.kind }}</dt>
            <dd class="text-muted">{{ kindSentence(initiative.tipo, initiative.especies) }}</dd>
          </div>
          <div>
            <dt class="text-sm font-semibold text-highlighted">{{ t.description }}</dt>
            <dd class="text-muted">{{ initiative.descricao }}</dd>
          </div>
          <div v-if="initiative.necessidades?.length">
            <dt class="text-sm font-semibold text-highlighted">{{ t.needs }}</dt>
            <dd class="text-muted">
              {{ initiative.necessidades.map((need) => needLabels[need]).join(' · ') }}
            </dd>
          </div>
          <div>
            <dt class="text-sm font-semibold text-highlighted">{{ t.social }}</dt>
            <dd class="text-muted">
              <span v-if="!social.length">{{ t.noSocial }}</span>
              <ul v-else class="space-y-1">
                <li v-for="link in social" :key="link.name">
                  <a
                    :href="link.url"
                    target="_blank"
                    rel="noopener"
                    class="font-mono text-sm break-all text-default hover:text-primary"
                  >
                    {{ link.url }}
                  </a>
                </li>
              </ul>
            </dd>
          </div>
        </dl>

        <!-- Cada doação com a sua Fonte: é a regra nº 1 posta para conferência -->
        <div class="mt-5 border-t border-muted pt-4">
          <p class="text-sm font-semibold text-highlighted">{{ t.donations }}</p>
          <p v-if="!donations.length" class="mt-1 text-muted">{{ t.noDonations }}</p>
          <ul v-else class="mt-2 space-y-3">
            <li v-for="(donation, index) in donations" :key="index">
              <p class="text-muted">
                <span class="font-semibold text-highlighted">{{ donation.label }}</span>
                <span v-if="donation.published && donation.value" class="font-mono text-sm break-all">
                  · {{ donation.value }}
                </span>
              </p>
              <a
                :href="donation.source"
                target="_blank"
                rel="noopener"
                class="font-mono text-xs break-all text-dimmed hover:text-primary"
              >
                {{ t.donationSource }}: {{ sourceLabel(donation.source) }}
              </a>
            </li>
          </ul>
        </div>
      </section>

      <!-- Sem o código do link, a leitura continua; só as ações não existem -->
      <UAlert
        v-if="!token"
        class="mt-8"
        color="neutral"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="t.noTokenTitle"
        :description="t.noTokenText"
      />

      <section v-else class="mt-8 space-y-6">
        <h2 class="font-display text-xl font-semibold text-highlighted">{{ t.actionsTitle }}</h2>

        <UAlert
          v-if="problem"
          :color="problem.reason === 'em-revisao' ? 'neutral' : 'error'"
          variant="subtle"
          :icon="problem.reason === 'em-revisao' ? 'i-lucide-history' : 'i-lucide-circle-alert'"
          :title="problem.reason === 'em-revisao' ? t.reviewTitle : t.failureTitle"
          :description="problem.message"
        />

        <!--
          A saída vem antes do pedido de confirmação, sem condição: é a regra 6
          de docs/mensagens-para-iniciativas.md, e vale aqui igual.
        -->
        <div class="rounded-2xl border border-muted p-5">
          <h3 class="font-semibold text-highlighted">{{ t.leaveTitle }}</h3>
          <p class="mt-1 text-sm/relaxed text-muted">{{ t.leaveText }}</p>
          <div v-if="!confirmingLeave" class="mt-3">
            <UButton color="neutral" variant="outline" icon="i-lucide-trash-2" @click="confirmingLeave = true">
              {{ t.leaveAction }}
            </UButton>
          </div>
          <div v-else class="mt-3">
            <p class="text-sm font-semibold text-highlighted">{{ t.leaveConfirmText }}</p>
            <div class="mt-2 flex flex-wrap gap-3">
              <UButton
                color="error"
                :loading="sending === 'sair'"
                :disabled="!turnstileToken || sending !== ''"
                icon="i-lucide-trash-2"
                @click="send('sair')"
              >
                {{ sending === 'sair' ? t.sending : t.leaveConfirmAction }}
              </UButton>
              <UButton color="neutral" variant="ghost" @click="confirmingLeave = false">
                {{ t.leaveCancel }}
              </UButton>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-muted p-5">
          <h3 class="font-semibold text-highlighted">{{ t.editTitle }}</h3>
          <p class="mt-1 text-sm/relaxed text-muted">{{ t.editText }}</p>
          <UButton
            :to="`/editar/${slug}`"
            color="neutral"
            variant="outline"
            icon="i-lucide-pencil"
            class="mt-3"
          >
            {{ t.editAction }}
          </UButton>
        </div>

        <div class="rounded-2xl border border-muted border-t-4 border-t-mato-600 p-5 dark:border-t-mato-500">
          <h3 class="font-semibold text-highlighted">{{ t.confirmTitle }}</h3>
          <p class="mt-1 text-sm/relaxed text-muted">{{ t.confirmText }}</p>
          <UButton
            class="mt-3"
            size="lg"
            color="primary"
            :loading="sending === 'confirmar'"
            :disabled="!turnstileToken || sending !== ''"
            icon="i-lucide-badge-check"
            @click="send('confirmar')"
          >
            {{ sending === 'confirmar' ? t.sending : t.confirmAction }}
          </UButton>
        </div>

        <NuxtTurnstile v-model="turnstileToken" />
        <p v-if="!turnstileToken" class="text-sm text-dimmed">{{ t.turnstilePending }}</p>

        <NuxtLink to="/privacidade" class="inline-block text-sm text-primary underline">
          {{ t.privacyLink }}
        </NuxtLink>
      </section>
    </template>
  </UContainer>
</template>
