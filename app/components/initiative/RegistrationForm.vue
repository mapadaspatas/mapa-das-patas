<script setup lang="ts">
import { cnpjChars, formatCnpj, isCnpjMaskable } from '~~/shared/cnpj'
import {
  donationTypes,
  initiativeTypes,
  looksLikePersonalPixKey,
  needs as needValues,
  species as speciesValues,
  states,
  usesDonationKey,
  usesDonationUrl,
} from '~~/shared/schema/initiative'
import type { Collections } from '@nuxt/content'
import type { FieldError, RegistrationResult } from '~~/shared/registration/process'

/*
 * Formulário de Cadastro, usado pelas duas rotas que existem em volta dele:
 * /cadastrar (sem dados) e /editar/<slug> (com os dados atuais da Iniciativa).
 * As páginas ficam com o roteamento, a busca do conteúdo, o 404 e o SEO; aqui
 * mora tudo o que é formulário, para as duas telas não divergirem.
 */
const props = defineProps<{
  /*
   * Iniciativa em edição. O slug viaja junto dos dados, e não numa prop
   * separada, porque um sem o outro não é estado válido: o envio precisa do
   * slug para virar correção do YAML certo em vez de Iniciativa nova.
   */
  existing?: { slug: string, data: Collections['iniciativas'] } | null
}>()

const t = strings.register

const editing = props.existing ?? null
const editSlug = editing?.slug ?? ''

interface DonationRow {
  type: string
  key: string
  url: string
  source: string
  /** Correção: a Fonte foi limpa porque a chave/url mudou e precisa ser reinformada. */
  sourceCleared?: boolean
}

/** Estado inicial em um lugar só, para o formulário e para o "cadastrar outra". */
function emptyForm() {
  return {
    name: '',
    type: '',
    state: '',
    city: '',
    description: '',
    species: [] as string[],
    needs: [] as string[],
    social: { instagram: '', facebook: '', tiktok: '', youtube: '', x: '', whatsapp: '', site: '', linktree: '' },
    donations: [] as DonationRow[],
  }
}

const form = reactive(emptyForm())

if (editing) {
  const data = editing.data
  form.name = data.nome
  form.type = data.tipo
  form.state = data.estado
  form.city = data.cidade
  form.description = data.descricao
  form.species = [...(data.especies ?? [])]
  form.needs = [...(data.necessidades ?? [])]
  for (const network of Object.keys(form.social) as (keyof typeof form.social)[]) {
    form.social[network] = data.redes?.[network] ?? ''
  }
  form.donations = (data.doacoes ?? []).map((donation) => ({
    type: donation.tipo,
    key: 'chave' in donation ? (donation.chave ?? '') : '',
    url: 'url' in donation ? (donation.url ?? '') : '',
    source: donation.fonte,
  }))
}

/**
 * Regra de correção (ticket 08): quem altera uma chave/url não pode herdar a
 * Fonte antiga em silêncio. Limpamos a Fonte, e o schema exige o preenchimento.
 */
const originalDonations = editing ? form.donations.map((row) => ({ ...row })) : []
if (editing) {
  watch(
    () => form.donations.map((row) => `${row.key}|${row.url}`),
    () => {
      form.donations.forEach((row, i) => {
        const original = originalDonations[i]
        if (!original || row.sourceCleared) return
        const changed = row.key !== original.key || row.url !== original.url
        if (changed && row.source === original.source) {
          row.source = ''
          row.sourceCleared = true
        }
      })
    },
  )
}

/**
 * Imagem: o arquivo escolhido vira WebP quadrado no browser (ver
 * app/utils/image.ts). Em correção, a imagem já publicada aparece como
 * preview e continua valendo enquanto ninguém enviar outra.
 */
const imageBase64 = ref('')
const imagePreview = ref(editing?.data.imagem ?? '')
const imageError = ref('')
const imageBytes = ref(0)
const imageInput = useTemplateRef<HTMLInputElement>('imageInput')
const draggingImage = ref(false)

/** Único caminho de entrada da imagem: vale para o seletor e para o arraste. */
async function acceptImage(file: File) {
  imageError.value = ''
  try {
    const prepared = await prepareImage(file)
    imageBase64.value = prepared.base64
    imagePreview.value = prepared.previewUrl
    imageBytes.value = prepared.bytes
  } catch {
    // Cobre também arquivo que não é imagem: o createImageBitmap recusa antes
    imageError.value = t.imageInvalid
  }
}

function onImagePicked(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) acceptImage(file)
}

function onImageDropped(event: DragEvent) {
  draggingImage.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) acceptImage(file)
}

/** O dragleave também dispara ao passar para um filho: só conta sair da área. */
function onImageDragLeave(event: DragEvent) {
  const entering = event.relatedTarget as Node | null
  if (!entering || !(event.currentTarget as HTMLElement).contains(entering)) {
    draggingImage.value = false
  }
}

