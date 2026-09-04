/**
 * Valida todos os arquivos de Iniciativa contra o schema central.
 * Roda na CI em todo PR: arquivo inválido = build vermelho, com a
 * mensagem apontando arquivo, campo e regra violada.
 *
 * Uso: node scripts/validate-initiatives.ts
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import { z } from 'zod'
import { parseRemovals, removalOf } from '../shared/removed.ts'
import { initiativeSchema } from '../shared/schema/initiative.ts'

const content = join(import.meta.dirname, '..', 'content')
const directory = join(content, 'iniciativas')
const files = readdirSync(directory).filter((name) => name.endsWith('.yml'))

const removedFile = join(content, 'removidos.yml')
const removals = existsSync(removedFile)
  ? parseRemovals(readFileSync(removedFile, 'utf8'))
  : []

let invalid = 0

for (const file of files) {
  /*
   * Antes do schema: quem pediu para sair não volta. A checagem é por slug
   * (nome do arquivo) porque é ele que define a URL, e é a URL que reaparece.
   */
  const slug = file.replace(/\.yml$/, '')
  const removal = removalOf(removals, slug)
  if (removal) {
    invalid++
    console.error(`✖ ${file}:`)
    console.error(`    esta Iniciativa pediu para sair do diretório em ${removal.em} (${removal.pedido}).`)
    console.error('    Não recadastre um slug listado em content/removidos.yml: remova este arquivo.')
    console.error('    Se a própria Iniciativa quer voltar, tire a entrada da lista no mesmo PR.')
    continue
  }

  let data: unknown
  try {
    data = parse(readFileSync(join(directory, file), 'utf8'))
  } catch (error) {
    invalid++
    console.error(`✖ ${file}: YAML inválido: ${(error as Error).message}`)
    continue
  }

  const result = initiativeSchema.safeParse(data)
  if (!result.success) {
    invalid++
    console.error(`✖ ${file}:`)
    console.error(z.prettifyError(result.error).replace(/^/gm, '    '))
    continue
  }

  // A imagem é um arquivo versionado: referência quebrada é build vermelho,
  // senão o site publica um retrato 404 sem ninguém perceber.
  const image = result.data.imagem
  if (image && !existsSync(join(import.meta.dirname, '..', 'public', image))) {
    invalid++
    console.error(`✖ ${file}:`)
    console.error(`    imagem: arquivo public${image} não existe no repositório`)
  }
}

if (invalid > 0) {
  console.error(`\n${invalid} de ${files.length} arquivo(s) de Iniciativa inválido(s).`)
  console.error('Regras em CONTEXT.md: Fonte obrigatória em toda Chave de Doação e regras de dados pessoais.')
  process.exit(1)
}

console.log(`✔ ${files.length} Iniciativa(s) válida(s).`)
