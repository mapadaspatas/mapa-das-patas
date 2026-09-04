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
    verificado: false,
  },
  {
    nome: 'Cães do Amanhã',
    estado: 'SP',
    cidade: 'Campinas',
    tipo: 'ong',
    especies: ['caes'],
    necessidades: ['voluntarios', 'racao'],
    verificado: { em: '2026-01-10', canal: 'email' },
  },
  {
    nome: 'Protetora Ana',
    estado: 'CE',
    cidade: 'Fortaleza',
    tipo: 'protetor-independente',
    especies: null,
    necessidades: null,
    verificado: null,
  },
] as const

describe('normalizeText', () => {
  it('remove acentos e caixa', () => {
    expect(normalizeText('São JOÃO')).toBe('sao joao')
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
