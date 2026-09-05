import { z } from 'zod'
import { isCnpj } from '../cnpj.ts'
import { municipiosPorUf } from '../municipios.ts'
import { initiativeTypes, needs, species, states } from './vocabulary.ts'

/**
 * Schema da Iniciativa: costura central do projeto (ver spec e CONTEXT.md).
 * Reutilizado pela coleção do @nuxt/content, pela validação de CI,
 * pelo script de importação e pela Function de Cadastro.
 *
 * Os nomes dos campos seguem o formato de dados publicado (pt-BR, igual aos
 * YAMLs em content/iniciativas); o código em volta deles é em inglês.
 */

/*
 * O vocabulário sai por aqui também, para quem já valida ter um import só. Mas
 * quem só precisa das constantes (uma página, um componente) deve importar
 * `./vocabulary.ts` direto: este arquivo puxa o zod e os 5.571 municípios do
 * IBGE junto, e nenhuma tela de navegação usa nada disso.
 */
export * from './vocabulary.ts'

/**
 * Municípios da UF, em ordem alfabética, direto da lista do IBGE (ver
 * `scripts/build-municipios.ts`). UF que não existe devolve lista vazia, para
 * quem chama não ter que checar antes.
 */
export const citiesOf = (uf: string): readonly string[] =>
  municipiosPorUf[uf as keyof typeof municipiosPorUf] ?? []

/**
 * Política de dados pessoais (ver CONTEXT.md e docs/adr/0006):
 * a única chave PIX publicada é o CNPJ, dado empresarial público. Chave de
 * pessoa física — CPF, e-mail ou telefone — nunca é republicada: a doação
 * entra como pix-na-fonte e o site aponta para o canal oficial onde ela está.
 */
const looksLikeCpf = (value: string) =>
  /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value) || /^\d{11}$/.test(value)

const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

/**
 * Telefone com ou sem DDI, formatado ou cru. O teto de 13 dígitos é o que
 * separa telefone de CNPJ cru (14): sem ele, um CNPJ válido cairia aqui.
 */
const looksLikePhone = (value: string) => {
  const digits = value.replace(/\D/g, '')
  return /^[\d\s()+-]+$/.test(value.trim()) && digits.length >= 10 && digits.length <= 13
}

/**
 * Chave de doação que identifica uma pessoa física. O formulário usa isto para
 * oferecer `pix-na-fonte` na hora da digitação, em vez de deixar a pessoa
 * descobrir a recusa só no envio. A autoridade continua sendo o schema abaixo.
 */
export const looksLikePersonalPixKey = (value: string) =>
  looksLikeCpf(value) || looksLikeEmail(value) || looksLikePhone(value)

const cnpj = z
  .string()
  .refine((value) => !looksLikePersonalPixKey(value), {
    message: 'chave de pessoa física não é publicada: use o tipo pix-na-fonte (ver CONTEXT.md)',
  })
  .refine(isCnpj, {
    message: 'chave de pix-cnpj deve ser um CNPJ, numérico ou alfanumérico '
      + '(00.000.000/0000-00, 00.AAA.000/0001-00 ou as 14 posições sem separador)',
  })

const source = z.url({ protocol: /^https?$/ }).describe(
  'Fonte: link público oficial da Iniciativa onde a chave aparece, obrigatório em toda doação',
)

const donationUrl = z.url({ protocol: /^https?$/ })

const donationSchema = z.discriminatedUnion('tipo', [
  z.strictObject({ tipo: z.literal('pix-cnpj'), chave: cnpj, fonte: source }),
  // Pessoa física: a chave não é publicada, o site aponta para a Fonte oficial
  z.strictObject({ tipo: z.literal('pix-na-fonte'), fonte: source }),
  z.strictObject({ tipo: z.literal('vaquinha'), url: donationUrl, fonte: source }),
  z.strictObject({ tipo: z.literal('apoio-recorrente'), url: donationUrl, fonte: source }),
  z.strictObject({ tipo: z.literal('paypal'), url: donationUrl, fonte: source }),
])

const httpUrl = z.url({ protocol: /^https?$/ })

const socialSchema = z.strictObject({
  instagram: z
    .string()
    .regex(/^[A-Za-z0-9._]{1,30}$/, 'handle do Instagram sem @ e sem URL')
    .optional(),
  facebook: httpUrl.optional(),
  tiktok: httpUrl.optional(),
  youtube: httpUrl.optional(),
  x: httpUrl.optional(),
  whatsapp: z
    .string()
    .refine((value) => /^\+55\d{10,11}$/.test(value) || /^https:\/\/wa\.me\//.test(value), {
      message: 'whatsapp deve ser telefone +55… ou link https://wa.me/…',
    })
    .optional(),
  site: httpUrl.optional(),
  linktree: httpUrl.optional(),
})

/**
 * Imagem da Iniciativa: arquivo versionado no repositório junto com o YAML,
 * enviado pela própria Iniciativa no Cadastro. Nunca uma URL externa: link de
 * CDN de rede social expira em horas e quebra o site (ver docs/adr/0003).
 */
export const imagePathOf = (slug: string) => `/imagens/iniciativas/${slug}.webp`

const imagePath = z
  .string()
  .regex(
    /^\/imagens\/iniciativas\/[a-z0-9-]+\.webp$/,
    'imagem deve ser um arquivo /imagens/iniciativas/<slug>.webp versionado no repositório',
  )

const verificationSchema = z.union([
  z.literal(false),
  z.strictObject({
    em: z.iso.date(),
    canal: z.string().min(1),
  }),
])

export const initiativeSchema = z.object({
  nome: z.string().min(1),
  tipo: z.enum(initiativeTypes),
  estado: z.enum(states),
  cidade: z.string().min(1),
  descricao: z.string().min(1),
  especies: z.array(z.enum(species)).optional(),
  necessidades: z.array(z.enum(needs)).optional(),
  doacoes: z.array(donationSchema).optional(),
  redes: socialSchema.optional(),
  imagem: imagePath.optional(),
  verificado: verificationSchema.optional(),
})
  /*
   * Cidade é município do IBGE, e do estado informado. A regra é aqui, e não só
   * no formulário, porque o campo também chega por PR direto no YAML: sem ela,
   * a mesma cidade entra escrita de três jeitos ("Sao Paulo", "São Paulo ",
   * "Vila Prudente") e o filtro da listagem, que monta as opções a partir do que
   * foi publicado, passa a oferecer as três como lugares diferentes.
   *
   * Ela roda depois dos campos, então `estado` já é uma UF válida aqui.
   */
  .refine((initiative) => citiesOf(initiative.estado).includes(initiative.cidade), {
    path: ['cidade'],
    message: 'cidade deve ser um município do estado informado, com o nome como o IBGE escreve (bairro e distrito não valem)',
  })

export type Donation = z.infer<typeof donationSchema>

export type Initiative = z.infer<typeof initiativeSchema>
