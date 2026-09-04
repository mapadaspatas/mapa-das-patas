import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { createDeps, timestampNow } from '../../shared/registration/adapters'
import { processRegistration, type RegistrationDeps } from '../../shared/registration/process'

/**
 * Rota de desenvolvimento: em produção o site é estático e o POST /api/cadastro
 * é atendido pela Cloudflare Pages Function (functions/api/cadastro.ts).
 * Sem GITHUB_TOKEN no ambiente, simula o PR para permitir testar o formulário.
 */
export default defineEventHandler(async (event) => {
  const payload = await readBody(event)

  const token = process.env.GITHUB_TOKEN
  const deps: RegistrationDeps = token
    ? createDeps({
        githubToken: token,
        githubRepo: process.env.GITHUB_REPO ?? '',
        turnstileSecret: process.env.TURNSTILE_SECRET ?? '',
        baseBranch: process.env.BRANCH_BASE,
      })
    : {
        verifyTurnstile: async () => true,
        createPullRequest: async (request) => {
          const files = request.files
            .map((file) => (file.encoding === 'base64'
              ? `${file.path} (${file.content.length} chars base64)`
              : `${file.path}\n${file.content}`))
            .join('\n')
          console.info('[cadastro dev] PR simulado:', request.title, `\n${files}`)
          return { url: 'https://github.com/exemplo/mapa-das-patas/pull/0' }
        },
        // Sem GitHub, a colisão de slug é conferida no próprio checkout: é o
        // que faz o aviso de nome repetido aparecer já no dev.
        fileExists: async (path) => existsSync(join(process.cwd(), path)),
        now: timestampNow,
      }

  const result = await processRegistration(payload, deps)
  setResponseStatus(event, result.ok ? 201 : result.status)
  return result
})