function removeImage() {
  imageBase64.value = ''
  imagePreview.value = ''
  imageBytes.value = 0
  imageError.value = ''
  if (imageInput.value) imageInput.value.value = ''
}

const turnstileToken = ref('')
const submitting = ref(false)
const errors = ref<FieldError[]>([])
const prUrl = ref('')

const typeOptions = initiativeTypes.map((v) => ({ label: typeLabels[v], value: v as string }))
const stateOptions = states.map((uf) => ({ label: uf as string, value: uf as string }))
const speciesOptions = speciesValues.map((v) => ({ label: speciesLabels[v], value: v as string }))
const needOptions = needValues.map((v) => ({ label: needLabels[v], value: v as string }))
const donationOptions = donationTypes.map((v) => ({
  label: v === 'pix-na-fonte' ? t.pixAtOfficialChannel : donationLabels[v],
  value: v as string,
}))

const socialFields = t.socialFields

function addDonation() {
  form.donations.push({ type: 'pix-cnpj', key: '', url: '', source: '' })
}

/**
 * Índice da linha cuja chave está sendo editada agora, ou `null`.
 *
 * Existe porque a checagem de chave pessoal só é confiável depois que a pessoa
 * para de digitar: um CNPJ em construção passa por 10 a 13 dígitos, faixa que
 * também é telefone válido, e o aviso vermelho piscava no meio de um CNPJ
 * legítimo. Com foco no campo não acusamos nada; ao sair, avaliamos o que ficou.
 */
const keyBeingTyped = ref<number | null>(null)

function switchToPixAtSource(row: DonationRow) {
  row.type = 'pix-na-fonte'
  row.key = ''
  keyBeingTyped.value = null
}

/**
 * A chave de `pix-cnpj` é formatada enquanto se digita. Fica como veio o valor
 * que não cabe num CNPJ (e-mail, telefone com `+`) e o que já se reconhece como
 * chave pessoal, típico de quem colou: formatar um CPF como se fosse CNPJ
 * esconderia da pessoa exatamente o dado sobre o qual o aviso vai falar.
 */
function onKeyInput(row: DonationRow, value: string) {
  const keepAsTyped = looksLikePersonalPixKey(value.trim()) || !isCnpjMaskable(value)
  row.key = keepAsTyped ? value : formatCnpj(value)
}

/**
 * Avaliamos o valor como está e também sem os separadores da máscara: quem
 * digita um telefone neste campo vê a máscara transformá-lo em algo com cara de
 * CNPJ (`85.988.285/47`), e sem desmascarar o aviso nunca apareceria.
 */
function showsPersonalKeyWarning(row: DonationRow, index: number) {
  if (!usesDonationKey(row.type) || keyBeingTyped.value === index) return false
  const value = row.key.trim()
  return looksLikePersonalPixKey(value) || looksLikePersonalPixKey(cnpjChars(value))
}

/** Monta o objeto no formato de dados publicado (campos em pt-BR). */
function buildInitiative() {
  const redes = Object.fromEntries(
    Object.entries(form.social).filter(([, value]) => value.trim()),
  )
  return {
    nome: form.name.trim(),
    tipo: form.type,
    estado: form.state,
    cidade: form.city.trim(),
    descricao: form.description.trim(),
    ...(form.species.length ? { especies: form.species } : {}),
    ...(form.needs.length ? { necessidades: form.needs } : {}),
    ...(Object.keys(redes).length ? { redes } : {}),
    ...(imagePreview.value && !imageBase64.value && editing?.data.imagem
      ? { imagem: editing.data.imagem }
      : {}),
    ...(form.donations.length
      ? {
          doacoes: form.donations.map((row) => ({
            tipo: row.type,
            ...(usesDonationKey(row.type) ? { chave: row.key.trim() } : {}),
            ...(usesDonationUrl(row.type) ? { url: row.url.trim() } : {}),
            fonte: row.source.trim(),
          })),
        }
      : {}),
  }
}

/** O caminho do campo vem do schema, então é pt-BR (ex.: doacoes.0.chave). */
function errorFor(field: string): string | undefined {
  return errors.value.find((e) => e.field === field)?.message
}

const analytics = useAnalytics()

async function submit() {
  submitting.value = true
  errors.value = []
  try {
    const response = await $fetch<RegistrationResult>('/api/cadastro', {
      method: 'POST',
      body: {
        initiative: buildInitiative(),
        turnstileToken: turnstileToken.value,
        ...(imageBase64.value ? { image: imageBase64.value } : {}),
        ...(editSlug ? { existingSlug: editSlug } : {}),
      },
      ignoreResponseError: true,
    })
    if (response.ok) {
      prUrl.value = response.prUrl
      analytics.trackCadastroSuccess(editSlug ? 'edicao' : 'novo')
    } else {
      errors.value = response.errors
    }
  } catch {
    errors.value = [{ field: '(envio)', message: t.connectionFailure }]
  } finally {
    submitting.value = false
  }
}

