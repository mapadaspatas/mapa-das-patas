import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fieldErrorsOf, problemOf } from '../app/utils/api-result'
import { onRequestPost as cadastro } from '../functions/api/cadastro'
import { onRequestPost as confirmacao } from '../functions/api/confirmacao'
import type { ConfirmationDeps } from '../shared/confirmation/process'
import { expiryFromNow, mint } from '../shared/confirmation/token'
import { createDeps } from '../shared/registration/adapters'
import type { RegistrationDeps } from '../shared/registration/process'

/*
 * O que estas checagens cobrem: as duas Pages Functions, que até agora não eram
 * exercidas por nada. O núcleo em shared/ já tem suíte própria
 * (registration.test.ts, confirmation.test.ts) e o Cloudflare Pages empacota
 * functions/ com esbuild, que não confere tipo nem comportamento — então a
 * casca estreava em produção sem ninguém ter rodado uma linha dela.
 *
 * O que é da casca, e só dela: o corpo que não é JSON, o mapa
 * `ok ? 201 : result.status`, o repasse do `context.env` para o adaptador e o
 * catch que transforma exception em corpo do formato combinado.
 *
 * `createDeps` é dublado porque o de verdade fala com api.github.com e com o
 * Turnstile. Dublado, o núcleo roda inteiro e offline, e ainda dá para conferir
 * com que configuração a Function chamou o adaptador.
 */
vi.mock('../shared/registration/adapters', async (importOriginal) => ({
  ...await importOriginal<typeof import('../shared/registration/adapters')>(),
  createDeps: vi.fn(),
}))

const env = {
  GITHUB_TOKEN: 'ghp_de_teste',
  GITHUB_REPO: 'mapadaspatas/mapa-das-patas',
  TURNSTILE_SECRET: 'segredo-turnstile',
  BRANCH_BASE: 'main',
}

const secret = 'segredo-de-teste-bem-comprido'
const slug = 'abrigo-amor-miau'

const publishedYaml = `nome: Abrigo Amor Miau
tipo: ong
estado: CE
cidade: Juazeiro do Norte
descricao: Resgate, castração e adoção de gatos.
especies:
  - gatos
redes:
  instagram: abrigoamormiau
doacoes:
  - tipo: pix-cnpj
    chave: 12.345.678/0001-90
    fonte: https://instagram.com/p/abc
`

const removedYaml = 'removidos: []\n'

const validInitiative = {
  nome: 'Gatinhos do Bairro',
  tipo: 'projeto-informal',
  estado: 'SP',
  cidade: 'Campinas',
  descricao: 'Resgate e adoção de gatos no bairro.',
  especies: ['gatos'],
  redes: { instagram: 'gatinhosdobairro' },
  doacoes: [
    { tipo: 'pix-cnpj', chave: '12.345.678/0001-90', fonte: 'https://instagram.com/p/abc' },
  ],
}

/** O que `createDeps` devolveria, sem rede. */
function fakeDeps(
  overrides: Partial<RegistrationDeps & ConfirmationDeps> = {},
): RegistrationDeps & ConfirmationDeps {
  const files: Record<string, string> = {
    [`content/iniciativas/${slug}.yml`]: publishedYaml,
    'content/removidos.yml': removedYaml,
  }
  return {
    secret,
    verifyTurnstile: vi.fn(async () => true),
    fileExists: vi.fn(async () => false),
    readFile: vi.fn(async (path: string) => files[path]),
    createPullRequest: vi.fn(async () => ({ url: 'https://github.com/x/y/pull/1' })),
    now: () => '20260904120000',
    today: () => '2026-09-04',
    ...overrides,
  }
}

/*
 * Sem isto, `mock.calls[0]` é a primeira chamada do arquivo inteiro, não a do
 * teste que está rodando: as checagens de repasse do env conferem a chamada de
 * outro teste e passam a aprovar qualquer coisa.
 */
beforeEach(() => {
  vi.resetAllMocks()
})

