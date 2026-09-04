export interface Verification {
  em: string
  canal: string
}

/**
 * O @nuxt/content grava campo ausente como null, e o schema aceita `false`:
 * este é o único jeito seguro de ler o Selo Verificado de um item.
 */
export function verificationOf(raw: unknown): Verification | undefined {
  return raw && typeof raw === 'object' ? (raw as Verification) : undefined
}
