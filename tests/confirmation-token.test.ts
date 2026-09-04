import { describe, expect, it } from 'vitest'
import { expiryFromNow, mint, verify } from '../shared/confirmation/token'

/*
 * Este arquivo sustenta a fatia inteira do ticket 20: o token é a única prova
 * de que quem clicou tinha acesso ao canal oficial da Iniciativa. Se um token
 * adulterado passar aqui, um POST "confirmo" de qualquer pessoa vira um PR com
 * cara de confirmação.
 */

const secret = 'segredo-de-teste-bem-comprido'
const now = Date.UTC(2026, 8, 3)
const canal = 'DM do Instagram oficial'

/** Troca o payload de um token mantendo a assinatura original. */
function withPayload(token: string, payload: string): string {
  const signature = token.split('.')[1]
  const encoded = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${encoded}.${signature}`
}

describe('token de confirmação', () => {
  it('token recém-emitido volta com slug, canal e validade', async () => {
    const expiresAt = expiryFromNow(30, now)
    const token = await mint({ slug: 'abrigo-amor-miau', canal, expiresAt }, secret)

    expect(await verify(token, secret, now)).toEqual({ slug: 'abrigo-amor-miau', canal, expiresAt })
  })

  it('payload adulterado reprova', async () => {
    const expiresAt = expiryFromNow(30, now)
    const token = await mint({ slug: 'abrigo-amor-miau', canal, expiresAt }, secret)

    // Mesma Iniciativa, canal inventado: o canal vai publicado no YAML
    const adulterado = withPayload(token, `abrigo-amor-miau|auditoria completa das contas|${expiresAt}`)
    expect(await verify(adulterado, secret, now)).toBeUndefined()
  })

  it('slug trocado reprova, mesmo com a assinatura de um token válido', async () => {
    const expiresAt = expiryFromNow(30, now)
    const token = await mint({ slug: 'abrigo-amor-miau', canal, expiresAt }, secret)

    const outraIniciativa = withPayload(token, `gatil-hope|${canal}|${expiresAt}`)
    expect(await verify(outraIniciativa, secret, now)).toBeUndefined()
  })

  it('validade esticada no payload reprova', async () => {
    const expiresAt = expiryFromNow(30, now)
    const token = await mint({ slug: 'abrigo-amor-miau', canal, expiresAt }, secret)

    const eterno = withPayload(token, `abrigo-amor-miau|${canal}|${expiryFromNow(3650, now)}`)
    expect(await verify(eterno, secret, now)).toBeUndefined()
  })

  it('token expirado reprova, com a assinatura intacta', async () => {
    const expiresAt = expiryFromNow(30, now)
    const token = await mint({ slug: 'abrigo-amor-miau', canal, expiresAt }, secret)

    expect(await verify(token, secret, expiresAt * 1000 - 1)).toBeDefined()
    expect(await verify(token, secret, expiresAt * 1000 + 1)).toBeUndefined()
  })

  it('segredo errado reprova', async () => {
    const token = await mint({ slug: 'abrigo-amor-miau', canal, expiresAt: expiryFromNow(30, now) }, secret)

    expect(await verify(token, 'outro-segredo', now)).toBeUndefined()
    // Segredo vazio nunca vale: é o estado da Function sem o secret configurado
    expect(await verify(token, '', now)).toBeUndefined()
  })

  it('token torto não explode: volta indefinido', async () => {
    const token = await mint({ slug: 'abrigo-amor-miau', canal, expiresAt: expiryFromNow(30, now) }, secret)
    const [payload, signature] = token.split('.')

    for (const torto of ['', 'sem-ponto', '.', `${payload}.`, `${payload}.${signature!.slice(0, 8)}`, `${payload}.${signature}.extra`, '@@@.@@@']) {
      expect(await verify(torto, secret, now)).toBeUndefined()
    }
  })

  it('canal com barra vertical é recusado na emissão, não na leitura', async () => {
    await expect(mint({ slug: 'abrigo-amor-miau', canal: 'DM | e-mail', expiresAt: expiryFromNow(30, now) }, secret))
      .rejects.toThrow(/canal/i)
  })

  it('slug fora do formato de arquivo é recusado na emissão', async () => {
    await expect(mint({ slug: '../../etc/passwd', canal, expiresAt: expiryFromNow(30, now) }, secret))
      .rejects.toThrow(/slug/i)
  })

  it('canal com acento sobrevive à ida e à volta', async () => {
    const expiresAt = expiryFromNow(30, now)
    const token = await mint({ slug: 'gatil-hope', canal: 'e-mail institucional (confirmação)', expiresAt }, secret)

    expect((await verify(token, secret, now))?.canal).toBe('e-mail institucional (confirmação)')
  })
})
