import { imageEdge, imageMaxBytes } from '~~/shared/registration/image'

/**
 * Preparo da imagem da Iniciativa no browser, antes do envio.
 *
 * Recortar e comprimir aqui (e não no servidor) é o que mantém o Cadastro
 * dentro do plano gratuito: a Function do Cloudflare só repassa bytes prontos
 * para o commit, sem biblioteca de imagem e sem CPU de redimensionamento.
 */

export interface PreparedImage {
  /** Conteúdo WebP em base64, sem o prefixo `data:`. */
  base64: string
  /** Data URL pronta para o preview no formulário. */
  previewUrl: string
  bytes: number
}

/** Recorta o centro em quadrado e reduz para imageEdge x imageEdge. */
function drawSquare(source: ImageBitmap): HTMLCanvasElement {
  const edge = Math.min(source.width, source.height)
  const canvas = document.createElement('canvas')
  canvas.width = imageEdge
  canvas.height = imageEdge
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas indisponível')
  context.drawImage(
    source,
    (source.width - edge) / 2,
    (source.height - edge) / 2,
    edge,
    edge,
    0,
    0,
    imageEdge,
    imageEdge,
  )
  return canvas
}

function toWebpBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('falha ao gerar WebP'))),
      'image/webp',
      quality,
    )
  })
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

/**
 * Converte o arquivo escolhido em um WebP quadrado dentro do limite de bytes,
 * baixando a qualidade em degraus se a foto for muito detalhada.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  const source = await createImageBitmap(file)
  try {
    const canvas = drawSquare(source)
    for (const quality of [0.82, 0.7, 0.55, 0.4]) {
      const blob = await toWebpBlob(canvas, quality)
      if (blob.size <= imageMaxBytes || quality === 0.4) {
        const base64 = toBase64(await blob.arrayBuffer())
        return { base64, previewUrl: `data:image/webp;base64,${base64}`, bytes: blob.size }
      }
    }
    throw new Error('imagem grande demais')
  } finally {
    source.close()
  }
}
