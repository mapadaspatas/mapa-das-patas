/**
 * Emite o link de confirmação de uma Iniciativa, para colar na mensagem que o
 * Moderador já manda hoje (ver `docs/mensagens-para-iniciativas.md`).
 *
 * Uso: pnpm token <slug> <canal>
 *   pnpm token abrigo-amor-miau DM do Instagram oficial
 *
 * O `canal` descreve o **meio** por onde o link vai, e fica publicado no YAML
 * como `verificado.canal`: nunca ponha nele o endereço, o número ou o @ de
 * ninguém — são exatamente os dados que o projeto não republica.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { expiryFromNow, mint, tokenLifetimeDays } from '../shared/confirmation/token.ts'

/*
 * O endereço fica fixo aqui, e não em `NUXT_PUBLIC_SITE_URL`: essa variável
 * vale `http://localhost:3000` no `.env` de desenvolvimento, e um link de
 * localhost colado numa DM não abre para ninguém. Para testar local, use o
 * token cru impresso no fim e monte a URL na mão.
 */
const siteUrl = 'https://mapadaspatas.pages.dev'

// Roda fora do Nuxt, então o `.env` não vem carregado. Sem arquivo, segue com
// o que já estiver no ambiente.
try {
  process.loadEnvFile()
} catch {
  // sem .env local: o segredo pode vir do ambiente
}

function fail(message: string): never {
  console.error(`✖ ${message}`)
  console.error('\nUso: pnpm token <slug> <canal>')
  console.error('     pnpm token abrigo-amor-miau DM do Instagram oficial')
  process.exit(1)
}

const [slug, ...canalWords] = process.argv.slice(2)
const canal = canalWords.join(' ').trim()

if (!slug) fail('faltou o slug da Iniciativa (o nome do arquivo YAML, sem .yml).')
if (!canal) fail('faltou o canal (ex.: "DM do Instagram oficial", "e-mail institucional").')

const secret = process.env.CONFIRMATION_SECRET
if (!secret) {
  fail('CONFIRMATION_SECRET não está no .env nem no ambiente (ver .env.example).')
}

/*
 * Slug errado gera um link que só falha do outro lado, depois de enviado: a
 * conferência é contra o checkout, que é o mesmo conteúdo publicado.
 */
const yamlPath = join(import.meta.dirname, '..', 'content', 'iniciativas', `${slug}.yml`)
if (!existsSync(yamlPath)) {
  fail(`não existe content/iniciativas/${slug}.yml — confira o slug na URL da página da Iniciativa.`)
}

const expiresAt = expiryFromNow()
const token = await mint({ slug, canal, expiresAt }, secret)
const validade = new Date(expiresAt * 1000).toISOString().slice(0, 10)

console.log(`\nIniciativa: ${slug}`)
console.log(`Canal:      ${canal}`)
console.log(`Vale até:   ${validade} (${tokenLifetimeDays} dias)`)
console.log('\nLink para colar na mensagem (um link só, ele substitui o da página):\n')
console.log(`${siteUrl}/confirmar/${slug}?t=${token}`)
console.log('\nToken cru, para montar a URL à mão em desenvolvimento:\n')
console.log(token)
console.log()
