import { donationPlatformOf } from './donation-platforms'
import type { Donation, DonationType, Initiative } from '../../shared/schema/initiative'

/** Rótulos pt-BR dos valores canônicos do domínio (ver CONTEXT.md). */

export const typeLabels: Record<Initiative['tipo'], string> = {
  'ong': 'ONG',
  'associacao': 'Associação',
  'protetor-independente': 'Protetor independente',
  'projeto-informal': 'Projeto informal',
  'abrigo-santuario': 'Abrigo/Santuário',
}

/**
 * Classe que publica `--tipo` e `--tipo-bg` para os filhos (ver main.css).
 * É um Record, e não um template `tipo-${valor}`, para que um Tipo novo no
 * schema quebre aqui — junto com o rótulo dele — e não silenciosamente perca a cor.
 */
export const typeColorClass: Record<Initiative['tipo'], string> = {
  'ong': 'tipo-ong',
  'associacao': 'tipo-associacao',
  'protetor-independente': 'tipo-protetor-independente',
  'projeto-informal': 'tipo-projeto-informal',
  'abrigo-santuario': 'tipo-abrigo-santuario',
}

export const speciesLabels: Record<NonNullable<Initiative['especies']>[number], string> = {
  caes: 'Cães',
  gatos: 'Gatos',
  cavalos: 'Cavalos',
  silvestres: 'Silvestres',
  outros: 'Outros animais',
}

/**
 * Tipo e Espécie ditos como frase, e não como duas fileiras de chips: o Card
 * mostra "Abrigo/Santuário para cães e gatos" no lugar de dois blocos em caixa
 * alta. Espécie está preenchida em 31 das 68 Iniciativas, então a frase precisa
 * ficar de pé só com o Tipo, que está em 68.
 */
export function kindSentence(
  type: Initiative['tipo'],
  species?: readonly NonNullable<Initiative['especies']>[number][] | null,
): string {
  const label = typeLabels[type]
  const animals = (species ?? []).map((item) => speciesLabels[item].toLocaleLowerCase('pt-BR'))
  if (!animals.length) return label
  const last = animals[animals.length - 1]
  const list = animals.length === 1 ? last : `${animals.slice(0, -1).join(', ')} e ${last}`
  return `${label} para ${list}`
}

export const needLabels: Record<NonNullable<Initiative['necessidades']>[number], string> = {
  'racao': 'Ração',
  'lar-temporario': 'Lar temporário',
  'voluntarios': 'Voluntários',
  'castracao': 'Castração',
  'medicamentos': 'Medicamentos',
}

export const donationLabels: Record<DonationType, string> = {
  'pix-cnpj': 'PIX · CNPJ',
  'pix-na-fonte': 'PIX',
  'vaquinha': 'Vaquinha',
  'apoio-recorrente': 'Apoio recorrente',
  'paypal': 'PayPal',
}

/**
 * Título da forma de doação, com a plataforma quando o link é de uma que
 * reconhecemos: "Vaquinha · Vakinha", do mesmo jeito que "PIX · CNPJ" já diz de
 * que chave se trata. Quem doa fica sabendo para onde o botão leva antes de
 * clicar, que é a mesma promessa que a Fonte cumpre para a chave PIX.
 *
 * Plataforma que não reconhecemos volta só o rótulo (o link aparece por extenso
 * logo abaixo dele, de qualquer jeito), e nome igual ao rótulo não vira
 * "PayPal · PayPal".
 */
export function donationTitle(donation: Donation): string {
  const label = donationLabels[donation.tipo]
  const platform = 'url' in donation ? donationPlatformOf(donation.url) : undefined
  return !platform || platform.name === label ? label : `${label} · ${platform.name}`
}

/**
 * Forma curta de uma Fonte, para caber numa linha do Card:
 * `https://www.instagram.com/nome/` vira `instagram.com/nome`.
 * URL que não parseia volta inteira — melhor mostrar o link torto que nada.
 */
export function sourceLabel(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.hostname.replace(/^www\./, '')}${parsed.pathname.replace(/\/+$/, '')}`
  }
  catch {
    return url
  }
}

export interface SocialLink {
  name: string
  icon: string
  url: string
}

/** Converte o objeto `redes` da Iniciativa em links prontos para renderizar. */
export function socialLinks(social: NonNullable<Initiative['redes']>): SocialLink[] {
  const links: SocialLink[] = []
  if (social.instagram)
    links.push({ name: 'Instagram', icon: 'i-simple-icons-instagram', url: `https://instagram.com/${social.instagram}` })
  if (social.facebook) links.push({ name: 'Facebook', icon: 'i-simple-icons-facebook', url: social.facebook })
  if (social.tiktok) links.push({ name: 'TikTok', icon: 'i-simple-icons-tiktok', url: social.tiktok })
  if (social.youtube) links.push({ name: 'YouTube', icon: 'i-simple-icons-youtube', url: social.youtube })
  if (social.x) links.push({ name: 'X', icon: 'i-simple-icons-x', url: social.x })
  if (social.whatsapp)
    links.push({
      name: 'WhatsApp',
      icon: 'i-simple-icons-whatsapp',
      url: social.whatsapp.startsWith('+') ? `https://wa.me/${social.whatsapp.replace(/\D/g, '')}` : social.whatsapp,
    })
  if (social.site) links.push({ name: 'Site', icon: 'i-lucide-globe', url: social.site })
  if (social.linktree) links.push({ name: 'Links', icon: 'i-lucide-link', url: social.linktree })
  return links
}
