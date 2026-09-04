import { cnpjChars } from '../../shared/cnpj'
import type { Donation } from '../../shared/schema/initiative'

/**
 * BR Code: o "PIX Copia e Cola" que também vira QR Code na tela de doação.
 *
 * O código é montado aqui, no navegador, a partir da mesma chave já publicada
 * na página (que por sua vez só entra no site com Fonte, ver CONTEXT.md).
 * Nada é gerado por serviço externo: mandar a chave de uma Iniciativa para uma
 * API de terceiros para desenhar um QR seria confiar a parte mais sensível do
 * site a alguém de fora, e ainda quebraria a doação se o serviço saísse do ar.
 *
 * Formato: EMV QR Code MPM estático (BCB, manual de padrões do Pix), campos
 * `id + tamanho em 2 dígitos + valor`, sem valor definido (o doador escolhe).
 */

/** Tamanho máximo da chave para o campo 26 (99 chars) caber com o GUI do Pix. */
const maxKeyLength = 77

const merchantNameLength = 25
const merchantCityLength = 15

const field = (id: string, value: string) =>
  `${id}${String(value.length).padStart(2, '0')}${value}`

/**
 * O BR Code só aceita ASCII: acento vira letra sem acento e o resto some,
 * senão o tamanho declarado (em bytes) não bate com o texto e o app do banco
 * recusa o código.
 */
function ascii(value: string, maxLength: number): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
    .slice(0, maxLength)
    .trim()
}

/**
 * CRC-16/CCITT-FALSE sobre todo o payload, incluindo o "6304" final.
 * Valor de conferência do algoritmo: crc16('123456789') === '29B1'.
 */
export function crc16(payload: string): string {
  let crc = 0xFFFF
  for (const byte of new TextEncoder().encode(payload)) {
    crc ^= byte << 8
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/**
 * Chave no formato que o app do banco espera, que nem sempre é o formato
 * publicado: CNPJ aparece pontuado na página e vai sem separador no BR Code.
 * Tiramos os separadores, e não tudo o que não é dígito, porque o CNPJ
 * alfanumérico tem letra nas 12 primeiras posições (ver shared/cnpj.ts).
 *
 * Só o CNPJ é publicado como chave (ver docs/adr/0006), então só ele tem
 * BR Code: doação de pessoa física é `pix-na-fonte` e retorna `undefined`.
 */
export function pixKeyOf(donation: Donation): string | undefined {
  return donation.tipo === 'pix-cnpj' ? cnpjChars(donation.chave) : undefined
}

/**
 * Monta o BR Code estático. Retorna `null` quando a chave não cabe no padrão:
 * melhor não oferecer QR do que oferecer um que o app do banco recusa.
 */
export function pixBrCode(input: { key: string, name: string, city: string }): string | null {
  const key = input.key.trim()
  if (!key || key.length > maxKeyLength) return null

  const merchantAccount = field('00', 'br.gov.bcb.pix') + field('01', key)

  const payload
    = field('00', '01')
      + field('26', merchantAccount)
      + field('52', '0000')
      + field('53', '986')
      + field('58', 'BR')
      + field('59', ascii(input.name, merchantNameLength) || 'RECEBEDOR')
      + field('60', ascii(input.city, merchantCityLength) || 'BRASIL')
      + field('62', field('05', '***'))

  const withCrcId = `${payload}6304`
  return withCrcId + crc16(withCrcId)
}

/** BR Code de uma doação, quando ela é PIX com chave publicada. */
export function pixBrCodeOf(donation: Donation, name: string, city: string): string | null {
  const key = pixKeyOf(donation)
  return key ? pixBrCode({ key, name, city }) : null
}
