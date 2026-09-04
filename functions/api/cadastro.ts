import { createDeps } from '../../shared/registration/adapters'
import { processRegistration, type RegistrationResult } from '../../shared/registration/process'

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

  /*
   * Exception aqui não pode escapar: sem este catch a Cloudflare responde com a
   * página de erro do runtime, o formulário recebe um corpo que não é o
   * combinado e a pessoa fica sem aviso nenhum na tela (ver app/utils/api-result.ts).
   * O corpo de erro é o mesmo formato dos outros, então o formulário sabe ler.
   */
  let result: RegistrationResult
  try {
    result = await processRegistration(
      payload,
      createDeps({
        githubToken: context.env.GITHUB_TOKEN,
        githubRepo: context.env.GITHUB_REPO,
        turnstileSecret: context.env.TURNSTILE_SECRET,
        baseBranch: context.env.BRANCH_BASE,
      }),
    )
  } catch (error) {
    console.error('[cadastro] erro não tratado:', error instanceof Error ? error.stack ?? error.message : error)
    return new Response(
      JSON.stringify({
        ok: false,
        status: 500,
        errors: [{ field: '(envio)', message: 'Algo deu errado do nosso lado. Tente novamente em instantes.' }],
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  return new Response(JSON.stringify(result), {
    status: result.ok ? 201 : result.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
