import { describe, expect, it } from 'vitest'
import { cnpjChars, formatCnpj, isCnpj, isCnpjMaskable } from '../shared/cnpj'
import { looksLikePersonalPixKey } from '../shared/schema/initiative'

describe('cnpjChars', () => {
  it('tira os separadores e sobe a letra para maiúscula', () => {
    expect(cnpjChars('12.345.678/0001-90')).toBe('12345678000190')
    expect(cnpjChars('12.abc.345/01de-35')).toBe('12ABC34501DE35')
  })

  it('para nas 14 posições', () => {
    expect(cnpjChars('12345678000190999')).toBe('12345678000190')
  })
})

describe('isCnpj', () => {
  it('aceita o numérico, formatado ou cru', () => {
    expect(isCnpj('12.345.678/0001-90')).toBe(true)
    expect(isCnpj('12345678000190')).toBe(true)
  })

  it('aceita o alfanumérico da IN RFB 2.229/2024', () => {
    expect(isCnpj('12.ABC.345/01DE-35')).toBe(true)
    expect(isCnpj('12ABC34501DE35')).toBe(true)
  })

  it('recusa letra no dígito verificador, que é sempre numérico', () => {
    expect(isCnpj('12.ABC.345/01DE-3A')).toBe(false)
    expect(isCnpj('12ABC34501DEA5')).toBe(false)
  })

  it('recusa letra minúscula, comprimento errado e CPF', () => {
    expect(isCnpj('12.abc.345/01de-35')).toBe(false)
    expect(isCnpj('12.345.678/0001-9')).toBe(false)
    expect(isCnpj('123.456.789-09')).toBe(false)
  })
})

describe('formatCnpj', () => {
  it('formata o numérico e o alfanumérico', () => {
    expect(formatCnpj('12345678000190')).toBe('12.345.678/0001-90')
    expect(formatCnpj('12abc34501de35')).toBe('12.ABC.345/01DE-35')
  })

  it('é idempotente sobre o valor já formatado', () => {
    expect(formatCnpj('12.345.678/0001-90')).toBe('12.345.678/0001-90')
  })

  /*
   * O motivo de a máscara existir: sem ela o valor passava por 10 a 13 dígitos
   * crus, faixa que `looksLikePhone` acusa, e o aviso de chave pessoal piscava
   * vermelho no meio de um CNPJ legítimo (item 2 da review).
   */
  it('nenhum estado intermediário de um CNPJ digitado parece chave pessoal', () => {
    const raw = '12345678000190'
    for (let typed = 1; typed <= raw.length; typed++) {
      const masked = formatCnpj(raw.slice(0, typed))
      expect(looksLikePersonalPixKey(masked), `parou em "${masked}"`).toBe(false)
    }
  })
})

describe('isCnpjMaskable', () => {
  it('deixa passar o que ainda pode virar CNPJ', () => {
    expect(isCnpjMaskable('12345')).toBe(true)
    expect(isCnpjMaskable('12.345.678/0001-90')).toBe(true)
    expect(isCnpjMaskable('12abc34501de35')).toBe(true)
  })

  /*
   * Chave pessoal fica como veio: mascarar um e-mail ou um telefone com `+`
   * apagaria justamente o que o aviso do formulário precisa ler.
   */
  it('não mascara chave de pessoa física nem valor longo demais', () => {
    expect(isCnpjMaskable('doacao@exemplo.org')).toBe(false)
    expect(isCnpjMaskable('+5511994773463')).toBe(false)
    expect(isCnpjMaskable('(11) 99477-3463')).toBe(false)
    expect(isCnpjMaskable('12345678000190999')).toBe(false)
  })
})
