import { processConfirmation, type ConfirmationResult } from '../../shared/confirmation/process'
import { createDeps } from '../../shared/registration/adapters'

/**
 * Cloudflare Pages Function: POST /api/confirmacao
 * Casca fina em volta de shared/confirmation/process.ts, como a do Cadastro.
 *
 * Secrets configurados no painel do Cloudflare Pages (nunca no cliente):
 * GITHUB_TOKEN, GITHUB_REPO, TURNSTILE_SECRET, CONFIRMATION_SECRET e
 * opcionalmente BRANCH_BASE.
 */

interface ConfirmationEnv {
  GITHUB_TOKEN: string
  GITHUB_REPO: string
  TURNSTILE_SECRET: string
  /** Segredo do HMAC dos links. Ausente, nenhum token vale: falha fechada. */
  CONFIRMATION_SECRET?: string
  BRANCH_BASE?: string
}

export async function onRequestPost(context: { request: Request, env: ConfirmationEnv }): Promise<Response> {
  let payload: unknown
  try {
    payload = await context.request.json()
  } catch {
    payload = undefined
  }

  // Mesma trava do Cadastro: exception que escapa vira tela sem aviso.
  let result: ConfirmationResult
  try {
    result = await processConfirmation(
      payload,
      createDeps({
        githubToken: context.env.GITHUB_TOKEN,
        githubRepo: context.env.GITHUB_REPO,
        turnstileSecret: context.env.TURNSTILE_SECRET,
        // Sem valor padrão, e nunca um segredo embutido: o adaptador passa string
        // vazia adiante e o núcleo reprova todo token, inclusive os legítimos.
        confirmationSecret: context.env.CONFIRMATION_SECRET,
        baseBranch: context.env.BRANCH_BASE,
      }),
    )
  } catch (error) {
    console.error('[confirmacao] erro não tratado:', error instanceof Error ? error.stack ?? error.message : error)
    return new Response(
      JSON.stringify({
        ok: false,
        status: 500,
        reason: 'envio',
        message: 'Algo deu errado do nosso lado. Tente novamente em instantes.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  return new Response(JSON.stringify(result), {
    status: result.ok ? 201 : result.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
