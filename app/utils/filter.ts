/**
 * Filtro e busca da listagem de Iniciativas: funções puras (costura testada).
 * A página apenas as consome; nada de lógica de filtro em componentes.
 */

/** Campos mínimos que a listagem precisa (o item do @nuxt/content usa null para ausentes). */
export interface FilterableInitiative {
  nome: string
  estado: string
  cidade: string
  tipo: string
  especies?: readonly string[] | null
  necessidades?: readonly string[] | null
  /** Só o handle do Instagram entra na busca; as outras redes são URL, que ninguém digita para procurar. */
  redes?: { readonly instagram?: string | null } | null
}

export interface Filters {
  search?: string
  state?: string
  city?: string
  type?: string
  species?: string
  need?: string
}

export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    // Escape explícito em vez da marca combinante literal: ela é invisível no
    // fonte, e um salvamento em encoding errado quebraria a busca sem aviso.
    .replace(/[\u0300-\u036f]/g, '')
    /*
     * Apóstrofo, hífen e ponto somem dos dois lados da comparação, sem virar
     * espaço. São 46 municípios do IBGE com apóstrofo (`Santa Bárbara d'Oeste`,
     * `Sant'Ana do Livramento`, `Pau D'Arco`) e quem procura digita "santa
     * barbara doeste". O apóstrofo tipográfico (’) entra na lista porque é o
     * que o teclado do celular emite no lugar do reto. Sumir em vez de virar
     * espaço também é o que faz o handle `gatil.sao.joao` ser achado inteiro.
     */
    .replace(/['\u2019.\-]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * O que a busca compara: nome, cidade, estado e o handle do Instagram, que é
 * como muita gente conhece a Iniciativa. A descrição fica de fora de propósito:
 * é texto livre e longo, e com a busca exigindo todas as palavras ela alargaria
 * o resultado a ponto de quase tudo casar com quase qualquer termo.
 */
function searchTarget(initiative: FilterableInitiative): string {
  const handle = initiative.redes?.instagram
  return normalizeText(
    `${initiative.nome} ${initiative.cidade} ${initiative.estado}${handle ? ` @${handle}` : ''}`,
  )
}

export function filterInitiatives<T extends FilterableInitiative>(
  initiatives: readonly T[],
  filters: Filters,
): T[] {
  /*
   * O termo quebra em palavras e todas precisam aparecer, em qualquer ordem:
   * "gatos curitiba" e "curitiba gatos" acham a mesma Iniciativa, porque quem
   * procura não tem como adivinhar a ordem em que os campos foram concatenados.
   * Termo vazio (ou só espaço) não deixa palavra nenhuma e não filtra nada.
   */
  const terms = filters.search ? normalizeText(filters.search).split(/\s+/).filter(Boolean) : []

  return initiatives.filter((initiative) => {
    if (filters.state && initiative.estado !== filters.state) return false
    if (filters.city && initiative.cidade !== filters.city) return false
    if (filters.type && initiative.tipo !== filters.type) return false
    if (filters.species && !initiative.especies?.includes(filters.species)) return false
    if (filters.need && !initiative.necessidades?.includes(filters.need)) return false
    if (terms.length) {
      const target = searchTarget(initiative)
      if (!terms.every((term) => target.includes(term))) return false
    }
    return true
  })
}

export function citiesOfState(
  initiatives: readonly FilterableInitiative[],
  state: string,
): string[] {
  const cities = new Set(
    initiatives.filter((i) => i.estado === state).map((i) => i.cidade),
  )
  return [...cities].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}
