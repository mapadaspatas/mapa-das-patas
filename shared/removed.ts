import { parse } from 'yaml'
import { z } from 'zod'

/**
 * Lista de Iniciativas que pediram para sair do diretório (`content/removidos.yml`).
 *
 * Existe por um motivo só: sem ela, quem foi removido volta ao site semanas
 * depois num Cadastro de boa-fé de outro contribuidor, e um pedido atendido
 * virou pedido descumprido. A memória de um Moderador não é trava; a CI é.
 */

export const removalKinds = ['oposicao', 'eliminacao'] as const

const removalSchema = z.strictObject({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'slug deve ser o nome do arquivo YAML, sem .yml'),
  em: z.iso.date(),
  /** `eliminacao` também reescreve o histórico Git (ver docs/adr/0005). */
  pedido: z.enum(removalKinds),
})

const fileSchema = z.strictObject({
  // Arquivo mantido à mão: `removidos:` vazio (null) vale como lista vazia.
  removidos: z.array(removalSchema).nullish().transform((list) => list ?? []),
})

export type Removal = z.infer<typeof removalSchema>

/** Lança com mensagem legível quando o arquivo está fora de forma. */
export function parseRemovals(yaml: string): Removal[] {
  const parsed = fileSchema.safeParse(parse(yaml))
  if (!parsed.success) {
    throw new Error(z.prettifyError(parsed.error))
  }
  return parsed.data.removidos
}

/** Slug listado, com o pedido que o removeu; `undefined` quando está livre. */
export function removalOf(removals: Removal[], slug: string): Removal | undefined {
  return removals.find((removal) => removal.slug === slug)
}
