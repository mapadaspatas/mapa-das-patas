import { describe, expect, it } from 'vitest'
import { checkImageBase64, imageMaxBytes } from '../shared/registration/image'

function base64Of(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

function webp(size = 32): Uint8Array {
  const buffer = new Uint8Array(size)
  buffer.set([0x52, 0x49, 0x46, 0x46], 0)
  buffer.set([0x57, 0x45, 0x42, 0x50], 8)
  return buffer
}

describe('checkImageBase64', () => {
  it('aceita WebP dentro do limite', () => {
    const result = checkImageBase64(base64Of(webp()))
    expect(result).toEqual({ ok: true, bytes: 32 })
  })

  it('recusa PNG e outros formatos que não sejam WebP', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0])
    const result = checkImageBase64(base64Of(png))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toContain('WebP')
  })

  it('recusa arquivo acima do limite', () => {
    const result = checkImageBase64(base64Of(webp(imageMaxBytes + 1)))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toContain('limite')
  })

  it('recusa base64 malformado sem estourar', () => {
    expect(checkImageBase64('não é base64!!').ok).toBe(false)
  })

  it('recusa arquivo curto demais para ter cabeçalho', () => {
    expect(checkImageBase64(base64Of(new Uint8Array([0x52, 0x49]))).ok).toBe(false)
  })
})
