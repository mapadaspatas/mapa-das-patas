import { describe, expect, it } from 'vitest'
import { donationPlatformOf, donationPlatforms } from '../app/utils/donation-platforms.ts'
import { donationTypeMetadata } from '../shared/schema/initiative.ts'
import { donationTitle } from '../app/utils/labels.ts'
import { strings } from '../app/utils/strings.ts'

const source = 'https://instagram.com/p/exemplo'

describe('donationPlatformOf', () => {
  it('reconhece cada host declarado no registro', () => {
    for (const platform of donationPlatforms) {
      for (const host of platform.hosts) {
        expect(donationPlatformOf(`https://${host}/campanha`)?.name).toBe(platform.name)
      }
    }
  })

  it('ignora o www. e casa subdomínio da própria plataforma', () => {
    expect(donationPlatformOf('https://www.vakinha.com.br/1234')?.name).toBe('Vakinha')
    expect(donationPlatformOf('https://blog.vakinha.com.br/post')?.name).toBe('Vakinha')
  })

  it('reconhece o link curto do Vakinha, que é outro domínio', () => {
    expect(donationPlatformOf('https://vakinha.bio/5412469')?.name).toBe('Vakinha')
  })

  /*
   * A checagem é por host inteiro, e não por "contém": um domínio parecido
   * registrado por terceiro não pode ganhar o nome de uma plataforma na página.
   */
  it('não confunde domínio parecido com o da plataforma', () => {
    expect(donationPlatformOf('https://vakinha.com.br.golpe.io/1234')).toBeUndefined()
    expect(donationPlatformOf('https://falsavakinha.com.br/1234')).toBeUndefined()
    expect(donationPlatformOf('https://naoeapoia.se/x')).toBeUndefined()
  })

  it('devolve undefined em host desconhecido e em URL que não parseia', () => {
    expect(donationPlatformOf('https://exemplo.org/vaquinha')).toBeUndefined()
    expect(donationPlatformOf('não é uma url')).toBeUndefined()
    expect(donationPlatformOf('')).toBeUndefined()
  })

  /*
   * O botão da página de detalhe monta "Abrir <preposição> <nome>", então nome
   * feminino sem `na` viraria "Abrir no Benfeitoria" na cara do doador.
   */
  it('sabe a preposição de cada plataforma, inclusive as femininas', () => {
    const preposition = (name: string) =>
      donationPlatforms.find((platform) => platform.name === name)?.preposition
    expect(preposition('Vakinha')).toBe('no')
    expect(preposition('Benfeitoria')).toBe('na')
    expect(preposition('Vaquinha Online')).toBe('na')
    expect(strings.detail.openCampaignOn('na', 'Benfeitoria')).toBe('Abrir na Benfeitoria')
    expect(strings.detail.openCampaignOn('no', 'Vakinha')).toBe('Abrir no Vakinha')
  })

  it('só sugere tipo de doação que existe no schema e publica url', () => {
    for (const platform of donationPlatforms) {
      if (!platform.donationType) continue
      expect(donationTypeMetadata[platform.donationType].field).toBe('url')
    }
  })

  /*
   * Benfeitoria e Doare fazem doação única e recorrente: um palpite ali acertaria
   * metade das vezes, então o Cadastro não avisa nada nelas.
   */
  it('não sugere tipo em plataforma que faz as duas coisas', () => {
    expect(donationPlatformOf('https://benfeitoria.com/projeto/x')?.donationType).toBeUndefined()
    expect(donationPlatformOf('https://doare.org/campanha/y')?.donationType).toBeUndefined()
  })
})

describe('donationTitle', () => {
  it('acrescenta a plataforma reconhecida ao rótulo do tipo', () => {
    expect(donationTitle({ tipo: 'vaquinha', url: 'https://vakinha.bio/5412469', fonte: source }))
      .toBe('Vaquinha · Vakinha')
    expect(donationTitle({ tipo: 'apoio-recorrente', url: 'https://apoia.se/sosnazario', fonte: source }))
      .toBe('Apoio recorrente · Apoia.se')
  })

  it('não repete o nome quando ele já é o rótulo do tipo', () => {
    expect(donationTitle({ tipo: 'paypal', url: 'https://paypal.me/exemplo', fonte: source }))
      .toBe('PayPal')
  })

  it('volta só o rótulo em plataforma desconhecida e em doação sem url', () => {
    expect(donationTitle({ tipo: 'vaquinha', url: 'https://exemplo.org/campanha', fonte: source }))
      .toBe('Vaquinha')
    expect(donationTitle({ tipo: 'pix-na-fonte', fonte: source })).toBe('PIX')
  })
})
