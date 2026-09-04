/** Slug canônico de uma Iniciativa: minúsculo, sem acentos, hífens. */
export function generateSlug(name: string): string {
  return name
    .normalize('NFD')
    // Escape explícito em vez da marca combinante literal: ela é invisível no
    // fonte, e um salvamento em encoding errado quebraria o slug (que é caminho
    // de arquivo no repositório) sem ninguém perceber.
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
