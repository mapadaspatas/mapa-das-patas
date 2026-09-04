import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { processConfirmation, type ConfirmationDeps } from '../../shared/confirmation/process'
import { createDeps, isoToday } from '../../shared/registration/adapters'

/**
 * Rota de desenvolvimento: em produção o site é estático e o POST
 * /api/confirmacao é atendido pela Pages Function (functions/api/confirmacao.ts).
 * Sem GITHUB_TOKEN no ambiente, simula o PR para permitir testar a página.
 *
 * O CONFIRMATION_SECRET **não** é simulado: sem ele nenhum token vale nem em
 * dev, que é o mesmo comportamento de produção. Para testar o fluxo inteiro,
 * ponha o segredo no `.env` e gere o link com `pnpm token <slug> <canal>`.
 */
export default defineEventHandler(async (event) => {
  const payload = await readBody(event)

  const token = process.env.GITHUB_TOKEN
  const deps: ConfirmationDeps = token
    ? createDeps({
        githubToken: token,
        githubRepo: process.env.GITHUB_REPO ?? '',
        turnstileSecret: process.env.TURNSTILE_SECRET ?? '',
        confirmationSecret: process.env.CONFIRMATION_SECRET,
        baseBranch: process.env.BRANCH_BASE,
      })
    : {
        secret: process.env.CONFIRMATION_SECRET ?? '',
        verifyTurnstile: async () => true,
        // Sem GitHub, o repositório é o próprio checkout: é o que faz a página
        // mostrar o YAML de verdade e o `removidos.yml` de verdade já no dev.
        readFile: async (path) => {
          const full = join(process.cwd(), path)
          return existsSync(full) ? readFileSync(full, 'utf8') : undefined
        },
        createPullRequest: async (request) => {
          const files = request.files.map((file) => `${file.path}\n${file.content}`).join('\n')
          const deletions = (request.deletions ?? []).map((path) => `apaga ${path}`).join('\n')
          console.info('[confirmacao dev] PR simulado:', request.title, `\n${request.branch}\n${deletions}\n${files}`)
          return { url: 'https://github.com/exemplo/mapa-das-patas/pull/0' }
        },
        today: isoToday,
      }

  const result = await processConfirmation(payload, deps)
  setResponseStatus(event, result.ok ? 201 : result.status)
  return result
})
