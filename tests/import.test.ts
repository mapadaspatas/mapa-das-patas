import { describe, expect, it } from 'vitest'
import { transformRow, transformSpreadsheet } from '../scripts/import/transform'

// Linhas sintéticas que espelham os padrões reais da planilha
// (CPF/CNPJ com dígitos fictícios: o formato é o que importa).
const baseRow = {
  state: 'SP',
  city: 'Campinas',
  name: 'Projeto Exemplo',
  instagram: '@projetoexemplo',
  pixDonation: '',
  otherLinks: '',
}

describe('transformRow: regras de dados pessoais', () => {
  it('CNPJ vira pix-cnpj com Fonte no perfil oficial', () => {
    const { initiative } = transformRow({ ...baseRow, pixDonation: '12.345.678/0001-90' })
    expect(initiative.doacoes).toEqual([
      {
        tipo: 'pix-cnpj',
        chave: '12.345.678/0001-90',
        fonte: 'https://instagram.com/projetoexemplo',
      },
    ])
  })

  it.each([
    ['CPF formatado', '123.456.789-09'],
    ['e-mail', 'doacao@exemplo.org'],
    ['telefone', '(11) 99477-3463'],
    ['telefone corrompido pelo Excel', '8.598971592E10'],
  ])('chave de pessoa física (%s) vira pix-na-fonte', (_label, pixDonation) => {
    const { initiative } = transformRow({ ...baseRow, pixDonation })
    expect(initiative.doacoes).toEqual([
      { tipo: 'pix-na-fonte', fonte: 'https://instagram.com/projetoexemplo' },
    ])
  })

  it('não publica a chave descartada nem no aviso de conferência', () => {
    const { warnings } = transformRow({ ...baseRow, pixDonation: 'doacao@exemplo.org' })
    expect(warnings.some((w) => w.includes('doacao@exemplo.org'))).toBe(false)
  })

  it('entradas com "ou" são divididas e processadas uma a uma', () => {
    const { initiative } = transformRow({
      ...baseRow,
      pixDonation: '12.345.678/0001-90 ou doacao@exemplo.org',
    })
    expect(initiative.doacoes).toHaveLength(2)
    expect(initiative.doacoes?.[0]?.tipo).toBe('pix-cnpj')
    expect(initiative.doacoes?.[1]?.tipo).toBe('pix-na-fonte')
  })

  it('sem instagram não há Fonte possível: doação omitida com aviso', () => {
    const { initiative, warnings } = transformRow({
      ...baseRow,
      instagram: '',
      pixDonation: '12.345.678/0001-90',
    })
    expect(initiative.doacoes).toBeUndefined()
    expect(warnings.some((w) => w.includes('sem Fonte'))).toBe(true)
  })
})

describe('transformRow: redes e links', () => {
  it('remove @ e pega só o primeiro handle do instagram', () => {
    const { initiative } = transformRow({
      ...baseRow,
      instagram: '@primeiro.handle/@segundo.handle',
    })
    expect(initiative.redes?.instagram).toBe('primeiro.handle')
  })

  it('linktree e afins na coluna extra viram redes.linktree', () => {
    const { initiative } = transformRow({ ...baseRow, otherLinks: 'linktr.ee/projetoexemplo' })
    expect(initiative.redes?.linktree).toBe('https://linktr.ee/projetoexemplo')
  })

  it('apoia.se vira doação de apoio recorrente', () => {
    const { initiative } = transformRow({ ...baseRow, otherLinks: 'apoia.se/projetoexemplo' })
    expect(initiative.doacoes).toContainEqual({
      tipo: 'apoio-recorrente',
      url: 'https://apoia.se/projetoexemplo',
      fonte: 'https://instagram.com/projetoexemplo',
    })
  })

  it('site institucional vira redes.site', () => {
    const { initiative } = transformRow({ ...baseRow, otherLinks: 'www.projetoexemplo.org' })
    expect(initiative.redes?.site).toBe('https://www.projetoexemplo.org')
  })
})

describe('transformRow: inferências', () => {
  it('infere gatos de nomes felinos e cães de nomes caninos', () => {
    expect(transformRow({ ...baseRow, name: 'Gatil Esperança' }).initiative.especies).toEqual(['gatos'])
    expect(transformRow({ ...baseRow, name: 'Recanto dos Felinos' }).initiative.especies).toEqual(['gatos'])
    expect(transformRow({ ...baseRow, otherLinks: 'Cães' }).initiative.especies).toEqual(['caes'])
    expect(transformRow({ ...baseRow, name: 'Amigos de Patas' }).initiative.especies).toBeUndefined()
  })

  it('infere o tipo pelo nome, com projeto-informal como padrão', () => {
    expect(transformRow({ ...baseRow, name: 'Associação Casa Nova' }).initiative.tipo).toBe('associacao')
    expect(transformRow({ ...baseRow, name: 'Instituto Toca' }).initiative.tipo).toBe('ong')
    expect(transformRow({ ...baseRow, name: 'Ong Abraça Vidas' }).initiative.tipo).toBe('ong')
    expect(transformRow({ ...baseRow, name: 'Protetora Silvana' }).initiative.tipo).toBe('protetor-independente')
    expect(transformRow({ ...baseRow, name: 'Abrigo dos Anjos' }).initiative.tipo).toBe('abrigo-santuario')
    expect(transformRow({ ...baseRow, name: 'Amigos de Patas' }).initiative.tipo).toBe('projeto-informal')
  })

  it('nenhuma Iniciativa importada nasce com Selo Verificado', () => {
    const { initiative } = transformRow(baseRow)
    expect(initiative.verificado).toBeUndefined()
  })
})

describe('transformSpreadsheet: slugs e conjunto', () => {
  it('gera slug a partir do nome e desambigua repetidos com a cidade', () => {
    const results = transformSpreadsheet([
      { ...baseRow, name: 'Amigos de Patas', city: 'Aracaju', state: 'SE' },
      { ...baseRow, name: 'Amigos de Patas', city: 'Fortaleza', state: 'CE' },
    ])
    expect(results.map((r) => r.slug)).toEqual(['amigos-de-patas', 'amigos-de-patas-fortaleza'])
  })

  it('slug não tem acentos nem caracteres especiais', () => {
    const [result] = transformSpreadsheet([{ ...baseRow, name: 'Netinhos da Vó Áurea' }])
    expect(result!.slug).toBe('netinhos-da-vo-aurea')
  })
})
