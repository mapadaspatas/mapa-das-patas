import type { Initiative } from '../../shared/schema/initiative'
import { generateSlug } from '../../shared/slug'

export { generateSlug }

/**
 * Transformação pura das linhas da planilha original em Iniciativas.
 * Aplica as regras de dados pessoais da spec/CONTEXT.md:
 * - CNPJ publica direto, por ser dado empresarial público;
 * - chave de pessoa física (CPF, e-mail, telefone) NUNCA é republicada e vira
 *   pix-na-fonte, apontando para o canal oficial (ver docs/adr/0006);
 * - valor que não casa com nenhum formato conhecido é reportado.
 */

export interface SpreadsheetRow {
  state: string
  city: string
  name: string
  instagram: string
  pixDonation: string
  otherLinks: string
}

export interface RowResult {
  initiative: Initiative
  warnings: string[]
}

export interface ImportResult extends RowResult {
  slug: string
}

const patterns = {
  cnpj: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/,
  cpf: /^(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  scientificNotation: /^\d+(\.\d+)?E\d+$/i,
  phone: /^[\d\s()+-]{8,}$/,
}

function inferType(name: string): Initiative['tipo'] {
  const lower = name.toLowerCase()
  if (/\bprotetora?\b|\bcuidadora?\b/.test(lower)) return 'protetor-independente'
  if (/\bassocia[çc][aã]o\b/.test(lower)) return 'associacao'
  if (/\binstituto\b|\bong\b/.test(lower)) return 'ong'
  if (/\babrigo\b|\bgatil\b|\bsantu[áa]rio\b|\brecanto\b|\bmans[ãa]o\b|\bcasa\b/.test(lower))
    return 'abrigo-santuario'
  return 'projeto-informal'
}

function inferSpecies(name: string, otherLinks: string): Initiative['especies'] {
  const text = `${name} ${otherLinks}`.toLowerCase()
  const found: NonNullable<Initiative['especies']> = []
  if (/gat|felin|miau|\bcats?\b/.test(text)) found.push('gatos')
  if (/c[ãa]es|\bc[ãa]o\b|canin|au ?au|\bdogs?\b/.test(text)) found.push('caes')
  return found.length > 0 ? found : undefined
}

function firstHandle(instagram: string): string | undefined {
  const first = instagram.split('/')[0]?.trim().replace(/^@/, '')
  return first && /^[A-Za-z0-9._]{1,30}$/.test(first) ? first : undefined
}

function fullUrl(link: string): string {
  return /^https?:\/\//.test(link) ? link : `https://${link}`
}

function classifyLink(link: string):
  | { kind: 'linktree' | 'facebook' | 'site' }
  | { kind: 'apoio-recorrente' | 'vaquinha'; url: string } {
  const withoutProtocol = link.replace(/^https?:\/\//, '')
  if (/^(linktr\.ee|linkbio\.co|bio\.site|linkme\.bio)\//.test(withoutProtocol)) return { kind: 'linktree' }
  if (/^apoia\.se\//.test(withoutProtocol)) return { kind: 'apoio-recorrente', url: fullUrl(link) }
  if (/^(vakinha\.|vaquinha\.)/.test(withoutProtocol)) return { kind: 'vaquinha', url: fullUrl(link) }
  if (/^(www\.)?facebook\.com\//.test(withoutProtocol)) return { kind: 'facebook' }
  return { kind: 'site' }
}

export function transformRow(row: SpreadsheetRow): RowResult {
  const warnings: string[] = []
  const handle = firstHandle(row.instagram)
  if (row.instagram && !handle) warnings.push(`instagram ilegível: "${row.instagram}"`)
  if (row.instagram.includes('/')) warnings.push(`instagram com múltiplos handles: "${row.instagram}", mantido o primeiro`)

  const source = handle ? `https://instagram.com/${handle}` : undefined

  const redes: NonNullable<Initiative['redes']> = {}
  if (handle) redes.instagram = handle

  const doacoes: NonNullable<Initiative['doacoes']> = []
  let needsPixAtSource = false

  for (const rawValue of row.pixDonation.split(/\s+ou\s+/)) {
    const value = rawValue.trim()
    if (!value) continue

    if (!source) {
      warnings.push(`chave "${value}" descartada: Iniciativa sem Fonte (sem perfil oficial conhecido)`)
      continue
    }

    if (patterns.cnpj.test(value)) {
      doacoes.push({ tipo: 'pix-cnpj', chave: value, fonte: source })
    } else if (
      patterns.cpf.test(value)
      || patterns.email.test(value)
      || patterns.scientificNotation.test(value)
      || patterns.phone.test(value)
    ) {
      /*
       * Chave de pessoa física: o site não a republica, aponta para a Fonte.
       * Sem aviso de conferência porque não há o que conferir — nenhum desses
       * valores volta a ser chave publicada depois (ver docs/adr/0006).
       */
      needsPixAtSource = true
    } else if (/^(linktr\.ee|linkbio\.co|bio\.site|linkme\.bio|apoia\.se|vakinha\.|www\.|https?:\/\/)/.test(value)) {
      row = { ...row, otherLinks: `${row.otherLinks} ${value}`.trim() }
    } else {
      needsPixAtSource = true
      warnings.push(`valor de doação não classificado: "${value}", conferir manualmente`)
    }
  }

  for (const rawLink of row.otherLinks.split(/\s+/)) {
    const link = rawLink.trim().replace(/^https?:\/\//, '')
    if (!link || !link.includes('.') || !/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(link)) continue
    const classified = classifyLink(link)
    if (classified.kind === 'linktree') redes.linktree = fullUrl(link)
    else if (classified.kind === 'facebook') redes.facebook = fullUrl(link)
    else if (classified.kind === 'site') redes.site = fullUrl(link)
    else if (source) doacoes.push({ tipo: classified.kind, url: classified.url, fonte: source })
    else warnings.push(`link de doação "${link}" descartado: Iniciativa sem Fonte`)
  }

  if (needsPixAtSource && source && !doacoes.some((d) => d.tipo === 'pix-na-fonte')) {
    doacoes.push({ tipo: 'pix-na-fonte', fonte: source })
  }

  const species = inferSpecies(row.name, row.otherLinks)

  const initiative: Initiative = {
    nome: row.name.trim(),
    tipo: inferType(row.name),
    estado: row.state.trim() as Initiative['estado'],
    cidade: row.city.trim(),
    descricao:
      `Iniciativa de proteção animal em ${row.city.trim()} (${row.state.trim()}). ` +
      'Informações reunidas pela comunidade a partir de fontes públicas. Ajude pelos canais oficiais.',
    ...(species ? { especies: species } : {}),
    ...(Object.keys(redes).length > 0 ? { redes } : {}),
    ...(doacoes.length > 0 ? { doacoes } : {}),
  }

  return { initiative, warnings }
}

export function transformSpreadsheet(rows: SpreadsheetRow[]): ImportResult[] {
  const used = new Set<string>()
  return rows.map((row) => {
    const result = transformRow(row)
    let slug = generateSlug(row.name)
    if (used.has(slug)) slug = `${slug}-${generateSlug(row.city)}`
    used.add(slug)
    return { ...result, slug }
  })
}
