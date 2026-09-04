import { stringify } from 'yaml'
import { z } from 'zod'
import { imagePathOf, initiativeSchema, type Initiative } from '../schema/initiative'
import { generateSlug } from '../slug'
import { checkImageBase64 } from './image'

/**
 * Núcleo do Cadastro (ver CONTEXT.md): valida a submissão do formulário com o
 * MESMO schema da CI, gera o YAML e abre o PR, com Turnstile e GitHub
 * injetados para teste. A Function do Cloudflare e o server route de dev
 * são só cascas finas em volta desta função.
 */

export interface PullRequestFile {
  path: string
  content: string
  /** 'utf8' para o YAML e 'base64' para binário (a imagem). */
  encoding: 'utf8' | 'base64'
}

export interface PullRequestInput {
  branch: string
  /** Arquivos do commit, na ordem: o YAML e, quando houver, a imagem. */
  files: PullRequestFile[]
  /**
   * Caminhos apagados no mesmo PR. Só o pedido de saída usa isto: o YAML da
   * Iniciativa e, quando existe, a imagem dela (ver shared/confirmation/process).
   */
  deletions?: string[]
  title: string
  body: string
  /**
   * Editar arquivo que já existe é a exceção: correção, Selo Verificado e o
   * `removidos.yml` do pedido de saída. Em cadastro novo isto é `false` e o
   * adaptador se recusa a mandar o sha: sem essa trava, um "cadastro" com o
   * nome de uma Iniciativa já publicada reescreveria o YAML dela, chave PIX
   * inclusive, num PR que parece só mais um cadastro.
   */
  allowOverwrite: boolean
}

/**
 * A branch pedida já existe no repositório. Nomes de branch determinísticos
 * (`verificar/<slug>`) são o que dá idempotência sem KV e sem banco: o segundo
 * clique colide aqui, e quem chama responde "já recebemos, está em revisão"
 * em vez de abrir um PR gêmeo (ver ADR 0001 e o ticket 20).
 */
export class BranchExistsError extends Error {
  constructor(public readonly branch: string) {
    super(`branch já existe: ${branch}`)
    this.name = 'BranchExistsError'
  }
}

export interface RegistrationDeps {
  verifyTurnstile: (token: string) => Promise<boolean>
  /**
   * O arquivo já existe no branch base? Separa cadastro novo de colisão de
   * slug, e confirma que a correção aponta para uma Iniciativa publicada.
   */
  fileExists: (path: string) => Promise<boolean>
  createPullRequest: (request: PullRequestInput) => Promise<{ url: string }>
  /** Carimbo para nomes de branch únicos, injetável para teste. */
  now: () => string
}

export interface FieldError {
  /** Caminho do campo no formato de dados publicado (ex.: doacoes.0.chave). */
  field: string
  message: string
}

export type RegistrationResult =
  | { ok: true, prUrl: string }
  | { ok: false, status: 400 | 403 | 422 | 502, errors: FieldError[] }

const payloadSchema = z.object({
  initiative: z.unknown(),
  turnstileToken: z.string().min(1),
  /** Presente quando é uma correção: o slug do arquivo já publicado. */
  existingSlug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  /** Imagem em base64 (WebP quadrado gerado no browser), quando enviada. */
  image: z.string().min(1).optional(),
})

function fieldErrorsFrom(error: z.ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '(raiz)',
    message: issue.message,
  }))
}

function pullRequestBody(initiative: Initiative, slug: string): string {
  const sources = (initiative.doacoes ?? []).map((d) => `- [ ] ${d.tipo}: ${d.fonte}`).join('\n')
  return [
    `## Cadastro de Iniciativa: ${initiative.nome}`,
    '',
    `- **Local**: ${initiative.cidade} · ${initiative.estado}`,
    `- **Tipo**: ${initiative.tipo}`,
    `- **Arquivo**: \`content/iniciativas/${slug}.yml\``,
    ...(initiative.imagem
      ? [`- **Imagem**: \`public${initiative.imagem}\` (conferir se é mesmo da Iniciativa)`]
      : []),
    '',
    '### Fontes das Chaves de Doação (conferir antes do merge: regra nº 1)',
    '',
    sources || '_Sem doações cadastradas._',
    '',
    '---',
    '_Cadastro enviado pelo formulário do site. Revisar conforme CONTRIBUTING.md._',
  ].join('\n')
}

