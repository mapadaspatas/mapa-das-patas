import { describe, expect, it, vi } from 'vitest'
import { parse } from 'yaml'
import { imageMaxBytes } from '../shared/registration/image'
import { processRegistration, type RegistrationDeps } from '../shared/registration/process'
import { initiativeSchema } from '../shared/schema/initiative'

/** WebP mínimo válido: container RIFF com o tag WEBP e recheio qualquer. */
function fakeWebp(bytes = 64): string {
  const buffer = new Uint8Array(bytes)
  buffer.set([0x52, 0x49, 0x46, 0x46], 0)
  buffer.set([0x57, 0x45, 0x42, 0x50], 8)
  return btoa(String.fromCharCode(...buffer))
}

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

function fakeDeps(overrides: Partial<RegistrationDeps> = {}): RegistrationDeps {
  return {
    verifyTurnstile: vi.fn(async () => true),
    fileExists: vi.fn(async () => false),
    createPullRequest: vi.fn(async () => ({ url: 'https://github.com/x/y/pull/1' })),
    now: () => '20260817120000',
    ...overrides,
  }
}

describe('processRegistration', () => {
  it('payload válido abre PR com YAML válido e corpo legível com as Fontes', async () => {
    const deps = fakeDeps()
    const result = await processRegistration(
      { initiative: validInitiative, turnstileToken: 'token' },
      deps,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.prUrl).toBe('https://github.com/x/y/pull/1')

    const call = vi.mocked(deps.createPullRequest).mock.calls[0]![0]
    expect(call.files).toHaveLength(1)
    expect(call.files[0]!.path).toBe('content/iniciativas/gatinhos-do-bairro.yml')
    expect(call.files[0]!.encoding).toBe('utf8')
    expect(call.branch).toBe('cadastro/gatinhos-do-bairro-20260817120000')
    // Cadastro novo nunca vai com licença para editar arquivo existente
    expect(call.allowOverwrite).toBe(false)
    // O YAML gerado precisa passar no mesmo schema da CI
    expect(initiativeSchema.safeParse(parse(call.files[0]!.content)).success).toBe(true)
    // Fontes destacadas no corpo para o Moderador conferir
    expect(call.body).toContain('https://instagram.com/p/abc')
    expect(call.title).toContain('Gatinhos do Bairro')
  })

  it('payload inválido retorna erros campo a campo sem chamar o GitHub', async () => {
    const deps = fakeDeps()
    const result = await processRegistration(
      {
        initiative: { ...validInitiative, doacoes: [{ tipo: 'pix-cnpj', chave: '12.345.678/0001-90' }] },
        turnstileToken: 'token',
      },
      deps,
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(422)
    expect(result.errors.some((e) => e.field.includes('doacoes'))).toBe(true)
    expect(deps.createPullRequest).not.toHaveBeenCalled()
  })

  it.each(['123.456.789-09', 'doacao@exemplo.org', '+5511994773463'])(
    'chave de pessoa física (%s) é rejeitada com a mensagem da política',
    async (chave) => {
      const deps = fakeDeps()
      const result = await processRegistration(
        {
          initiative: {
            ...validInitiative,
            doacoes: [{ tipo: 'pix-cnpj', chave, fonte: 'https://x.com/p' }],
          },
          turnstileToken: 'token',
        },
        deps,
      )

      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.errors.some((e) => e.message.includes('pessoa física'))).toBe(true)
      expect(deps.createPullRequest).not.toHaveBeenCalled()
    },
  )

  it('Turnstile reprovado bloqueia sem chamar o GitHub', async () => {
    const deps = fakeDeps({ verifyTurnstile: vi.fn(async () => false) })
    const result = await processRegistration(
      { initiative: validInitiative, turnstileToken: 'token-ruim' },
      deps,
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(403)
    expect(deps.createPullRequest).not.toHaveBeenCalled()
  })

  it('correção de Iniciativa existente edita o arquivo dela, não cria um novo', async () => {
    const deps = fakeDeps({ fileExists: async () => true })
    const result = await processRegistration(
      {
        initiative: { ...validInitiative, nome: 'Nome Atualizado Diferente' },
        turnstileToken: 'token',
        existingSlug: 'gatinhos-do-bairro',
      },
      deps,
    )

    expect(result.ok).toBe(true)
    const call = vi.mocked(deps.createPullRequest).mock.calls[0]![0]
    // Mantém o arquivo original mesmo com nome alterado
    expect(call.files[0]!.path).toBe('content/iniciativas/gatinhos-do-bairro.yml')
    expect(call.branch).toBe('correcao/gatinhos-do-bairro-20260817120000')
    expect(call.title).toContain('Correção')
    // Só a correção pode editar o YAML que já está publicado
    expect(call.allowOverwrite).toBe(true)
  })

  it('slug existente malformado é rejeitado', async () => {
    const deps = fakeDeps()
    const result = await processRegistration(
      { initiative: validInitiative, turnstileToken: 'token', existingSlug: '../../../etc/passwd' },
      deps,
    )
    expect(result.ok).toBe(false)
    expect(deps.createPullRequest).not.toHaveBeenCalled()
  })

  it('imagem enviada vira segundo arquivo do PR e campo imagem no YAML', async () => {
    const deps = fakeDeps()
    const result = await processRegistration(
      { initiative: validInitiative, turnstileToken: 'token', image: fakeWebp() },
      deps,
    )

    expect(result.ok).toBe(true)
    const call = vi.mocked(deps.createPullRequest).mock.calls[0]![0]
    expect(call.files).toHaveLength(2)
    expect(call.files[1]!.path).toBe('public/imagens/iniciativas/gatinhos-do-bairro.webp')
    expect(call.files[1]!.encoding).toBe('base64')
    // O caminho publicado sai do slug, não de nada que o cliente tenha mandado
    expect(parse(call.files[0]!.content).imagem).toBe('/imagens/iniciativas/gatinhos-do-bairro.webp')
    expect(call.body).toContain('public/imagens/iniciativas/gatinhos-do-bairro.webp')
  })

  it('caminho de imagem forjado no payload é reescrito a partir do slug', async () => {
    const deps = fakeDeps()
    await processRegistration(
      {
        initiative: { ...validInitiative, imagem: '/imagens/iniciativas/outra-iniciativa.webp' },
        turnstileToken: 'token',
        image: fakeWebp(),
      },
      deps,
    )

    const call = vi.mocked(deps.createPullRequest).mock.calls[0]![0]
    expect(call.files[1]!.path).toBe('public/imagens/iniciativas/gatinhos-do-bairro.webp')
  })

  it('correção sem novo upload preserva a imagem já publicada', async () => {
    const deps = fakeDeps({ fileExists: async () => true })
    await processRegistration(
      {
        initiative: { ...validInitiative, imagem: '/imagens/iniciativas/gatinhos-do-bairro.webp' },
        turnstileToken: 'token',
        existingSlug: 'gatinhos-do-bairro',
      },
      deps,
    )

    const call = vi.mocked(deps.createPullRequest).mock.calls[0]![0]
    expect(call.files).toHaveLength(1)
    expect(parse(call.files[0]!.content).imagem).toBe('/imagens/iniciativas/gatinhos-do-bairro.webp')
  })

  it('arquivo que não é WebP é recusado sem chamar o GitHub', async () => {
    const deps = fakeDeps()
    const result = await processRegistration(
      { initiative: validInitiative, turnstileToken: 'token', image: btoa('nao sou uma imagem') },
      deps,
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(422)
    expect(result.errors[0]!.field).toBe('imagem')
    expect(deps.createPullRequest).not.toHaveBeenCalled()
  })

  it('imagem acima do limite de bytes é recusada', async () => {
    const deps = fakeDeps()
    const result = await processRegistration(
      { initiative: validInitiative, turnstileToken: 'token', image: fakeWebp(imageMaxBytes + 1) },
      deps,
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0]!.message).toContain('limite')
    expect(deps.createPullRequest).not.toHaveBeenCalled()
  })

  it('cadastro novo com nome de Iniciativa já publicada é recusado, não sobrescreve', async () => {
    const deps = fakeDeps({ fileExists: vi.fn(async () => true) })
    const result = await processRegistration(
      { initiative: validInitiative, turnstileToken: 'token' },
      deps,
    )

    expect(deps.fileExists).toHaveBeenCalledWith('content/iniciativas/gatinhos-do-bairro.yml')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(422)
    expect(result.errors[0]!.field).toBe('nome')
    expect(result.errors[0]!.message).toContain('Sugerir correção')
    expect(deps.createPullRequest).not.toHaveBeenCalled()
  })

  it('correção de slug inexistente é recusada, para não virar cadastro disfarçado', async () => {
    const deps = fakeDeps({ fileExists: async () => false })
    const result = await processRegistration(
      { initiative: validInitiative, turnstileToken: 'token', existingSlug: 'nao-existe' },
      deps,
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(422)
    expect(deps.createPullRequest).not.toHaveBeenCalled()
  })

  it('nome sem letra nem número é recusado antes de virar caminho de arquivo', async () => {
    const deps = fakeDeps()
    const result = await processRegistration(
      { initiative: { ...validInitiative, nome: '!!!' }, turnstileToken: 'token' },
      deps,
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0]!.field).toBe('nome')
    expect(deps.createPullRequest).not.toHaveBeenCalled()
  })

  it('payload sem forma esperada retorna 400', async () => {
    const result = await processRegistration('lixo', fakeDeps())
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(400)
  })
})
