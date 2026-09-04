import { describe, expect, it } from 'vitest'
import { fieldErrorsOf, isApiSuccess, problemOf } from '../app/utils/api-result'
import { strings } from '../app/utils/strings'

/*
 * O que estas checagens seguram: o formulário lia `response.errors` direto, e
 * quando o corpo não era o nosso (página de erro da Cloudflare no 502/504,
 * exception do runtime) `errors` virava `undefined`. O `v-if="errors.length"`
 * do template derrubava o render e a tela ficava em branco — a pessoa perdia o
 * que digitou e não recebia aviso nenhum. Daqui nunca sai `undefined`.
 */

/** Corpo que a Cloudflare devolve no lugar do nosso, resumido. */
const cloudflareBody = {
  title: 'Error 502: Bad gateway',
  status: 502,
  error_code: 502,
  cloudflare_error: true,
}

const generic = strings.register.unexpectedFailure

describe('mensagem genérica', () => {
  // Sem esta trava as checagens abaixo passariam comparando undefined com
  // undefined, e a chave poderia sumir de strings.ts sem ninguém notar.
  it('existe e tem texto', () => {
    expect(generic).toBeTypeOf('string')
    expect(generic.length).toBeGreaterThan(20)
  })
})

describe('isApiSuccess', () => {
  it('reconhece o sucesso da nossa API', () => {
    expect(isApiSuccess({ ok: true, prUrl: 'https://github.com/x/y/pull/1' })).toBe(true)
  })

  it('recusa a falha da nossa API', () => {
    expect(isApiSuccess({ ok: false, status: 422, errors: [] })).toBe(false)
  })

  it('recusa corpo que não é nosso', () => {
    expect(isApiSuccess(cloudflareBody)).toBe(false)
    expect(isApiSuccess('<html>error 1101</html>')).toBe(false)
    expect(isApiSuccess(null)).toBe(false)
    expect(isApiSuccess(undefined)).toBe(false)
  })
})

describe('fieldErrorsOf', () => {
  it('passa adiante os erros de campo da nossa API', () => {
    const errors = [{ field: 'nome', message: 'O nome precisa ter pelo menos uma letra ou número.' }]
    expect(fieldErrorsOf({ ok: false, status: 422, errors })).toEqual(errors)
  })

  it('nunca devolve lista vazia: corpo sem forma vira mensagem legível', () => {
    for (const body of [cloudflareBody, '<html>error 1101</html>', null, undefined, {}, { errors: [] }]) {
      const result = fieldErrorsOf(body)
      expect(result).toHaveLength(1)
      expect(result[0]!.message).toBe(generic)
      expect(result[0]!.field).toBe('(envio)')
    }
  })

  it('erro sem texto ganha a mensagem genérica, não uma linha muda', () => {
    expect(fieldErrorsOf({ errors: [{ field: 'nome' }, { field: 'cidade', message: '' }] })).toEqual([
      { field: 'nome', message: generic },
      { field: 'cidade', message: generic },
    ])
  })
})

describe('problemOf', () => {
  it('passa adiante motivo e mensagem da nossa API', () => {
    expect(problemOf({ ok: false, status: 409, reason: 'em-revisao', message: 'Já recebemos este pedido.' }))
      .toEqual({ reason: 'em-revisao', message: 'Já recebemos este pedido.' })
  })

  it('corpo sem forma vira mensagem legível, não alerta vazio', () => {
    for (const body of [cloudflareBody, '<html>error 1101</html>', null, undefined, {}, { message: '' }]) {
      expect(problemOf(body)).toEqual({ reason: 'envio', message: generic })
    }
  })
})