export async function processRegistration(
  payload: unknown,
  deps: RegistrationDeps,
): Promise<RegistrationResult> {
  const request = payloadSchema.safeParse(payload)
  if (!request.success) {
    return { ok: false, status: 400, errors: fieldErrorsFrom(request.error) }
  }

  if (!(await deps.verifyTurnstile(request.data.turnstileToken))) {
    return {
      ok: false,
      status: 403,
      errors: [{ field: '(anti-spam)', message: 'Verificação anti-spam falhou. Recarregue a página e tente de novo.' }],
    }
  }

  const parsed = initiativeSchema.safeParse(request.data.initiative)
  if (!parsed.success) {
    return { ok: false, status: 422, errors: fieldErrorsFrom(parsed.error) }
  }

  const isCorrection = request.data.existingSlug !== undefined
  const slug = request.data.existingSlug ?? generateSlug(parsed.data.nome)
  const branchPrefix = isCorrection ? 'correcao' : 'cadastro'
  const action = isCorrection ? 'Correção' : 'Cadastro'

  // Nome só de pontuação zera o slug e escreveria em `iniciativas/.yml`
  if (!slug) {
    return {
      ok: false,
      status: 422,
      errors: [{ field: 'nome', message: 'O nome precisa ter pelo menos uma letra ou número.' }],
    }
  }

  /*
   * O slug é caminho de arquivo, então a colisão é decidida aqui e não no
   * GitHub: cadastro novo não pode cair sobre YAML existente (seria sobrescrever
   * outra Iniciativa) e correção só vale sobre YAML que existe (senão um
   * `existingSlug` qualquer viraria um cadastro disfarçado de correção).
   * Nos dois casos é erro de campo com instrução, não 502 genérico.
   */
  const yamlPath = `content/iniciativas/${slug}.yml`
  const alreadyPublished = await deps.fileExists(yamlPath)
  if (isCorrection && !alreadyPublished) {
    return {
      ok: false,
      status: 422,
      errors: [{
        field: '(correção)',
        message: 'A iniciativa que você quer corrigir não foi encontrada. Abra a página dela no site e use o botão "Sugerir correção".',
      }],
    }
  }
  if (!isCorrection && alreadyPublished) {
    return {
      ok: false,
      status: 422,
      errors: [{
        field: 'nome',
        message: 'Já existe uma iniciativa publicada com esse nome. Se for a mesma, abra a página dela e use "Sugerir correção"; se for outra, inclua a cidade no nome para diferenciar.',
      }],
    }
  }

  // O caminho da imagem é derivado do slug, nunca do que o cliente mandou:
  // é o que impede um payload de escrever fora de public/imagens/iniciativas.
  const submittedImage = request.data.image
  if (submittedImage) {
    const check = checkImageBase64(submittedImage)
    if (!check.ok) {
      return { ok: false, status: 422, errors: [{ field: 'imagem', message: check.message }] }
    }
  }
  // Na correção sem novo upload, a imagem já publicada é mantida; em qualquer
  // caso o caminho é reescrito a partir do slug, nunca aceito como veio.
  const hasImage = submittedImage !== undefined || parsed.data.imagem !== undefined
  const initiative: Initiative = hasImage
    ? { ...parsed.data, imagem: imagePathOf(slug) }
    : parsed.data

  const files: PullRequestFile[] = [
    { path: yamlPath, content: stringify(initiative), encoding: 'utf8' },
  ]
  if (submittedImage && initiative.imagem) {
    files.push({ path: `public${initiative.imagem}`, content: submittedImage, encoding: 'base64' })
  }

  try {
    const { url } = await deps.createPullRequest({
      branch: `${branchPrefix}/${slug}-${deps.now()}`,
      files,
      title: `${action}: ${initiative.nome} (${initiative.cidade}/${initiative.estado})`,
      body: pullRequestBody(initiative, slug),
      allowOverwrite: isCorrection,
    })
    return { ok: true, prUrl: url }
  } catch {
    return {
      ok: false,
      status: 502,
      errors: [{ field: '(envio)', message: 'Não foi possível abrir o cadastro agora. Tente novamente em instantes.' }],
    }
  }
}
