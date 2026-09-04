import type { FieldError } from '../../shared/registration/process'
import { strings } from './strings'

/*
 * Fronteira entre o corpo que chega de /api/* e o que a tela consome.
 *
 * Os dois envios do site usam `ignoreResponseError: true` de propósito: o
 * corpo é lido em qualquer status, e é assim que 400/403/422 viram erro por
 * campo em vez de "falha de conexão". Só que o corpo não é confiável sempre.
 * Quando a Function estoura antes de responder (exception, CPU) ou a Cloudflare
 * devolve página de erro própria, o que chega é HTML ou um JSON de outra forma
 * — sem `ok`, sem `errors` e sem `message`.
 *
 * Ler esse corpo como se fosse o resultado combinado é o que deixava a tela em
 * branco: `errors` virava `undefined`, e o `v-if="errors.length"` do formulário
 * derrubava o render inteiro. A pessoa perdia o que tinha digitado e não recebia
 * aviso nenhum. Daqui não sai `undefined`: o que não tem forma vira mensagem.
 */

/**
 * O corpo é o sucesso que a nossa API devolve?
 *
 * Confere só o discriminante, e isso basta: `ok: true` só existe no corpo que
 * `processRegistration`/`processConfirmation` montam — página de erro da
 * Cloudflare e exception do runtime nunca têm esse campo.
 */
export function isApiSuccess<T extends object>(body: unknown): body is T & { ok: true } {
  return typeof body === 'object' && body !== null && (body as { ok?: unknown }).ok === true
}

/** Erros de campo do corpo; sem eles, uma mensagem que a pessoa consegue ler. */
export function fieldErrorsOf(body: unknown): FieldError[] {
  const errors = (body as { errors?: unknown } | null | undefined)?.errors
  if (!Array.isArray(errors) || errors.length === 0) {
    return [{ field: '(envio)', message: strings.register.unexpectedFailure }]
  }
  // Item fora de forma não quebra o render (campo vazio na lista), mas erro sem
  // texto é o mesmo que silêncio: é ele que ganha a mensagem genérica.
  return errors.map((error: unknown) => {
    const { field, message } = (error ?? {}) as { field?: unknown, message?: unknown }
    return {
      field: typeof field === 'string' ? field : '(envio)',
      message: typeof message === 'string' && message !== ''
        ? message
        : strings.register.unexpectedFailure,
    }
  })
}

/** Motivo e mensagem do corpo da Confirmação; sem eles, a mensagem genérica. */
export function problemOf(body: unknown): { reason: string, message: string } {
  const problem = (body ?? {}) as { reason?: unknown, message?: unknown }
  if (typeof problem.message !== 'string' || problem.message === '') {
    return { reason: 'envio', message: strings.register.unexpectedFailure }
  }
  return {
    reason: typeof problem.reason === 'string' ? problem.reason : 'envio',
    message: problem.message,
  }
}
