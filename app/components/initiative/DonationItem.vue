<script setup lang="ts">
import { renderSVG } from 'uqr'
import type { Donation } from '../../../shared/schema/initiative'

const props = defineProps<{
  donation: Donation
  /** Slug da Iniciativa, que identifica o evento de métrica. */
  slug: string
  /** Nome e cidade da Iniciativa: viram recebedor e praça dentro do BR Code. */
  name: string
  city: string
}>()

const analytics = useAnalytics()
const toast = useToast()
const copied = ref<'key' | 'code' | null>(null)
const qrOpen = ref(false)

const pixKey = computed(() => ('chave' in props.donation ? props.donation.chave : undefined))
const url = computed(() => ('url' in props.donation ? props.donation.url : undefined))

/** Só existe para PIX com chave publicada; nada é pedido a serviço externo. */
const brCode = computed(() => pixBrCodeOf(props.donation, props.name, props.city))

/** Desenhado só quando o modal abre: o QR não pesa na página de detalhe. */
const qrSvg = computed(() =>
  brCode.value ? renderSVG(brCode.value, { border: 2, pixelSize: 8, ecc: 'M' }) : '',
)

async function copy(value: string, target: 'key' | 'code') {
  await navigator.clipboard.writeText(value)
  copied.value = target
  analytics.trackCopyPix(props.slug, target)
  toast.add({
    title: target === 'key' ? strings.detail.keyCopied : strings.detail.codeCopied,
    color: 'success',
    icon: 'i-lucide-check',
  })
  setTimeout(() => (copied.value = null), 2000)
}

/*
 * O botão do QR é o `DialogTrigger` do UModal, que já alterna `qrOpen` no
 * clique. Mexer em `qrOpen` aqui também seria disputar o mesmo estado com ele
 * no mesmo evento, então só observamos a abertura para registrar a métrica.
 */
function onQrOpenChange(open: boolean) {
  if (open) {
    analytics.trackShowQr(props.slug)
  }
}
</script>

<template>
  <div class="rounded-xl bg-elevated/60 p-4">
    <div class="flex items-center justify-between gap-3">
      <span class="font-mono text-[10.5px] font-bold tracking-[0.11em] text-muted uppercase">
        {{ donationLabels[donation.tipo] }}
      </span>
      <a
        v-if="pixKey"
        :href="donation.fonte"
        target="_blank"
        rel="noopener"
        class="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-secondary hover:underline"
        @click="analytics.trackOpenSource(slug, 'link_fonte')"
      >
        <UIcon name="i-lucide-shield-check" class="size-3.5" />
        {{ strings.detail.viewSource }}
      </a>
    </div>

    <!-- Chave PIX copiável, com atalho para o QR Code do app do banco -->
    <div v-if="pixKey" class="mt-3 space-y-2.5">
      <code class="block truncate rounded-lg border border-default bg-default px-3 py-2.5 font-mono text-sm text-highlighted">
        {{ pixKey }}
      </code>
      <div class="flex flex-wrap gap-2">
        <UButton
          :icon="copied === 'key' ? 'i-lucide-check' : 'i-lucide-copy'"
          color="secondary"
          size="sm"
          @click="copy(pixKey, 'key')"
        >
          {{ strings.detail.copyKey }}
        </UButton>

        <UModal
          v-if="brCode"
          v-model:open="qrOpen"
          :title="strings.detail.qrTitle"
          :description="strings.detail.qrDescription(name)"
          @update:open="onQrOpenChange"
        >
          <UButton icon="i-lucide-qr-code" color="neutral" variant="outline" size="sm">
            {{ strings.detail.showQrCode }}
          </UButton>

          <template #body>
            <div class="flex flex-col items-center gap-4">
              <!-- eslint-disable-next-line vue/no-v-html -- SVG gerado localmente por uqr -->
              <div
                class="size-56 rounded-lg bg-white p-3 sm:size-64 [&>svg]:size-full"
                v-html="qrSvg"
              />

              <div class="w-full">
                <p class="font-mono text-[10.5px] font-bold tracking-[0.11em] text-muted uppercase">
                  {{ strings.detail.pixCode }}
                </p>
                <code
                  class="mt-1 block max-h-24 overflow-y-auto rounded bg-elevated p-2 font-mono text-xs break-all"
                >
                  {{ brCode }}
                </code>
                <UButton
                  class="mt-2"
                  block
                  :icon="copied === 'code' ? 'i-lucide-check' : 'i-lucide-copy'"
                  color="secondary"
                  @click="copy(brCode, 'code')"
                >
                  {{ strings.detail.copyCode }}
                </UButton>
              </div>

              <p class="text-center text-xs text-muted">{{ strings.detail.qrGenerated }}</p>
            </div>
          </template>
        </UModal>
      </div>
    </div>

    <!-- Campanha externa (vaquinha, apoio recorrente, PayPal) -->
    <div v-else-if="url" class="mt-3">
      <UButton
        :to="url"
        target="_blank"
        color="secondary"
        size="sm"
        trailing-icon="i-lucide-external-link"
        @click="analytics.trackOpenCampaign(slug, url)"
      >
        {{ strings.detail.openCampaign }}
      </UButton>
    </div>

    <!--
      pix-na-fonte: a chave é pessoal e não é republicada (ver ADR 0006).
      A ação vem primeiro e o canal aparece por extenso, para quem doa saber
      exatamente onde vai cair antes de clicar; a regra fica no miudinho, dita
      como decisão nossa e sem adjetivo sobre a Iniciativa.
    -->
    <div v-else class="mt-3">
      <p class="font-display text-lg font-bold text-highlighted">
        {{ strings.detail.pixAtSource }}
      </p>
      <p class="mt-0.5 font-mono text-xs break-all text-muted">
        {{ sourceLabel(donation.fonte) }}
      </p>
      <UButton
        class="mt-3"
        :to="donation.fonte"
        target="_blank"
        color="secondary"
        size="sm"
        trailing-icon="i-lucide-external-link"
        @click="analytics.trackOpenSource(slug, 'pix_na_fonte')"
      >
        {{ strings.detail.openOfficialChannel }}
      </UButton>
      <p class="mt-3 text-xs/relaxed text-dimmed">{{ strings.detail.keyPolicy }}</p>
    </div>
  </div>
</template>
