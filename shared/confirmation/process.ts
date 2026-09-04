import { isSeq, parse, parseDocument, stringify, type YAMLSeq } from 'yaml'
import { z } from 'zod'
import { BranchExistsError, type PullRequestInput } from '../registration/process'
import { parseRemovals, removalOf, type Removal } from '../removed'
import { initiativeSchema } from '../schema/initiative'
import { verify } from './token'

/**
 * Núcleo da Confirmação por link (ticket 20): a Iniciativa clica em "Confirmo"
 * ou "Quero sair" na página `/confirmar/<slug>` e sai um PR pronto, com
 * Turnstile e GitHub injetados, no mesmo molde de `registration/process.ts`.
 * As duas cascas (Pages Function e server route de dev) são finas.
 *
 * A regra que sustenta a fatia: **nada da Iniciativa vem do cliente**. O token
 * prova acesso ao canal oficial, não integridade do dado, então os dois
 * caminhos leem o repositório e escrevem a partir dele. Um POST "confirmo" com
 * `doacoes` adulterado viraria um PR com cara de confirmação trocando uma chave
 * PIX — é exatamente o risco contra o qual `allowOverwrite` foi travado no
 * Cadastro.
 *
 * Automático aqui significa "abre o PR", nunca "publica": o merge continua
 * humano, inclusive na remoção.
 */

export type ConfirmationAction = 'confirmar' | 'sair'

export interface ConfirmationDeps {
  /** Segredo do HMAC do token (`CONFIRMATION_SECRET`); vazio reprova tudo. */
  secret: string
  verifyTurnstile: (token: string) => Promise<boolean>
  /** Conteúdo utf8 do arquivo no branch base, ou `undefined` se não existe. */
  readFile: (path: string) => Promise<string | undefined>
  createPullRequest: (request: PullRequestInput) => Promise<{ url: string }>
  /** Data do pedido em AAAA-MM-DD, injetável para teste. */
  today: () => string
}

export type ConfirmationFailure =
  /** Corpo do POST fora de forma. */
  | 'payload'
  | 'anti-spam'
  /** Token ausente, forjado, adulterado ou vencido — sem distinguir qual. */
  | 'token'
  /** A Iniciativa não está mais publicada (remoção já mergeada). */
  | 'ausente'
  /** Já existe PR aberto para este pedido: o segundo clique. */
  | 'em-revisao'
  | 'envio'

export type ConfirmationResult =
  | { ok: true, action: ConfirmationAction, prUrl: string }
  | { ok: false, status: 400 | 403 | 404 | 409 | 502, reason: ConfirmationFailure, message: string }

/*
 * `strictObject`: o corpo tem três campos e só. Um payload que venha com
 * `initiative` junto é recusado no portão, em vez de ser silenciosamente
 * ignorado — a recusa é a documentação do contrato.
 */
const payloadSchema = z.strictObject({
  token: z.string().min(1),
  action: z.enum(['confirmar', 'sair']),
  turnstileToken: z.string().min(1),
})

function fail(
  status: 400 | 403 | 404 | 409 | 502,
  reason: ConfirmationFailure,
  message: string,
): ConfirmationResult {
  return { ok: false, status, reason, message }
}

/** Mesmo formato de `imagePath` no schema: nada fora de public/imagens. */
const imagePattern = /^\/imagens\/iniciativas\/[a-z0-9-]+\.webp$/

/**
 * Acrescenta o pedido ao `content/removidos.yml` **editando** o documento: o
 * arquivo tem um cabeçalho comentado que explica a regra para o Moderador, e
 * regerá-lo com `stringify` apagaria a explicação junto.
 */
function appendRemoval(yaml: string, removal: Removal): string {
  const doc = parseDocument(yaml)
  const published = doc.get('removidos')
  // `removidos:` sem nada (null) vale como lista vazia, como em shared/removed.ts
  const list: YAMLSeq = isSeq(published) ? published : (doc.createNode([]) as YAMLSeq)
  if (!isSeq(published)) doc.set('removidos', list)
  list.add(doc.createNode(removal))
  // `removidos: []` é sequência em fluxo; sem isto a entrada nova sairia
  // espremida numa linha só, ilegível no diff que o Moderador revisa.
  list.flow = false
  return doc.toString()
}

function verifiedPullRequest(
  yaml: string,
  slug: string,
  canal: string,
  today: string,
): PullRequestInput | undefined {
  let updated: Record<string, unknown>
  try {
    // Espalhar o publicado preserva a ordem das chaves e qualquer campo que o
    // schema não conheça; só `verificado` é escrito por aqui.
    updated = { ...(parse(yaml) as Record<string, unknown>), verificado: { em: today, canal } }
  } catch {
    return undefined
  }

  // O PR precisa nascer verde: YAML publicado que não passa no schema da CI
  // vira um PR quebrado com cara de confirmação da própria Iniciativa.
  const checked = initiativeSchema.safeParse(updated)
  if (!checked.success) return undefined

  const path = `content/iniciativas/${slug}.yml`
  const initiative = checked.data
  return {
    branch: `verificar/${slug}`,
    files: [{ path, content: stringify(updated), encoding: 'utf8' }],
    title: `Selo Verificado: ${initiative.nome} (${initiative.cidade}/${initiative.estado})`,
    body: [
      `## Selo Verificado: ${initiative.nome}`,
      '',
      `- **Arquivo**: \`${path}\``,
      `- **Confirmado em**: ${today}`,
      `- **Canal**: ${canal}`,
      '',
      'A própria Iniciativa clicou em "Confirmo" no link enviado para este canal.',
      'O único campo alterado é `verificado`: o resto do YAML foi lido do',
      'repositório, não do navegador de quem clicou.',
      '',
      'O selo diz que a Iniciativa conferiu os próprios dados, e nada além disso:',
      'não é auditoria das contas dela nem do uso das doações.',
      '',
      '---',
      '_Aberto pela página `/confirmar`. Revisar conforme CONTRIBUTING.md (regra nº 5)._',
    ].join('\n'),
    allowOverwrite: true,
  }
}

