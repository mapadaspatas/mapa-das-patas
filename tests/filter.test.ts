import { describe, expect, it } from 'vitest'
import { citiesOfState, filterInitiatives, normalizeText } from '../app/utils/filter'

const initiatives = [
  {
    nome: 'Gatil São João',
    estado: 'SP',
    cidade: 'São Paulo',
    tipo: 'abrigo-santuario',
    especies: ['gatos'],
    necessidades: ['racao'],
    redes: { instagram: 'gatil.sao.joao' },
    verificado: false,
  },
  {
    nome: 'Cães do Amanhã',
    estado: 'SP',
    cidade: 'Campinas',
    tipo: 'ong',
    especies: ['caes'],
    necessidades: ['voluntarios', 'racao'],
    redes: { instagram: 'caesdoamanha' },
    verificado: { em: '2026-01-10', canal: 'email' },
  },
  {
    nome: 'Protetora Ana',
    estado: 'CE',
    cidade: 'Fortaleza',
    tipo: 'protetor-independente',
    especies: null,
    necessidades: null,
    redes: null,
    verificado: null,
  },
] as const

/** Iniciativas em municípios do IBGE com apóstrofo, os que a busca precisa alcançar sem ele. */
const apostrophed = [
  { nome: 'Gatos do Oeste', estado: 'SP', cidade: 'Santa Bárbara d\'Oeste', tipo: 'ong' },
  { nome: 'Patas do Sul', estado: 'RS', cidade: 'Sant\'Ana do Livramento', tipo: 'ong' },
  { nome: 'Amigos do Norte', estado: 'TO', cidade: 'Pau D\'Arco', tipo: 'ong' },
] as const

/**
 * O caso que abre a issue: o termo cruza dois campos (nome e cidade) e nenhuma
 * ordem entre eles é a "certa". Os dois vizinhos existem para o teste falhar se
 * a busca passar a casar só um dos termos.
 */
const catsInCuritiba = [
  { nome: 'Gatos de Rua', estado: 'PR', cidade: 'Curitiba', tipo: 'ong' },
  { nome: 'Cães de Rua', estado: 'PR', cidade: 'Curitiba', tipo: 'ong' },
  { nome: 'Gatos de Rua', estado: 'SP', cidade: 'Santos', tipo: 'ong' },
] as const

describe('normalizeText', () => {
  it('remove acentos e caixa', () => {
    expect(normalizeText('São JOÃO')).toBe('sao joao')
  })

  it('remove apóstrofo, hífen e ponto, que a pessoa não digita', () => {
    expect(normalizeText('Santa Bárbara d\'Oeste')).toBe('santa barbara doeste')
    expect(normalizeText('Olhos-d\'Água')).toBe('olhosdagua')
    expect(normalizeText('gatil.sao.joao')).toBe('gatilsaojoao')
  })

  it('remove também o apóstrofo tipográfico, que o teclado do celular emite', () => {
    expect(normalizeText('Sant\u2019Ana do Livramento')).toBe('santana do livramento')
  })
})

