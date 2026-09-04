/**
 * Regras da imagem enviada no Cadastro.
 *
 * O browser já entrega um WebP quadrado e pequeno (ver app/utils/image.ts);
 * aqui é a checagem de servidor, que não confia no cliente: o que chega tem
 * mesmo o tamanho e o formato prometidos antes de virar commit no repositório.
 */

/** Lado do quadrado gerado no browser, em pixels. */
export const imageEdge = 400

/** Teto do arquivo já comprimido. Um WebP 400x400 de qualidade boa fica bem abaixo. */
export const imageMaxBytes = 120 * 1024

export type ImageCheck = { ok: true, bytes: number } | { ok: false, message: string }

function decodeBase64(base64: string): Uint8Array | undefined {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return undefined
  try {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  } catch {
    return undefined
  }
}

/** WebP é um container RIFF: "RIFF" nos bytes 0-3 e "WEBP" nos bytes 8-11. */
function isWebp(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false
  const tag = (start: number) =>
    String.fromCharCode(bytes[start]!, bytes[start + 1]!, bytes[start + 2]!, bytes[start + 3]!)
  return tag(0) === 'RIFF' && tag(8) === 'WEBP'
}

export function checkImageBase64(base64: string): ImageCheck {
  // Corta antes de decodificar: base64 ocupa ~4/3 dos bytes originais.
  if (base64.length > imageMaxBytes * 2) {
    return { ok: false, message: `imagem maior que o limite de ${Math.round(imageMaxBytes / 1024)} KB` }
  }

  const bytes = decodeBase64(base64)
  if (!bytes) return { ok: false, message: 'imagem não pôde ser lida: envie o arquivo novamente' }

  if (bytes.length > imageMaxBytes) {
    return { ok: false, message: `imagem maior que o limite de ${Math.round(imageMaxBytes / 1024)} KB` }
  }
  if (!isWebp(bytes)) {
    return { ok: false, message: 'imagem precisa estar em WebP, o formato gerado pelo formulário' }
  }

  return { ok: true, bytes: bytes.length }
}