function removalPullRequest(
  yaml: string,
  removedYaml: string,
  slug: string,
  today: string,
): PullRequestInput | undefined {
  /*
   * O pedido de saída é atendido sem discussão, então nada aqui depende de o
   * YAML publicado estar bem formado: só a imagem é lida dele, e ainda assim
   * com o caminho conferido contra o formato do schema.
   */
  let imagem: unknown
  try {
    imagem = (parse(yaml) as Record<string, unknown> | null)?.imagem
  } catch {
    imagem = undefined
  }

  const yamlPath = `content/iniciativas/${slug}.yml`
  const deletions = [yamlPath]
  if (typeof imagem === 'string' && imagePattern.test(imagem)) {
    deletions.push(`public${imagem}`)
  }

  let removedFile: string
  try {
    // Slug já listado não vira entrada repetida; os arquivos saem do mesmo jeito.
    removedFile = removalOf(parseRemovals(removedYaml), slug)
      ? removedYaml
      : appendRemoval(removedYaml, { slug, em: today, pedido: 'oposicao' })
  } catch {
    return undefined
  }

  /*
   * Título e corpo fixos, sem `canal` e sem texto livre: eles só repetem o que
   * o merge vai publicar de qualquer jeito (o slug e a data em
   * `removidos.yml`). O canal por onde o link chegou não entra em lugar nenhum.
   */
  return {
    branch: `remover/${slug}`,
    files: [{ path: 'content/removidos.yml', content: removedFile, encoding: 'utf8' }],
    deletions,
    title: `Pedido de saída: ${slug}`,
    body: [
      `## Pedido de saída: \`${slug}\``,
      '',
      ...deletions.map((path) => `- **Apaga**: \`${path}\``),
      `- **Registra**: \`content/removidos.yml\` com \`pedido: oposicao\` em ${today}`,
      '',
      'Pedido de oposição feito pela própria Iniciativa, pelo link que só chegou',
      'ao canal oficial dela. É atendido sem discussão: revise e faça o merge,',
      'não negocie e não peça motivo (CONTRIBUTING.md regra nº 6 e `/privacidade`).',
      '',
      'A entrada em `removidos.yml` é o que impede um cadastro futuro, de boa-fé,',
      'de recolocar esta Iniciativa no site.',
      '',
      '---',
      '_Aberto pela página `/confirmar`._',
    ].join('\n'),
    allowOverwrite: true,
  }
}

export async function processConfirmation(
  payload: unknown,
  deps: ConfirmationDeps,
): Promise<ConfirmationResult> {
  const request = payloadSchema.safeParse(payload)
  if (!request.success) {
    return fail(400, 'payload', 'Pedido fora de forma. Abra o link de novo pela mensagem que você recebeu.')
  }

  /*
   * Anti-spam antes do token, como no Cadastro: sem isto o endpoint viraria um
   * oráculo para testar tokens em massa.
   */
  if (!(await deps.verifyTurnstile(request.data.turnstileToken))) {
    return fail(403, 'anti-spam', 'Verificação anti-spam falhou. Recarregue a página e tente de novo.')
  }

  const token = await verify(request.data.token, deps.secret)
  if (!token) {
    return fail(
      403,
      'token',
      'Este link não vale mais. Peça um novo pelo mesmo canal em que você recebeu o primeiro.',
    )
  }

  const { slug, canal } = token
  const yaml = await deps.readFile(`content/iniciativas/${slug}.yml`)
  if (yaml === undefined) {
    return fail(404, 'ausente', 'Esta iniciativa não está mais publicada no site.')
  }

  let input: PullRequestInput | undefined
  if (request.data.action === 'confirmar') {
    input = verifiedPullRequest(yaml, slug, canal, deps.today())
  } else {
    const removedYaml = await deps.readFile('content/removidos.yml')
    input = removedYaml === undefined
      ? undefined
      : removalPullRequest(yaml, removedYaml, slug, deps.today())
  }
  if (!input) {
    return fail(
      502,
      'envio',
      'Não conseguimos preparar seu pedido: há algo fora do lugar no cadastro desta '
      + 'iniciativa. Responda a mensagem em que você recebeu este link que a gente resolve.',
    )
  }

  try {
    const { url } = await deps.createPullRequest(input)
    return { ok: true, action: request.data.action, prUrl: url }
  } catch (error) {
    /*
     * Branch com nome determinístico dá idempotência de graça: o segundo clique
     * colide com o PR que o primeiro abriu, e a resposta é o estado do pedido,
     * não um erro. É o inverso do Cadastro, que carimba a branch com a hora
     * justamente para nunca colidir — lá cada envio é um pedido novo.
     */
    if (error instanceof BranchExistsError) {
      return fail(409, 'em-revisao', 'Já recebemos este pedido: ele está em revisão.')
    }
    return fail(502, 'envio', 'Não foi possível registrar seu pedido agora. Tente novamente em instantes.')
  }
}
