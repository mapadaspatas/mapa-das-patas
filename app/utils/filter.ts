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
    // Mesmo escape explícito de shared/slug.ts e app/utils/pix.ts
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function filterInitiatives<T extends FilterableInitiative>(
  initiatives: readonly T[],
  filters: Filters,
): T[] {
  const search = filters.search ? normalizeText(filters.search) : undefined

  return initiatives.filter((initiative) => {
    if (filters.state && initiative.estado !== filters.state) return false
    if (filters.city && initiative.cidade !== filters.city) return false
    if (filters.type && initiative.tipo !== filters.type) return false
    if (filters.species && !initiative.especies?.includes(filters.species)) return false
    if (filters.need && !initiative.necessidades?.includes(filters.need)) return false
    if (search) {
      const target = normalizeText(`${initiative.nome} ${initiative.cidade}`)
      if (!target.includes(search)) return false
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
