import { describe, expect, it, vi } from 'vitest'
import { parse } from 'yaml'
import { processConfirmation, type ConfirmationDeps } from '../shared/confirmation/process'
import { expiryFromNow, mint } from '../shared/confirmation/token'
import { BranchExistsError } from '../shared/registration/process'
import { parseRemovals, removalOf } from '../shared/removed'
import { initiativeSchema } from '../shared/schema/initiative'

const secret = 'segredo-de-teste-bem-comprido'
const now = Date.UTC(2026, 8, 3)
const canal = 'DM do Instagram oficial'
const slug = 'abrigo-amor-miau'
const yamlPath = `content/iniciativas/${slug}.yml`

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
imagem: /imagens/iniciativas/abrigo-amor-miau.webp
`

const removedYaml = `# Iniciativas que pediram para sair do diretório (LGPD art. 18: oposição/eliminação).
#
# Regra para Moderador: antes de aprovar um Cadastro, confira se o slug está aqui.

removidos: []
`

function fakeDeps(overrides: Partial<ConfirmationDeps> = {}): ConfirmationDeps {
  const files: Record<string, string> = {
    [yamlPath]: publishedYaml,
    'content/removidos.yml': removedYaml,
  }
  return {
    secret,
    verifyTurnstile: vi.fn(async () => true),
    readFile: vi.fn(async (path: string) => files[path]),
    createPullRequest: vi.fn(async () => ({ url: 'https://github.com/x/y/pull/9' })),
    today: () => '2026-09-03',
    ...overrides,
  }
}

const validToken = () => mint({ slug, canal, expiresAt: expiryFromNow(30, now) }, secret)

describe('processConfirmation · confirmar', () => {
  it('token válido abre PR que só acrescenta o campo verificado', async () => {
    const deps = fakeDeps()
    const result = await processConfirmation(
      { token: await validToken(), action: 'confirmar', turnstileToken: 'ok' },
      deps,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.prUrl).toBe('https://github.com/x/y/pull/9')
    expect(result.action).toBe('confirmar')

    const call = vi.mocked(deps.createPullRequest).mock.calls[0]![0]
    expect(call.files).toHaveLength(1)
    expect(call.files[0]!.path).toBe(yamlPath)
    expect(call.deletions ?? []).toEqual([])
    // Branch determinística: é ela que dá idempotência sem KV
    expect(call.branch).toBe(`verificar/${slug}`)
    expect(call.allowOverwrite).toBe(true)

    const written = parse(call.files[0]!.content)
    expect(written.verificado).toEqual({ em: '2026-09-03', canal })
    // O resto do YAML é o publicado, campo por campo
    expect({ ...written, verificado: undefined }).toEqual({ ...parse(publishedYaml), verificado: undefined })
    // E o que vai para o PR passa no mesmo schema da CI
    expect(initiativeSchema.safeParse(written).success).toBe(true)
  })

  it('a Iniciativa gravada vem do repositório, nunca do cliente', async () => {
    const deps = fakeDeps()
    const result = await processConfirmation(
      {
        token: await validToken(),
        action: 'confirmar',
        turnstileToken: 'ok',
        // Um "confirmo" com a chave PIX trocada é exatamente o ataque contra o
        // qual `allowOverwrite` foi travado no cadastro
        initiative: { nome: 'Abrigo Amor Miau', doacoes: [{ tipo: 'pix-cnpj', chave: '11.111.111/0001-11' }] },
      },
      deps,
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(400)
    expect(deps.createPullRequest).not.toHaveBeenCalled()
  })

  it('o corpo do PR nomeia o canal, que é o que o merge vai publicar', async () => {
    const deps = fakeDeps()
    await processConfirmation({ token: await validToken(), action: 'confirmar', turnstileToken: 'ok' }, deps)

    const call = vi.mocked(deps.createPullRequest).mock.calls[0]![0]
    expect(call.title).toContain('Abrigo Amor Miau')
    expect(call.body).toContain(canal)
  })
})

describe('processConfirmation · sair', () => {
  it('apaga o YAML e a imagem e registra o slug em removidos.yml', async () => {
    const deps = fakeDeps()
    const result = await processConfirmation(
      { token: await validToken(), action: 'sair', turnstileToken: 'ok' },
      deps,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.action).toBe('sair')

    const call = vi.mocked(deps.createPullRequest).mock.calls[0]![0]
    expect(call.branch).toBe(`remover/${slug}`)
    expect(call.deletions).toEqual([yamlPath, `public/imagens/iniciativas/${slug}.webp`])

    expect(call.files).toHaveLength(1)
    expect(call.files[0]!.path).toBe('content/removidos.yml')
    const written = call.files[0]!.content
    // O arquivo é editado, não regerado: o cabeçalho comentado sobrevive
    expect(written).toContain('# Iniciativas que pediram para sair do diretório')
    expect(removalOf(parseRemovals(written), slug)).toEqual({
      slug,
      em: '2026-09-03',
      pedido: 'oposicao',
    })
  })

  it('título e corpo do pedido de saída não expõem canal nem token', async () => {
    const deps = fakeDeps()
    const token = await validToken()
    await processConfirmation({ token, action: 'sair', turnstileToken: 'ok' }, deps)

    const call = vi.mocked(deps.createPullRequest).mock.calls[0]![0]
    const text = `${call.title}\n${call.body}`
    expect(text).not.toContain(canal)
    expect(text).not.toContain(token)
    // Só o que o merge já vai publicar: o slug e a data
    expect(text).toContain(slug)
  })

  it('Iniciativa sem imagem apaga só o YAML', async () => {
    const semImagem = publishedYaml.replace(/^imagem:.*\n/m, '')
    const deps = fakeDeps({
      readFile: async (path) => (path === yamlPath ? semImagem : removedYaml),
    })
    await processConfirmation({ token: await validToken(), action: 'sair', turnstileToken: 'ok' }, deps)

    const call = vi.mocked(deps.createPullRequest).mock.calls[0]![0]
    expect(call.deletions).toEqual([yamlPath])
  })

  it('removidos.yml com a lista vazia em branco também recebe a entrada', async () => {
    const deps = fakeDeps({
      readFile: async (path) => (path === yamlPath ? publishedYaml : '# cabeçalho\nremovidos:\n'),
    })
    await processConfirmation({ token: await validToken(), action: 'sair', turnstileToken: 'ok' }, deps)

    const call = vi.mocked(deps.createPullRequest).mock.calls[0]![0]
    expect(parseRemovals(call.files[0]!.content)).toHaveLength(1)
  })

  it('slug já registrado não vira entrada repetida', async () => {
    const jaListado = '# cabeçalho\nremovidos:\n'
      + `  - slug: ${slug}\n    em: 2026-08-01\n    pedido: oposicao\n`
    const deps = fakeDeps({
      readFile: async (path) => (path === yamlPath ? publishedYaml : jaListado),
    })
    await processConfirmation({ token: await validToken(), action: 'sair', turnstileToken: 'ok' }, deps)

    const call = vi.mocked(deps.createPullRequest).mock.calls[0]![0]
    const removals = parseRemovals(call.files[0]!.content)
    expect(removals).toHaveLength(1)
    expect(removals[0]!.em).toBe('2026-08-01')
    // O pedido continua sendo atendido: os arquivos saem do mesmo jeito
    expect(call.deletions).toContain(yamlPath)
  })
})

describe('processConfirmation · recusas', () => {
  it('token de outro segredo devolve 403 sem tocar no GitHub', async () => {
    const deps = fakeDeps()
    const forjado = await mint({ slug, canal, expiresAt: expiryFromNow(30, now) }, 'outro-segredo')
    const result = await processConfirmation({ token: forjado, action: 'confirmar', turnstileToken: 'ok' }, deps)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(403)
    expect(result.reason).toBe('token')
    expect(deps.readFile).not.toHaveBeenCalled()
    expect(deps.createPullRequest).not.toHaveBeenCalled()
  })

  it('token expirado devolve 403', async () => {
    const deps = fakeDeps()
    const vencido = await mint({ slug, canal, expiresAt: Math.floor(now / 1000) - 1 }, secret)
    const result = await processConfirmation({ token: vencido, action: 'confirmar', turnstileToken: 'ok' }, deps)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(403)
    expect(deps.createPullRequest).not.toHaveBeenCalled()
  })

  it('Turnstile reprovado bloqueia antes de o arquivo ser lido', async () => {
    const deps = fakeDeps({ verifyTurnstile: vi.fn(async () => false) })
    const result = await processConfirmation({ token: await validToken(), action: 'confirmar', turnstileToken: 'x' }, deps)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(403)
    expect(result.reason).toBe('anti-spam')
    expect(deps.readFile).not.toHaveBeenCalled()
  })

  it('segundo clique responde "em revisão" em vez de abrir um PR gêmeo', async () => {
    const deps = fakeDeps({
      createPullRequest: vi.fn(async () => {
        throw new BranchExistsError(`verificar/${slug}`)
      }),
    })
    const result = await processConfirmation({ token: await validToken(), action: 'confirmar', turnstileToken: 'ok' }, deps)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(409)
    expect(result.reason).toBe('em-revisao')
  })

  it('Iniciativa que já saiu do site devolve 404, não um PR vazio', async () => {
    const deps = fakeDeps({ readFile: async () => undefined })
    const result = await processConfirmation({ token: await validToken(), action: 'sair', turnstileToken: 'ok' }, deps)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(404)
    expect(result.reason).toBe('ausente')
    expect(deps.createPullRequest).not.toHaveBeenCalled()
  })

  it('falha do GitHub devolve 502', async () => {
    const deps = fakeDeps({
      createPullRequest: vi.fn(async () => {
        throw new Error('GitHub fora do ar')
      }),
    })
    const result = await processConfirmation({ token: await validToken(), action: 'confirmar', turnstileToken: 'ok' }, deps)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(502)
  })

  it('sem CONFIRMATION_SECRET configurado nenhum token vale', async () => {
    const deps = fakeDeps({ secret: '' })
    const result = await processConfirmation({ token: await validToken(), action: 'confirmar', turnstileToken: 'ok' }, deps)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(403)
    expect(result.reason).toBe('token')
  })

  it.each([
    ['payload sem forma', 'lixo'],
    ['ação desconhecida', { token: 'x', action: 'apagar-tudo', turnstileToken: 'ok' }],
    ['sem token', { action: 'confirmar', turnstileToken: 'ok' }],
  ])('%s devolve 400', async (_nome, payload) => {
    const deps = fakeDeps()
    const result = await processConfirmation(payload, deps)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(400)
    expect(deps.createPullRequest).not.toHaveBeenCalled()
  })
})
