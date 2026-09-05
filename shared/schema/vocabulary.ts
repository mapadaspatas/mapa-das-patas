/**
 * Vocabulário da Iniciativa: os valores fechados que o schema valida e que a
 * interface exibe. Mora fora de `initiative.ts` por causa do peso: aquele
 * arquivo carrega o zod e a lista de municípios do IBGE, e as páginas de
 * navegação (listagem, página da Iniciativa, confirmação) só precisam destas
 * constantes. Importar o schema numa página traz os dois de carona, para
 * validação que só roda na Function e na CI.
 *
 * Sem imports, de propósito: é isto que mantém o arquivo leve.
 */

export const initiativeTypes = [
  'ong',
  'associacao',
  'protetor-independente',
  'projeto-informal',
  'abrigo-santuario',
] as const

export const species = ['caes', 'gatos', 'cavalos', 'silvestres', 'outros'] as const

export const needs = [
  'racao',
  'lar-temporario',
  'voluntarios',
  'castracao',
  'medicamentos',
] as const

export const states = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const

export const donationTypes = [
  'pix-cnpj',
  'pix-na-fonte',
  'vaquinha',
  'apoio-recorrente',
  'paypal',
] as const

export type DonationType = (typeof donationTypes)[number]

/**
 * Forma de cada tipo de doação em um lugar só: qual campo ele publica e se é
 * PIX. O formulário lia isso de uma lista de prefixos "pix-" própria, que podia
 * divergir do schema em silêncio (ticket 11).
 *
 * A autoridade da validação continua sendo o `donationSchema` abaixo; isto
 * descreve a mesma forma para a UI, e o `satisfies` garante que nenhum tipo
 * novo entre em `donationTypes` sem passar por aqui.
 */
export const donationTypeMetadata = {
  'pix-cnpj': { field: 'key', isPix: true },
  // A chave não é publicada: o site aponta para a Fonte (pessoa física)
  'pix-na-fonte': { field: 'none', isPix: true },
  'vaquinha': { field: 'url', isPix: false },
  'apoio-recorrente': { field: 'url', isPix: false },
  'paypal': { field: 'url', isPix: false },
} as const satisfies Record<DonationType, { field: 'key' | 'url' | 'none', isPix: boolean }>

/** Este tipo de doação publica uma chave PIX? */
export const usesDonationKey = (type: string) =>
  donationTypeMetadata[type as DonationType]?.field === 'key'

/** Este tipo de doação publica um link de campanha externa? */
export const usesDonationUrl = (type: string) =>
  donationTypeMetadata[type as DonationType]?.field === 'url'
