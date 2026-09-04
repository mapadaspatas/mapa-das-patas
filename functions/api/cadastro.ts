import { createDeps } from '../../shared/registration/adapters'
import { processRegistration } from '../../shared/registration/process'

/**
 * Cloudflare Pages Function: POST /api/cadastro
 * Secrets configurados no painel do Cloudflare Pages (nunca no cliente):
 * GITHUB_TOKEN, GITHUB_REPO, TURNSTILE_SECRET e opcionalmente BRANCH_BASE.
 */

interface RegistrationEnv {
  GITHUB_TOKEN: string
  GITHUB_REPO: string
  TURNSTILE_SECRET: string
  BRANCH_BASE?: string
}

export async function onRequestPost(context: { request: Request, env: RegistrationEnv }): Promise<Response> {
  let payload: unknown
  try {
    payload = await context.request.json()
  } catch {
    payload = undefined
  }

  const result = await processRegistration(
    payload,
    createDeps({
      githubToken: context.env.GITHUB_TOKEN,
      githubRepo: context.env.GITHUB_REPO,
      turnstileSecret: context.env.TURNSTILE_SECRET,
      baseBranch: context.env.BRANCH_BASE,
    }),
  )

  return new Response(JSON.stringify(result), {
    status: result.ok ? 201 : result.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
