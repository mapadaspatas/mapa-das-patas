/**
 * Handle do Instagram em forma canônica, num lugar só: o formulário de Cadastro
 * traduz com isto o que a pessoa digitou, e a importação da planilha extrai com
 * isto o handle da coluna de perfil.
 *
 * `redes.instagram` guarda handle, e não URL como as outras redes (ver
 * shared/schema/initiative.ts): assim `nome`, `@nome`,
 * `https://www.instagram.com/nome/` e `…/nome/?igsh=…` são um valor só, e é
 * desse valor que a importação deriva a Fonte. Quem preenche o formulário,
 * porém, cola o link do app: sem esta tradução o cadastro descobre a diferença
 * na recusa da validação. A autoridade continua sendo o schema.
 */

/** Handle possível: o mesmo formato que o schema aceita em `redes.instagram`. */
const handlePattern = /^[A-Za-z0-9._]{1,30}$/

/** Endereço com host e caminho, com ou sem protocolo e `www.`. */
const urlPattern = /^(?:https?:\/\/)?(?:www\.)?([a-z0-9.-]+\.[a-z]{2,})\/(.*)$/i

/**
 * Trecho do caminho que não é perfil. `instagram.com/p/DQ1x…` é o link de um
 * post e o handle não está nele: sem esta lista viraria o handle `p`, um link
 * quebrado publicado em silêncio. Devolver `undefined` faz o schema recusar e
 * quem preencheu corrigir, que é o desfecho honesto.
 */
const nonProfilePaths = new Set(['p', 'reel', 'reels', 'stories', 'share', 'explore', 'tv', 'accounts'])

export function instagramHandle(value: string): string | undefined {
  const trimmed = value.trim()
  const url = urlPattern.exec(trimmed)

  /*
   * Link de outra rede colado no campo do Instagram não vira handle: o host
   * `facebook.com` casa com o formato de handle (letras e ponto), e sem esta
   * recusa `facebook.com/nome` seria guardado como o handle `facebook.com`.
   */
  if (url && url[1]?.toLowerCase() !== 'instagram.com') return undefined

  // Sem host, o valor ainda pode ser `@nome` ou os dois handles que a planilha
  // às vezes empacota na mesma célula (`@a/@b`): fica o primeiro.
  const path = url?.[2] ?? trimmed
  const handle = path.split(/[?#]/)[0]?.split('/')[0]?.replace(/^@/, '') ?? ''

  if (!handlePattern.test(handle) || nonProfilePaths.has(handle.toLowerCase())) return undefined
  return handle
}
