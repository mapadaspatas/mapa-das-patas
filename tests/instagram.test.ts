import { describe, expect, it } from 'vitest'
import { instagramHandle } from '../shared/instagram'
import { initiativeSchema } from '../shared/schema/initiative'

describe('instagramHandle: o que vira handle', () => {
  it.each([
    ['handle puro', 'gatilhope', 'gatilhope'],
    ['com @', '@gatilhope', 'gatilhope'],
    ['com espaço em volta', '  @gatilhope  ', 'gatilhope'],
    ['URL completa', 'https://www.instagram.com/gatilhope/', 'gatilhope'],
    ['URL sem www nem barra final', 'https://instagram.com/gatilhope', 'gatilhope'],
    ['URL sem protocolo', 'instagram.com/gatilhope', 'gatilhope'],
    ['URL com o rastreio do app', 'https://www.instagram.com/gatilhope/?igsh=MXY3', 'gatilhope'],
    ['URL com @ no caminho', 'https://instagram.com/@gatilhope', 'gatilhope'],
    ['ponto e underline no handle', 'amigos.de_patas', 'amigos.de_patas'],
  ])('%s vira o handle', (_label, value, expected) => {
    expect(instagramHandle(value)).toBe(expected)
  })

  it('a planilha empacota dois perfis na mesma célula: fica o primeiro', () => {
    expect(instagramHandle('@primeiro.handle/@segundo.handle')).toBe('primeiro.handle')
  })
})

describe('instagramHandle: o que não vira handle', () => {
  /*
   * Estes são os casos que precisam falhar em vez de virar um handle qualquer:
   * handle inventado aqui é link quebrado publicado em silêncio.
   */
  it.each([
    ['vazio', ''],
    ['só espaço', '   '],
    ['link de post', 'https://www.instagram.com/p/DQ1xAbCdEf/'],
    ['link de reel', 'https://instagram.com/reel/DQ1xAbCdEf/'],
    ['link de compartilhamento', 'https://www.instagram.com/share/_kAbCd/'],
    ['perfil de outra rede', 'https://facebook.com/gatilhope'],
    ['outra rede sem protocolo', 'facebook.com/gatilhope'],
    ['só o domínio', 'https://www.instagram.com/'],
    ['e-mail', 'contato@gatilhope.com.br'],
    ['handle longo demais', 'a'.repeat(31)],
    ['caractere fora do formato', 'gatil hope'],
  ])('%s não vira handle', (_label, value) => {
    expect(instagramHandle(value)).toBeUndefined()
  })
})

describe('instagramHandle: contrato com o schema', () => {
  it('todo handle devolvido é aceito por redes.instagram', () => {
    const values = [
      'gatilhope',
      '@gatilhope',
      'https://www.instagram.com/gatilhope/?igsh=MXY3',
      'amigos.de_patas',
    ]

    for (const value of values) {
      const result = initiativeSchema.safeParse({
        nome: 'Gatil Hope',
        tipo: 'projeto-informal',
        estado: 'PA',
        cidade: 'Marituba',
        descricao: 'Resgate e cuidado de gatos em situação de rua.',
        redes: { instagram: instagramHandle(value) },
      })
      expect(result.success, value).toBe(true)
    }
  })

  it('é idempotente: normalizar de novo não muda o valor', () => {
    const once = instagramHandle('https://www.instagram.com/gatilhope/?igsh=MXY3')
    expect(instagramHandle(once!)).toBe(once)
  })
})
