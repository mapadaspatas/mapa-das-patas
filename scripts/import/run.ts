/**
 * Importação one-off da planilha original (já extraída para JSON local).
 * Gera um YAML por Iniciativa em content/iniciativas/ e um relatório de
 * conferência manual em .scratch/mapa-das-patas/conferencia-importacao.md.
 *
 * Uso: node scripts/import/run.ts <caminho-do-json-de-linhas>
 * O JSON (com dados brutos, inclusive CPFs) fica FORA do repositório.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { stringify } from 'yaml'
import { initiativeSchema } from '../../shared/schema/initiative.ts'
import { transformSpreadsheet, type SpreadsheetRow } from './transform.ts'

const jsonPath = process.argv[2]
if (!jsonPath) {
  console.error('Uso: node scripts/import/run.ts <caminho-do-json-de-linhas>')
  process.exit(1)
}

const rows: SpreadsheetRow[] = JSON.parse(readFileSync(jsonPath, 'utf8'))
const results = transformSpreadsheet(rows)

const root = join(import.meta.dirname, '..', '..')
const target = join(root, 'content', 'iniciativas')
mkdirSync(target, { recursive: true })

const checklist: string[] = []
let errors = 0

for (const { slug, initiative, warnings } of results) {
  const valid = initiativeSchema.safeParse(initiative)
  if (!valid.success) {
    errors++
    console.error(`✖ ${slug}: transformação produziu Iniciativa inválida`)
    console.error(valid.error.message)
    continue
  }
  writeFileSync(join(target, `${slug}.yml`), stringify(initiative), 'utf8')
  if (warnings.length > 0) {
    checklist.push(`### ${initiative.nome} (\`${slug}\`)\n` + warnings.map((w) => `- [ ] ${w}`).join('\n'))
  }
}

const report = `# Conferência manual da importação

Gerado pela importação da planilha original. Cada item precisa de validação
do mantenedor antes de ser promovido.

Regras aplicadas automaticamente: CNPJ publicado direto; toda chave de pessoa
física (CPF, e-mail, telefone) virou \`pix-na-fonte\`; descrições geradas
genericamente, a melhorar com a comunidade; tipo e espécies inferidos do nome.

Nenhum item cita o valor de uma chave descartada: este arquivo é versionado no
repositório público, e citá-lo republicaria o dado que o ADR 0006 tirou do site.

${checklist.join('\n\n')}
`

writeFileSync(join(root, '.scratch', 'mapa-das-patas', 'conferencia-importacao.md'), report, 'utf8')

console.log(`✔ ${results.length - errors} Iniciativa(s) importada(s), ${errors} erro(s).`)
console.log(`  ${checklist.length} Iniciativa(s) com itens de conferência manual.`)