/**
 * "Cadastrar outra": em edição basta ir para /cadastrar, que é outra rota e
 * monta o formulário zerado; no cadastro novo a rota não muda, e o reset é
 * manual.
 */
async function startOver() {
  if (editSlug) {
    await navigateTo('/cadastrar')
    return
  }
  Object.assign(form, emptyForm())
  removeImage()
  errors.value = []
  prUrl.value = ''
}
</script>

<template>
  <UContainer class="max-w-2xl py-8 sm:py-12">
    <!-- Sucesso -->
    <div v-if="prUrl" class="flex flex-col items-center gap-4 py-16 text-center">
      <UIcon name="i-lucide-badge-check" class="size-14 text-success" />
      <h1 class="font-display text-3xl font-semibold text-highlighted">{{ t.successTitle }}</h1>
      <p class="max-w-md text-muted">{{ t.successText }}</p>
      <div class="flex gap-2">
        <UButton :to="prUrl" target="_blank" color="primary" icon="i-lucide-external-link">
          {{ t.viewProposal }}
        </UButton>
        <UButton color="neutral" variant="outline" @click="startOver">
          {{ t.newRegistration }}
        </UButton>
      </div>
    </div>

    <template v-else>
      <h1 class="font-display text-3xl font-semibold text-highlighted">
        {{ editSlug ? t.correctionTitle : t.title }}
      </h1>
      <p class="mt-2 text-muted">
        {{ editing ? t.correctionSubtitle(editing.data.nome) : t.subtitle }}
      </p>

      <form class="mt-8 space-y-10" @submit.prevent="submit">
        <!-- Dados -->
        <section class="space-y-4">
          <h2 class="font-display text-xl font-semibold text-highlighted">{{ t.dataSection }}</h2>
          <UFormField :label="t.name" required :error="errorFor('nome')">
            <UInput v-model="form.name" class="w-full" />
          </UFormField>
          <div class="grid gap-4 sm:grid-cols-3">
            <UFormField :label="t.type" required :error="errorFor('tipo')">
              <USelect v-model="form.type" :items="typeOptions" class="w-full" />
            </UFormField>
            <UFormField :label="t.state" required :error="errorFor('estado')">
              <USelect v-model="form.state" :items="stateOptions" class="w-full" />
            </UFormField>
            <UFormField :label="t.city" required :error="errorFor('cidade')">
              <UInput v-model="form.city" class="w-full" />
            </UFormField>
          </div>
          <UFormField :label="t.description" required :help="t.descriptionHelp" :error="errorFor('descricao')">
            <UTextarea v-model="form.description" :rows="3" class="w-full" />
          </UFormField>
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField :label="t.species">
              <UCheckboxGroup v-model="form.species" :items="speciesOptions" />
            </UFormField>
            <UFormField :label="t.needs">
              <UCheckboxGroup v-model="form.needs" :items="needOptions" />
            </UFormField>
          </div>
        </section>

        <!-- Foto -->
        <section class="space-y-4">
          <h2 class="font-display text-xl font-semibold text-highlighted">{{ t.imageSection }}</h2>
          <p class="text-sm text-muted">{{ t.imageHelp }}</p>

          <div
            class="flex items-center gap-4 rounded-lg border border-dashed p-4 transition"
            :class="draggingImage ? 'border-primary bg-primary/5' : 'border-muted'"
            @dragenter.prevent="draggingImage = true"
            @dragover.prevent="draggingImage = true"
            @dragleave="onImageDragLeave"
            @drop.prevent="onImageDropped"
          >
            <InitiativeAvatar :name="form.name || '?'" :image="imagePreview || null" size="lg" />
            <div class="space-y-2">
              <input
                ref="imageInput"
                type="file"
                accept="image/*"
                class="sr-only"
                @change="onImagePicked"
              >
              <div class="flex flex-wrap gap-2">
                <UButton color="neutral" variant="outline" icon="i-lucide-image-plus" @click="imageInput?.click()">
                  {{ imagePreview ? t.imageReplace : t.imageChoose }}
                </UButton>
                <UButton
                  v-if="imagePreview"
                  color="error"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  @click="removeImage"
                >
                  {{ t.imageRemove }}
                </UButton>
              </div>
              <p v-if="draggingImage" class="text-sm font-medium text-primary">
                {{ t.imageDropActive }}
              </p>
              <p v-else-if="imageBytes" class="text-sm text-muted">
                {{ t.imageReady(Math.round(imageBytes / 1024)) }}
              </p>
              <p v-else class="text-sm text-dimmed">{{ t.imageDropHint }}</p>
            </div>
          </div>

          <p v-if="imageError || errorFor('imagem')" class="text-sm text-error">
            {{ imageError || errorFor('imagem') }}
          </p>
          <p class="text-sm text-dimmed">{{ t.imageConsent }}</p>
        </section>

        <!-- Redes -->
        <section class="space-y-4">
          <h2 class="font-display text-xl font-semibold text-highlighted">{{ t.socialSection }}</h2>
          <p class="text-sm text-muted">{{ t.socialHelp }}</p>
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField
              v-for="field in socialFields"
              :key="field.key"
              :label="field.label"
              :help="'help' in field ? field.help : undefined"
              :error="errorFor(`redes.${field.key}`)"
            >
              <UInput v-model="form.social[field.key]" :placeholder="field.placeholder" class="w-full" />
            </UFormField>
          </div>
        </section>

        <!-- Doações -->
        <section class="space-y-4">
          <h2 class="font-display text-xl font-semibold text-highlighted">{{ t.donationsSection }}</h2>
          <UAlert color="warning" variant="subtle" icon="i-lucide-shield-check" :description="t.sourceRule" />

          <div
            v-for="(row, i) in form.donations"
            :key="i"
            class="space-y-3 rounded-lg border border-muted p-4"
          >
            <div class="flex items-end gap-2">
              <UFormField :label="t.donationType" class="flex-1">
                <USelect v-model="row.type" :items="donationOptions" class="w-full" />
              </UFormField>
              <UButton
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                :aria-label="t.removeDonation"
                @click="form.donations.splice(i, 1)"
              />
            </div>

            <UFormField
              v-if="usesDonationKey(row.type)"
              :label="t.donationKey"
              required
              :help="t.donationKeyHelp"
              :error="errorFor(`doacoes.${i}.chave`)"
            >
              <UInput
                :model-value="row.key"
                :placeholder="t.donationKeyPlaceholder"
                class="w-full font-mono"
                @update:model-value="onKeyInput(row, String($event))"
                @focus="keyBeingTyped = i"
                @blur="keyBeingTyped = null"
              />
            </UFormField>

            <UAlert
              v-if="showsPersonalKeyWarning(row, i)"
              color="error"
              variant="subtle"
              icon="i-lucide-shield-check"
              :title="t.personalKeyWarningTitle"
              :description="t.personalKeyWarningText"
              :actions="[{ label: t.usePixAtSource, color: 'error', variant: 'solid', onClick: () => switchToPixAtSource(row) }]"
            />

            <UFormField
              v-if="usesDonationUrl(row.type)"
              :label="t.donationUrl"
              required
              :error="errorFor(`doacoes.${i}.url`)"
            >
              <UInput v-model="row.url" placeholder="https://…" class="w-full" />
            </UFormField>

            <UFormField
              :label="t.donationSource"
              required
              :error="errorFor(`doacoes.${i}.fonte`)"
              :help="row.sourceCleared ? t.sourceClearedWarning : undefined"
            >
              <UInput v-model="row.source" placeholder="https://instagram.com/p/…" class="w-full" />
            </UFormField>
          </div>

          <UButton color="neutral" variant="outline" icon="i-lucide-plus" @click="addDonation">
            {{ t.addDonation }}
          </UButton>
        </section>

        <!-- Erros gerais + anti-spam + envio -->
        <section class="space-y-4">
          <UAlert
            v-if="errors.length"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :title="t.fixErrors"
          >
            <template #description>
              <ul class="list-inside list-disc">
                <li v-for="error in errors" :key="error.field">
                  <strong>{{ error.field }}</strong>: {{ error.message }}
                </li>
              </ul>
            </template>
          </UAlert>

          <UAlert
            color="neutral"
            variant="subtle"
            icon="i-lucide-history"
            :title="t.publicNoticeTitle"
            :description="t.publicNoticeText"
          />
          <NuxtLink to="/privacidade" class="inline-block text-sm text-primary underline">
            {{ t.publicNoticeLink }}
          </NuxtLink>

          <NuxtTurnstile v-model="turnstileToken" />

          <!-- Sem token o envio só voltaria 403: melhor travar o botão e dizer por quê -->
          <UButton
            type="submit"
            size="xl"
            color="primary"
            :loading="submitting"
            :disabled="!turnstileToken"
            icon="i-lucide-send"
          >
            {{ submitting ? t.submitting : t.submit }}
          </UButton>
          <p v-if="!turnstileToken" class="text-sm text-dimmed">{{ t.turnstilePending }}</p>
        </section>
      </form>
    </template>
  </UContainer>
</template>
