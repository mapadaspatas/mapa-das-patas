/**
 * Fallback visual das Iniciativas sem imagem enviada.
 *
 * A maioria dos Cadastros não vem com foto, e um espaço vazio no Card faz o
 * diretório parecer abandonado. As iniciais dão identidade sem inventar nada
 * sobre a Iniciativa, e a cor é derivada do nome para ficar estável entre
 * builds (nada de aleatoriedade em site estático).
 */

/** Palavras que não carregam identidade e não viram inicial. */
const skipWords = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'em', 'para'])

export function initialsOf(name: string): string {
  const words = name
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((word) => word.length > 0 && !skipWords.has(word.toLowerCase()))

  const source = words.length > 0 ? words : [name.trim()]
  const initials = source.slice(0, 2).map((word) => word[0] ?? '')
  return initials.join('').toUpperCase() || '?'
}

/** Paleta fechada, alinhada aos tokens do tema, escolhida de forma determinística. */
const avatarColors = [
  'bg-primary/15 text-primary',
  'bg-secondary/15 text-secondary',
  'bg-success/15 text-success',
  'bg-warning/15 text-warning',
  'bg-info/15 text-info',
] as const

export function avatarColorOf(name: string): string {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)!) % 100000
  return avatarColors[hash % avatarColors.length]!
}
