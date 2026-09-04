/**
 * Token de confirmação: `base64url(slug|canal|expira).base64url(HMAC-SHA256)`.
 *
 * O Moderador emite um destes por Iniciativa e cola o link na mensagem que já
 * manda hoje (ver `docs/mensagens-para-iniciativas.md`). O link só chega pelo
 * canal oficial que a página publica, então quem clicou tinha acesso àquele
 * canal — é a mesma prova de identidade de um link de confirmação por e-mail,
 * sem precisar de e-mail (o projeto não guarda o de ninguém).
 *
 * O que ele prova é acesso ao canal, e nada além disso: nenhum dado da
 * Iniciativa vem do cliente, só o slug assinado. Web Crypto de propósito, para
 * o mesmo arquivo rodar no Node (script e dev server) e no Worker (Function).
 */

export interface ConfirmationToken {
  /** Nome do arquivo YAML da Iniciativa, sem `.yml`. */
  slug: string
  /** Meio pelo qual o link foi enviado; vira `verificado.canal` no YAML. */
  canal: string
  /** Epoch em segundos: o instante em que o link deixa de valer. */
  expiresAt: number
}

/**
 * Validade padrão do link. Trinta dias cobrem com folga a retomada de duas
 * semanas prevista em `docs/mensagens-para-iniciativas.md`.
 */
export const tokenLifetimeDays = 30

/** Instante de expiração em epoch de segundos, a partir de agora. */
export const expiryFromNow = (days = tokenLifetimeDays, now = Date.now()) =>
  Math.floor(now / 1000) + days * 86400

const slugPattern = /^[a-z0-9-]+$/

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function keyFrom(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

/**
 * Emite o token. Lança em vez de devolver erro porque quem chama é o script do
 * Moderador, na linha de comando: link torto emitido em silêncio seria enviado
 * numa DM e só falharia do outro lado.
 */
export async function mint(token: ConfirmationToken, secret: string): Promise<string> {
  if (!secret) throw new Error('CONFIRMATION_SECRET não configurado')
  if (!slugPattern.test(token.slug)) {
    throw new Error(`slug inválido: "${token.slug}" (use o nome do arquivo YAML, sem .yml)`)
  }
  // A barra vertical separa os campos do payload: proibida no canal, não há
  // ambiguidade a resolver na leitura.
  if (!token.canal.trim() || token.canal.includes('|')) {
    throw new Error('canal precisa ter texto e não pode conter "|"')
  }
  if (!Number.isInteger(token.expiresAt)) throw new Error('expiresAt precisa ser epoch em segundos')

  const payload = new TextEncoder().encode(`${token.slug}|${token.canal}|${token.expiresAt}`)
  const signature = await crypto.subtle.sign('HMAC', await keyFrom(secret), payload)
  return `${toBase64Url(payload)}.${toBase64Url(new Uint8Array(signature))}`
}

/**
 * Devolve o conteúdo do token, ou `undefined` para qualquer reprovação —
 * assinatura errada, payload adulterado, validade vencida ou token torto.
 * Um único `undefined` de propósito: distinguir "expirado" de "forjado" na
 * resposta ensinaria a quem forja qual metade acertou.
 *
 * A comparação da assinatura é a do `crypto.subtle.verify`, que é a primitiva
 * de tempo constante do Web Crypto.
 */
export async function verify(
  raw: string,
  secret: string,
  now = Date.now(),
): Promise<ConfirmationToken | undefined> {
  if (!secret || !raw) return undefined

  const parts = raw.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return undefined

  let payload: Uint8Array<ArrayBuffer>
  let signature: Uint8Array<ArrayBuffer>
  let valid: boolean
  try {
    payload = fromBase64Url(parts[0])
    signature = fromBase64Url(parts[1])
    valid = await crypto.subtle.verify('HMAC', await keyFrom(secret), signature, payload)
  } catch {
    return undefined
  }
  if (!valid) return undefined

  const fields = new TextDecoder().decode(payload).split('|')
  if (fields.length !== 3) return undefined
  const [slug, canal, expiry] = fields as [string, string, string]

  const seconds = Number(expiry)
  if (!slugPattern.test(slug) || !canal || !Number.isInteger(seconds)) return undefined
  if (seconds * 1000 <= now) return undefined

  return { slug, canal, expiresAt: seconds }
}