/** POST como o formulário manda; `body` cru para poder mandar o que não é JSON. */
function post(path: string, body: string): Request {
  return new Request(`https://mapadaspatas.com.br${path}`, {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('functions/api/cadastro', () => {
  it('payload válido responde 201 com o corpo do núcleo', async () => {
    vi.mocked(createDeps).mockReturnValue(fakeDeps())

    const response = await cadastro({
      request: post('/api/cadastro', JSON.stringify({ initiative: validInitiative, turnstileToken: 'ok' })),
      env,
    })

    expect(response.status).toBe(201)
    expect(response.headers.get('Content-Type')).toBe('application/json')
    expect(await response.json()).toMatchObject({ ok: true, prUrl: 'https://github.com/x/y/pull/1' })
  })

  it('repassa o env do Pages para o adaptador, campo por campo', async () => {
    vi.mocked(createDeps).mockReturnValue(fakeDeps())

    await cadastro({
      request: post('/api/cadastro', JSON.stringify({ initiative: validInitiative, turnstileToken: 'ok' })),
      env,
    })

    /*
     * Sem isto, trocar o nome de um secret no painel (ou na interface do
     * adaptador) passa batido: os tipos continuam batendo e o valor só chega
     * vazio em produção.
     */
    expect(vi.mocked(createDeps).mock.calls[0]![0]).toEqual({
      githubToken: 'ghp_de_teste',
      githubRepo: 'mapadaspatas/mapa-das-patas',
      turnstileSecret: 'segredo-turnstile',
      baseBranch: 'main',
    })
  })

  it('corpo que não é JSON vira 400, não exception', async () => {
    vi.mocked(createDeps).mockReturnValue(fakeDeps())

    // É o que chega quando alguém posta na mão ou o fetch do formulário sai torto.
    const response = await cadastro({ request: post('/api/cadastro', 'isto não é json'), env })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ ok: false })
  })

  it('status do fracasso é o do núcleo, nunca 201', async () => {
    vi.mocked(createDeps).mockReturnValue(fakeDeps({ verifyTurnstile: vi.fn(async () => false) }))

    const response = await cadastro({
      request: post('/api/cadastro', JSON.stringify({ initiative: validInitiative, turnstileToken: 'ok' })),
      env,
    })

    expect(response.status).toBe(403)
  })

  it('exception vira 500 com corpo que o formulário sabe ler', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(createDeps).mockImplementation(() => {
      throw new Error('GITHUB_REPO ausente')
    })

    const response = await cadastro({
      request: post('/api/cadastro', JSON.stringify({ initiative: validInitiative, turnstileToken: 'ok' })),
      env,
    })
    const body = await response.json()

    expect(response.status).toBe(500)
    /*
     * O ponto da checagem: o corpo do 500 tem de atravessar o mesmo
     * `fieldErrorsOf` que a tela usa. Mudando o formato do erro na Function,
     * aqui cairia na mensagem genérica do fallback em vez desta — que é
     * exatamente como a tela em branco voltaria sem ninguém notar.
     */
    expect(fieldErrorsOf(body)).toEqual([
      { field: '(envio)', message: 'Algo deu errado do nosso lado. Tente novamente em instantes.' },
    ])
    expect(logged).toHaveBeenCalled()
    logged.mockRestore()
  })
})

describe('functions/api/confirmacao', () => {
  const token = () => mint(
    { slug, canal: 'DM do Instagram oficial', expiresAt: expiryFromNow(30, Date.now()) },
    secret,
  )

  it('token válido responde 201', async () => {
    vi.mocked(createDeps).mockReturnValue(fakeDeps())

    const response = await confirmacao({
      request: post('/api/confirmacao', JSON.stringify({
        token: await token(),
        action: 'confirmar',
        turnstileToken: 'ok',
      })),
      env: { ...env, CONFIRMATION_SECRET: secret },
    })

    expect(response.status).toBe(201)
    expect(response.headers.get('Content-Type')).toBe('application/json')
    expect(await response.json()).toMatchObject({ ok: true, action: 'confirmar' })
  })

  it('sem CONFIRMATION_SECRET no env, o adaptador recebe undefined (falha fechada)', async () => {
    vi.mocked(createDeps).mockReturnValue(fakeDeps({ secret: '' }))

    await confirmacao({
      request: post('/api/confirmacao', JSON.stringify({
        token: await token(),
        action: 'confirmar',
        turnstileToken: 'ok',
      })),
      env,
    })

    /*
     * O contrato do comentário na Function: nunca um segredo embutido, nunca um
     * padrão. `undefined` desce até o núcleo, que reprova todo token — inclusive
     * os legítimos. Um valor de fallback aqui seria uma chave mestra.
     */
    expect(vi.mocked(createDeps).mock.calls[0]![0].confirmationSecret).toBeUndefined()
  })

  it('corpo que não é JSON vira 400, não exception', async () => {
    vi.mocked(createDeps).mockReturnValue(fakeDeps())

    const response = await confirmacao({
      request: post('/api/confirmacao', 'isto não é json'),
      env: { ...env, CONFIRMATION_SECRET: secret },
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ ok: false, reason: 'payload' })
  })

  it('exception vira 500 com corpo que a tela de confirmação sabe ler', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(createDeps).mockImplementation(() => {
      throw new Error('token do bot sem escopo')
    })

    const response = await confirmacao({
      request: post('/api/confirmacao', JSON.stringify({
        token: await token(),
        action: 'confirmar',
        turnstileToken: 'ok',
      })),
      env: { ...env, CONFIRMATION_SECRET: secret },
    })
    const body = await response.json()

    expect(response.status).toBe(500)
    // Mesmo par do Cadastro, do outro lado: corpo do 500 x `problemOf` da tela.
    expect(problemOf(body)).toEqual({
      reason: 'envio',
      message: 'Algo deu errado do nosso lado. Tente novamente em instantes.',
    })
    expect(logged).toHaveBeenCalled()
    logged.mockRestore()
  })
})
