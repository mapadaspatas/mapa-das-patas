import { describe, expect, it } from 'vitest'
import { crc16, pixBrCode, pixBrCodeOf, pixKeyOf } from '../app/utils/pix'

/**
 * O BR Code é a costura entre a chave publicada e o app do banco do doador:
 * um dígito errado e a doação não acontece. Estes testes travam o formato.
 */

describe('crc16', () => {
  it('bate com o valor de conferência do CRC-16/CCITT-FALSE', () => {
    expect(crc16('123456789')).toBe('29B1')
  })
})

describe('pixBrCode', () => {
  const code = pixBrCode({ key: '12345678000190', name: 'Gatil Miau Feliz', city: 'São Paulo' })!

  it('monta os campos obrigatórios do PIX estático', () => {
    expect(code.startsWith('000201')).toBe(true)
    expect(code).toContain('0014br.gov.bcb.pix')
    expect(code).toContain('011412345678000190')
    expect(code).toContain('52040000') // categoria não informada
    expect(code).toContain('5303986') // real
    expect(code).toContain('5802BR')
    expect(code).toContain('62070503***') // sem identificador de transação
  })

  it('fecha com o CRC do próprio payload', () => {
    expect(code.slice(-8, -4)).toBe('6304')
    expect(code.slice(-4)).toBe(crc16(code.slice(0, -4)))
  })

  it('declara o tamanho certo do bloco da chave', () => {
    const start = code.indexOf('26')
    const declared = Number(code.slice(start + 2, start + 4))
    expect(code.slice(start + 4, start + 4 + declared)).toBe(
      '0014br.gov.bcb.pix011412345678000190',
    )
  })

  it('normaliza nome e cidade para o ASCII maiúsculo que o padrão exige', () => {
    expect(code).toContain('5916GATIL MIAU FELIZ')
    expect(code).toContain('6009SAO PAULO')
  })

  it('trunca nome e cidade nos limites do padrão (25 e 15)', () => {
    const long = pixBrCode({
      key: 'contato@abrigo.org',
      name: 'Associação Protetora dos Animais Abandonados',
      city: 'São José dos Campos',
    })!
    // corta em 25 e ainda apara o espaço solto que sobra do corte
    expect(long).toContain('5924ASSOCIACAO PROTETORA DOS')
    expect(long).toContain('6015SAO JOSE DOS CA')
  })

  it('cai em recebedor/cidade genéricos quando não sobra nada do texto', () => {
    const code = pixBrCode({ key: 'contato@abrigo.org', name: '🐾', city: '—' })!
    expect(code).toContain('5909RECEBEDOR')
    expect(code).toContain('6006BRASIL')
  })

  it('não gera código para chave que não cabe no padrão', () => {
    expect(pixBrCode({ key: '', name: 'Abrigo', city: 'Curitiba' })).toBeNull()
    expect(pixBrCode({ key: 'a'.repeat(78), name: 'Abrigo', city: 'Curitiba' })).toBeNull()
  })
})

describe('pixKeyOf', () => {
  it('manda o CNPJ só com dígitos, mesmo publicado pontuado', () => {
    expect(pixKeyOf({ tipo: 'pix-cnpj', chave: '12.345.678/0001-90', fonte: 'https://x.com/a' }))
      .toBe('12345678000190')
  })

  it('não inventa chave para doação sem chave publicada', () => {
    expect(pixKeyOf({ tipo: 'pix-na-fonte', fonte: 'https://x.com/a' })).toBeUndefined()
    expect(pixKeyOf({ tipo: 'vaquinha', url: 'https://v.com/a', fonte: 'https://x.com/a' }))
      .toBeUndefined()
  })
})

describe('pixBrCodeOf', () => {
  it('só oferece QR Code para PIX com chave publicada', () => {
    const pix = pixBrCodeOf(
      { tipo: 'pix-cnpj', chave: '12.345.678/0001-90', fonte: 'https://x.com/a' },
      'Abrigo Esperança',
      'Curitiba',
    )
    expect(pix).toContain('011412345678000190')

    // Pessoa física é pix-na-fonte: sem chave na página, sem QR (ver ADR 0006)
    expect(pixBrCodeOf({ tipo: 'pix-na-fonte', fonte: 'https://x.com/a' }, 'Abrigo', 'Curitiba'))
      .toBeNull()
  })
})
