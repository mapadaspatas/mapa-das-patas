<script setup lang="ts">
import type { Donation } from '../../../shared/schema/initiative'

/**
 * Botão que monta a arte vertical da Iniciativa e oferece salvar ou
 * compartilhar. É o substituto do print: a arte sai com o endereço da página,
 * então quem a recebe consegue conferir a chave e a Fonte na origem, e ela se
 * atualiza sozinha da próxima vez que alguém gerar.
 */
const props = defineProps<{
  slug: string
  nome: string
  cidade: string
  estado: string
  verificado?: boolean
  imagem?: string
  /** Endereço absoluto da página, o mesmo que o botão de compartilhar usa. */
  url: string
  doacoes?: Donation[]
}>()

const analytics = useAnalytics()
const toast = useToast()

const aberto = ref(false)
const gerando = ref(false)
const comQrCode = ref(false)
/** A arte pronta, guardada para salvar e compartilhar sem montar duas vezes. */
const arte = shallowRef<Blob>()
const previa = ref<string>()

/**
 * Só doação `pix-cnpj` tem chave publicada, e só ela vira BR Code. Sem isso o
 * controle de QR não aparece: oferecer e desabilitar faria parecer que falta
 * alguma coisa na Iniciativa, quando o que existe é a nossa regra de não
 * republicar chave de pessoa.
 */
const brCode = computed(() => {
  for (const doacao of props.doacoes ?? []) {
    const codigo = pixBrCodeOf(doacao, props.nome, props.cidade)
    if (codigo) return codigo
  }
  return undefined
})

/** O endereço como se lê na arte: sem `https://`, que ninguém digita. */
const endereco = computed(() => props.url.replace(/^https?:\/\//, ''))

const nomeDoArquivo = computed(() => strings.detail.promoteFileName(props.slug))

async function montar() {
  gerando.value = true
  try {
    arte.value = await gerarCartao({
      nome: props.nome,
      cidade: props.cidade,
      estado: props.estado,
      endereco: endereco.value,
      verificado: props.verificado,
      imagem: props.imagem,
      brCode: comQrCode.value ? brCode.value : undefined,
    })
    if (previa.value) URL.revokeObjectURL(previa.value)
    previa.value = URL.createObjectURL(arte.value)
  }
  catch {
    toast.add({ title: strings.detail.promoteFailed, color: 'error', icon: 'i-lucide-circle-alert' })
  }
  finally {
    gerando.value = false
  }
}

/*
 * A arte é montada ao abrir e refeita a cada vez que o QR é ligado ou
 * desligado, para a prévia mostrar exatamente o arquivo que vai ser salvo.
 */
watch([aberto, comQrCode], ([estaAberto]) => {
  if (estaAberto) montar()
})

function baixar() {
  if (!arte.value) return
  analytics.trackPromote(props.slug, comQrCode.value)
  const link = document.createElement('a')
  link.href = previa.value!
  link.download = nomeDoArquivo.value
  link.click()
}

/**
 * Compartilhar leva o arquivo e o endereço juntos: em quem recebe, a imagem
 * abre no story e o link continua clicável. `canShare` com o arquivo na mão é
 * a única checagem que vale — há navegador com `share` que recusa arquivo.
 */
const podeCompartilhar = computed(() => {
  if (!import.meta.client || !arte.value) return false
  const arquivo = new File([arte.value], nomeDoArquivo.value, { type: 'image/png' })
  return navigator.canShare?.({ files: [arquivo] }) ?? false
})

async function compartilhar() {
  if (!arte.value) return
  analytics.trackPromote(props.slug, comQrCode.value)
  const arquivo = new File([arte.value], nomeDoArquivo.value, { type: 'image/png' })
  // Cancelar o menu de compartilhar rejeita a promise: não é erro nosso
  await navigator.share({ files: [arquivo], title: props.nome, url: props.url }).catch(() => {})
}

onBeforeUnmount(() => {
  if (previa.value) URL.revokeObjectURL(previa.value)
})
</script>

<template>
  <UModal
    v-model:open="aberto"
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
          <img v-if="previa" :src="previa" :alt="nome" class="size-full object-contain">
          <span v-else class="px-4 text-center text-sm text-muted">
            {{ strings.detail.promoteGenerating }}
          </span>
        </div>

        <div v-if="brCode" class="rounded-xl bg-elevated/60 p-4">
          <USwitch v-model="comQrCode" :label="strings.detail.promoteWithQr" />
          <p class="mt-1.5 text-xs text-muted">{{ strings.detail.promoteWithQrHelp }}</p>
        </div>

        <div class="flex flex-wrap gap-2">
          <UButton
            :disabled="!arte || gerando"
            :loading="gerando"
            color="secondary"
            icon="i-lucide-download"
            @click="baixar"
          >
            {{ strings.detail.promoteSave }}
          </UButton>
          <UButton
            v-if="podeCompartilhar"
            color="neutral"
            variant="outline"
            icon="i-lucide-share-2"
            @click="compartilhar"
          >
            {{ strings.detail.promoteShare }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
