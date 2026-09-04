import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseRemovals, removalOf } from '../shared/removed'

describe('lista de saída do diretório', () => {
  it('lista vazia é forma válida, escrita como [] ou em branco', () => {
    expect(parseRemovals('removidos: []')).toEqual([])
    expect(parseRemovals('removidos:')).toEqual([])
  })

  it('lê o pedido com slug, data e tipo', () => {
    const removals = parseRemovals(`
removidos:
  - slug: protetora-exemplo
    em: 2026-08-22
    pedido: eliminacao
`)
    expect(removals).toEqual([{ slug: 'protetora-exemplo', em: '2026-08-22', pedido: 'eliminacao' }])
  })

  it('recusa entrada malformada em vez de ignorar em silêncio', () => {
    // Uma entrada que a CI não entende é uma remoção que ela deixa de barrar.
    expect(() => parseRemovals('removidos:\n  - slug: Nome Com Espaço\n    em: 2026-08-22\n    pedido: oposicao'))
      .toThrow(/slug/)
    expect(() => parseRemovals('removidos:\n  - slug: exemplo\n    em: ontem\n    pedido: oposicao'))
      .toThrow()
    expect(() => parseRemovals('removidos:\n  - slug: exemplo\n    em: 2026-08-22\n    pedido: sumiu'))
      .toThrow()
  })

  it('encontra o slug listado e libera o que não está', () => {
    const removals = parseRemovals('removidos:\n  - slug: saiu\n    em: 2026-08-22\n    pedido: oposicao')
    expect(removalOf(removals, 'saiu')?.pedido).toBe('oposicao')
    expect(removalOf(removals, 'ficou')).toBeUndefined()
  })

  it('o arquivo real do repositório está em forma válida', () => {
    const file = readFileSync(new URL('../content/removidos.yml', import.meta.url), 'utf8')
    expect(() => parseRemovals(file)).not.toThrow()
  })
})
