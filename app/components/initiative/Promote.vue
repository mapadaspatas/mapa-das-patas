<script setup lang="ts">
import type { Donation, Initiative } from '../../../shared/schema/initiative'

/**
 * Botão que monta o Cartão vertical da Iniciativa e oferece salvar ou
 * compartilhar. É o substituto do print: o Cartão sai com o endereço da
 * página, então quem o recebe confere a chave e a Fonte na origem, e ele se
 * atualiza sozinho da próxima vez que alguém gerar.
 */
const props = defineProps<{
  slug: string
  name: string
  city: string
  state: string
  verified?: boolean
  /** Caminho da Imagem da Iniciativa no site, quando ela enviou uma. */
  image?: string
  /** Endereço absoluto da página, o mesmo que o botão de compartilhar usa. */
  url: string
  /** A descrição publicada da Iniciativa, como ela a escreveu. */
  description?: string
  /** As redes publicadas dela, que no Cartão dizem onde ela responde. */
  social?: Initiative['redes']
  donations?: Donation[]
}>()

const analytics = useAnalytics()
const toast = useToast()

const open = ref(false)
const drawing = ref(false)
const withQrCode = ref(false)
/** O Cartão pronto, guardado para salvar e compartilhar sem montar duas vezes. */
const card = shallowRef<Blob>()
const preview = ref<string>()

/**
 * Só doação `pix-cnpj` tem chave publicada, e só ela vira BR Code. Sem isso o
 * controle de QR não aparece: oferecer e desabilitar faria parecer que falta
 * alguma coisa na Iniciativa, quando o que existe é a nossa regra de não
 * republicar chave de pessoa.
 */
const brCode = computed(() => initiativeBrCode(props.donations, props.name, props.city))

/** O endereço como se lê no Cartão: sem `https://`, que ninguém digita. */
const address = computed(() => props.url.replace(/^https?:\/\//, ''))

/**
 * As redes como o Cartão as imprime, na mesma ordem e com o mesmo texto dos
 * botões da página: quem recebe o story e quem abre a página leem as mesmas
 * redes, e o Cartão não elege nenhuma delas como a principal.
 */
const socialAddresses = computed(() =>
  props.social ? socialLinks(props.social).map((link) => link.label) : [],
)

const fileName = computed(() => strings.detail.promoteFileName(props.slug))

/**
 * Conta os pedidos para o último ganhar. Ligar e desligar o QR depressa põe
 * dois desenhos no ar ao mesmo tempo, e sem isto quem terminasse por último
 * mandaria — o controle diria "com QR" e o arquivo salvo sairia sem, que é
 * exatamente o Cartão errado que ninguém confere antes de postar.
 */
let pedido = 0

async function draw() {
  const atual = ++pedido
  drawing.value = true
  try {
    const feito = await gerarCartao({
      nome: props.name,
      cidade: props.city,
      estado: props.state,
      endereco: address.value,
      verificado: props.verified,
      descricao: props.description,
      redes: socialAddresses.value,
      imagem: props.image,
      brCode: withQrCode.value ? (brCode.value ?? undefined) : undefined,
    })
    if (atual !== pedido) return
    card.value = feito
    if (preview.value) URL.revokeObjectURL(preview.value)
    preview.value = URL.createObjectURL(feito)
  }
  catch {
    if (atual !== pedido) return
    toast.add({ title: strings.detail.promoteFailed, color: 'error', icon: 'i-lucide-circle-alert' })
  }
  finally {
    if (atual === pedido) drawing.value = false
  }
}

/*
 * O Cartão é montado ao abrir e refeito a cada vez que o QR é ligado ou
 * desligado, para a prévia mostrar exatamente o arquivo que vai ser salvo.
 */
watch([open, withQrCode], ([isOpen]) => {
  if (isOpen) draw()
})

function download() {
  if (!card.value) return
  analytics.trackPromote(props.slug, withQrCode.value)
  const link = document.createElement('a')
  link.href = preview.value!
  link.download = fileName.value
  link.click()
}

/**
 * Compartilhar leva o arquivo e o endereço juntos: em quem recebe, o Cartão
 * abre no story e o link continua clicável. `canShare` com o arquivo na mão é
 * a única checagem que vale — há navegador com `share` que recusa arquivo.
 */
const fileToShare = computed(() =>
  card.value ? new File([card.value], fileName.value, { type: 'image/png' }) : undefined,
)

const canShare = computed(() => {
  if (!import.meta.client || !fileToShare.value) return false
  return navigator.canShare?.({ files: [fileToShare.value] }) ?? false
})

async function share() {
  if (!fileToShare.value) return
  analytics.trackPromote(props.slug, withQrCode.value)
  // Cancelar o menu de compartilhar rejeita a promise: não é erro nosso
  await navigator
    .share({ files: [fileToShare.value], title: props.name, url: props.url })
    .catch(() => {})
}

onBeforeUnmount(() => {
  if (preview.value) URL.revokeObjectURL(preview.value)
})
</script>

<template>
  <UModal
    v-model:open="open"
    :title="strings.detail.promoteTitle"
    :description="strings.detail.promoteDescription"
  >
    <UButton color="neutral" variant="outline" size="sm" icon="i-lucide-megaphone">
      {{ strings.detail.promote }}
    </UButton>

    <template #body>
      <div class="flex flex-col gap-4">
        <div
          class="mx-auto flex aspect-[9/16] w-full max-w-56 items-center justify-center overflow-hidden rounded-lg border border-muted bg-elevated"
        >
          <img v-if="preview" :src="preview" :alt="name" class="size-full object-contain">
          <span v-else class="px-4 text-center text-sm text-muted">
            {{ strings.detail.promoteGenerating }}
          </span>
        </div>

        <div v-if="brCode" class="rounded-xl bg-elevated/60 p-4">
          <USwitch v-model="withQrCode" :label="strings.detail.promoteWithQr" />
          <p class="mt-1.5 text-xs text-muted">{{ strings.detail.promoteWithQrHelp }}</p>
        </div>

        <div class="flex flex-wrap gap-2">
          <UButton
            :disabled="!card || drawing"
            :loading="drawing"
            color="secondary"
            icon="i-lucide-download"
            @click="download"
          >
            {{ strings.detail.promoteSave }}
          </UButton>
          <UButton
            v-if="canShare"
            color="neutral"
            variant="outline"
            icon="i-lucide-share-2"
            @click="share"
          >
            {{ strings.detail.promoteShare }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