describe('filterInitiatives', () => {
  it('sem filtros retorna todas', () => {
    expect(filterInitiatives(initiatives, {})).toHaveLength(3)
  })

  it('busca por nome é insensível a acentos e maiúsculas', () => {
    expect(filterInitiatives(initiatives, { search: 'sao joao' })).toHaveLength(1)
    expect(filterInitiatives(initiatives, { search: 'CÃES' })).toHaveLength(1)
  })

  it('busca também encontra pela cidade', () => {
    expect(filterInitiatives(initiatives, { search: 'fortaleza' })).toHaveLength(1)
  })

  it('busca também encontra pelo estado', () => {
    expect(filterInitiatives(initiatives, { search: 'CE' })).toHaveLength(1)
  })

  it('"gatos curitiba" acha a de gatos em Curitiba, digitada em qualquer ordem', () => {
    const found = filterInitiatives(catsInCuritiba, { search: 'gatos curitiba' })
    expect(found.map((i) => `${i.nome} / ${i.cidade}`)).toEqual(['Gatos de Rua / Curitiba'])
    expect(filterInitiatives(catsInCuritiba, { search: 'curitiba gatos' })).toEqual(found)
  })

  it('exige todas as palavras, em qualquer ordem', () => {
    const found = filterInitiatives(apostrophed, { search: 'gatos santa barbara' })
    expect(found.map((i) => i.nome)).toEqual(['Gatos do Oeste'])
    expect(filterInitiatives(apostrophed, { search: 'santa barbara gatos' })).toEqual(found)
  })

  it('palavra que não aparece em lugar nenhum descarta o resultado', () => {
    expect(filterInitiatives(apostrophed, { search: 'gatos curitiba' })).toHaveLength(0)
  })

  it('termo de uma palavra e termo vazio continuam como antes', () => {
    expect(filterInitiatives(initiatives, { search: 'gatil' })).toHaveLength(1)
    expect(filterInitiatives(initiatives, { search: '' })).toHaveLength(3)
  })

  it('espaço sobrando nas pontas e no meio não muda o resultado', () => {
    expect(filterInitiatives(initiatives, { search: '   ' })).toHaveLength(3)
    expect(filterInitiatives(initiatives, { search: '  sao   joao  ' })).toHaveLength(1)
  })

  it('encontra município do IBGE com apóstrofo sem quem busca digitar o apóstrofo', () => {
    expect(filterInitiatives(apostrophed, { search: 'santa barbara doeste' })).toHaveLength(1)
    expect(filterInitiatives(apostrophed, { search: 'santana do livramento' })).toHaveLength(1)
    expect(filterInitiatives(apostrophed, { search: 'pau darco' })).toHaveLength(1)
  })

  it('a grafia com a pontuação do IBGE continua encontrando', () => {
    expect(filterInitiatives(apostrophed, { search: 'Santa Bárbara d\'Oeste' })).toHaveLength(1)
    expect(filterInitiatives(apostrophed, { search: 'Sant\'Ana' })).toHaveLength(1)
  })

  it('encontra pelo handle do Instagram, com e sem @', () => {
    expect(filterInitiatives(initiatives, { search: 'caesdoamanha' })).toHaveLength(1)
    expect(filterInitiatives(initiatives, { search: '@caesdoamanha' })).toHaveLength(1)
    expect(filterInitiatives(initiatives, { search: 'gatil.sao.joao' })).toHaveLength(1)
  })

  it('iniciativa sem redes não quebra a busca nem some dos resultados', () => {
    expect(filterInitiatives(apostrophed, { search: 'gatos do oeste' })).toHaveLength(1)
    expect(filterInitiatives(initiatives, { search: 'protetora ana' })).toHaveLength(1)
  })

  it('a descrição fica fora do alvo da busca', () => {
    const described = [
      { nome: 'Lar Feliz', estado: 'BA', cidade: 'Salvador', tipo: 'ong', descricao: 'resgate de cavalos' },
    ] as const
    expect(filterInitiatives(described, { search: 'cavalos' })).toHaveLength(0)
    expect(filterInitiatives(described, { search: 'lar feliz' })).toHaveLength(1)
  })

  it('filtra por estado, tipo, espécie e necessidade', () => {
    expect(filterInitiatives(initiatives, { state: 'SP' })).toHaveLength(2)
    expect(filterInitiatives(initiatives, { type: 'ong' })).toHaveLength(1)
    expect(filterInitiatives(initiatives, { species: 'gatos' })).toHaveLength(1)
    expect(filterInitiatives(initiatives, { need: 'racao' })).toHaveLength(2)
  })

  it('filtros combinam entre si e com a busca', () => {
    expect(filterInitiatives(initiatives, { state: 'SP', species: 'caes' })).toHaveLength(1)
    expect(filterInitiatives(initiatives, { state: 'SP', search: 'gatil' })).toHaveLength(1)
    expect(filterInitiatives(initiatives, { state: 'CE', species: 'gatos' })).toHaveLength(0)
  })

  it('filtra por cidade', () => {
    expect(filterInitiatives(initiatives, { state: 'SP', city: 'Campinas' })).toHaveLength(1)
  })

  it('iniciativas com campos null não quebram os filtros', () => {
    expect(filterInitiatives(initiatives, { species: 'caes' })).toHaveLength(1)
    expect(filterInitiatives(initiatives, { need: 'castracao' })).toHaveLength(0)
  })
})

describe('citiesOfState', () => {
  it('lista apenas cidades do estado selecionado, ordenadas e únicas', () => {
    const duplicated = { ...initiatives[0] }
    expect(citiesOfState([...initiatives, duplicated], 'SP')).toEqual(['Campinas', 'São Paulo'])
    expect(citiesOfState(initiatives, 'CE')).toEqual(['Fortaleza'])
  })
})
