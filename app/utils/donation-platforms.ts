import type { DonationType } from '../../shared/schema/initiative'

/**
 * Plataformas de financiamento coletivo reconhecidas por link.
 *
 * O diretório publica o link da campanha, mas até aqui o doador via só
 * "Vaquinha · Abrir campanha" e descobria para onde estava indo depois do
 * clique — o contrário da promessa do site, que é dizer de onde vem cada dado
 * ANTES de doar (é a mesma razão de `pix-na-fonte` imprimir a Fonte por
 * extenso). Reconhecer o host deixa a página dizer "Vaquinha · Vakinha" e
 * "Abrir no Vakinha".
 *
 * Isto NÃO é uma lista de permissão: plataforma fora daqui continua válida no
 * schema e cai no texto genérico, com o link mostrado por extenso do mesmo
 * jeito. A lista só melhora o que o site consegue dizer sobre o que reconhece.
 */
export interface DonationPlatform {
  /** Nome como a própria plataforma se escreve. */
  name: string
  /**
   * Hosts oficiais, sem `www.` e sem esquema. Subdomínio casa por sufixo, então
   * `vakinha.com.br` cobre `blog.vakinha.com.br` — mas nunca `falsavakinha.com.br`.
   */
  hosts: readonly string[]
  /**
   * Preposição contraída com o artigo do nome, para o botão dizer "Abrir no
   * Vakinha" e "Abrir na Benfeitoria" em vez de escolher um dos dois e errar a
   * metade. É obrigatória de propósito: com valor padrão, plataforma feminina
   * nova entraria no masculino sem ninguém reparar.
   */
  preposition: 'no' | 'na'
  /**
   * Tipo de doação que este link costuma ser, quando a plataforma faz uma coisa
   * só. Serve ao Cadastro, que avisa quando o tipo escolhido não bate com o
   * link colado (Apoia.se marcado como vaquinha, por exemplo).
   *
   * Fica de fora de propósito em quem faz as duas coisas — Benfeitoria tem
   * vaquinha e assinatura, Doare tem doação única e recorrente —, porque ali um
   * palpite acertaria metade das vezes e ensinaria o dado errado na outra.
   */
  donationType?: DonationType
}

export const donationPlatforms: readonly DonationPlatform[] = [
  // Brasileiras, na ordem em que aparecem em iniciativa de proteção animal
  { name: 'Vakinha', preposition: 'no', hosts: ['vakinha.com.br', 'vakinha.bio'], donationType: 'vaquinha' },
  { name: 'Apoia.se', preposition: 'no', hosts: ['apoia.se'], donationType: 'apoio-recorrente' },
  { name: 'Kickante', preposition: 'no', hosts: ['kickante.com.br'], donationType: 'vaquinha' },
  // catarse.me redireciona para catarse.com.br, mas o link antigo segue circulando
  { name: 'Catarse', preposition: 'no', hosts: ['catarse.com.br', 'catarse.me'], donationType: 'vaquinha' },
  { name: 'Vaquinha Online', preposition: 'na', hosts: ['vaquinhaonline.com.br'], donationType: 'vaquinha' },
  { name: 'Benfeitoria', preposition: 'na', hosts: ['benfeitoria.com'] },
  { name: 'Doare', preposition: 'no', hosts: ['doare.org'] },
  // Estrangeiras que aparecem em bio de iniciativa brasileira
  { name: 'Patreon', preposition: 'no', hosts: ['patreon.com'], donationType: 'apoio-recorrente' },
  { name: 'PayPal', preposition: 'no', hosts: ['paypal.com', 'paypal.me'], donationType: 'paypal' },
]

/**
 * Plataforma de um link de campanha, ou `undefined` para host desconhecido ou
 * URL que não parseia. Nunca lança: quem chama está sempre no meio de uma
 * renderização, e link torto não pode derrubar a página de doação.
 */
export function donationPlatformOf(url: string): DonationPlatform | undefined {
  let host: string
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  }
  catch {
    return undefined
  }
  return donationPlatforms.find((platform) =>
    platform.hosts.some((known) => host === known || host.endsWith(`.${known}`)),
  )
}

/** Nomes reconhecidos, em texto corrido, para a ajuda do formulário. */
export const donationPlatformNames = donationPlatforms.map((platform) => platform.name)
