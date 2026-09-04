import type { ConfirmationDeps } from '../confirmation/process'
import { BranchExistsError, type PullRequestInput, type RegistrationDeps } from './process'

/**
 * Implementações reais das dependências do Cadastro e da Confirmação, usadas
 * pelas Cloudflare Pages Functions (produção) e pelos server routes de dev.
 * Os núcleos testados ficam em `process.ts`; aqui é só I/O.
 */

export interface RegistrationConfig {
  githubToken: string
  /** ex.: "usuario/mapa-das-patas" */
  githubRepo: string
  baseBranch?: string
  turnstileSecret: string
  /** Segredo do HMAC dos links de confirmação; ausente reprova todo token. */
  confirmationSecret?: string
}

/**
 * Carimbo dos nomes de branch (AAAAMMDDHHMMSS). Vive aqui, junto das outras
 * implementações reais, porque o server route de dev usa o mesmo formato.
 */
export const timestampNow = () => new Date().toISOString().replace(/\D/g, '').slice(0, 14)

/** Data do dia em AAAA-MM-DD, o formato de `verificado.em` e `removidos.em`. */
export const isoToday = () => new Date().toISOString().slice(0, 10)

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(value: string): string {
  // O GitHub quebra o base64 em linhas de 60 caracteres.
  const binary = atob(value.replace(/\s+/g, ''))
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)))
}

export function createDeps(config: RegistrationConfig): RegistrationDeps & ConfirmationDeps {
  const base = config.baseBranch ?? 'main'
  const api = `https://api.github.com/repos/${config.githubRepo}`
  const headers = {
    'Authorization': `Bearer ${config.githubToken}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'mapa-das-patas-cadastro',
    'Content-Type': 'application/json',
  }

  /** Metadados do arquivo no branch base, ou undefined quando ele não existe. */
  async function contentsOf(path: string): Promise<{ sha: string, content?: string, encoding?: string } | undefined> {
    const response = await fetch(`${api}/contents/${path}?ref=${base}`, { headers })
    if (response.status === 404) return undefined
    if (!response.ok) {
      throw new Error(`GitHub GET /contents/${path}: ${response.status} ${await response.text()}`)
    }
    return await response.json() as { sha: string, content?: string, encoding?: string }
  }

  const shaOf = async (path: string) => (await contentsOf(path))?.sha

  async function github(path: string, method: string, body?: unknown) {
    const response = await fetch(`${api}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (!response.ok) {
      throw new Error(`GitHub ${method} ${path}: ${response.status} ${await response.text()}`)
    }
    return response.json() as Promise<Record<string, any>>
  }

  async function refExists(branch: string): Promise<boolean> {
    const response = await fetch(`${api}/git/ref/heads/${branch}`, { headers })
    if (response.status === 404) return false
    if (!response.ok) {
      throw new Error(`GitHub GET /git/ref/heads/${branch}: ${response.status} ${await response.text()}`)
    }
    return true
  }

  /** `sair` é a única ação que apaga arquivo; o sha vem do branch base. */
  async function deleteFile(path: string, branch: string, message: string): Promise<void> {
    const sha = await shaOf(path)
    if (!sha) throw new Error(`GitHub DELETE /contents/${path}: arquivo não encontrado em ${base}`)
    await github(`/contents/${path}`, 'DELETE', { message, sha, branch })
  }

  /**
   * A colisão de branch é sinal, não falha: nas branches determinísticas da
   * Confirmação (`verificar/<slug>`) ela é o segundo clique no mesmo link.
   * A checagem vem antes do POST para não depender do texto do erro do GitHub;
   * o 422 depois dela só sobra para a corrida entre dois cliques simultâneos,
   * e mesmo aí o corpo é conferido: `/git/refs` também devolve 422 para sha
   * inválido, e chamar isso de "já recebemos" seria mentir.
   */
  async function createBranch(branch: string, sha: string): Promise<void> {
    if (await refExists(branch)) throw new BranchExistsError(branch)

    const response = await fetch(`${api}/git/refs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }),
    })
    if (response.ok) return

    const detail = await response.text()
    if (response.status === 422 && detail.includes('already exists')) {
      throw new BranchExistsError(branch)
    }
    throw new Error(`GitHub POST /git/refs: ${response.status} ${detail}`)
  }

  /** Melhor esforço: usada só para limpar branch que ficou sem PR. */
  async function deleteBranch(branch: string): Promise<void> {
    await fetch(`${api}/git/refs/heads/${branch}`, { method: 'DELETE', headers })
  }

  return {
    async fileExists(path) {
      return (await shaOf(path)) !== undefined
    },

    async readFile(path) {
      const file = await contentsOf(path)
      if (!file) return undefined
      if (file.encoding !== 'base64' || file.content === undefined) {
        throw new Error(`GitHub GET /contents/${path}: conteúdo em "${file.encoding}", esperado base64`)
      }
      return fromBase64(file.content)
    },

    async verifyTurnstile(token) {
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret: config.turnstileSecret, response: token }),
      })
      if (!response.ok) return false
      const data = (await response.json()) as { success: boolean }
      return data.success === true
    },

    async createPullRequest(request: PullRequestInput) {
      const ref = await github(`/git/ref/heads/${base}`, 'GET')
      await createBranch(request.branch, ref.object.sha)

      try {
        // Um PUT por arquivo, em série: cada commit é filho do anterior no branch.
        for (const file of request.files) {
          // O sha só entra quando a operação edita arquivo existente (correção,
          // Selo Verificado, `removidos.yml`). Em cadastro novo o PUT vai sem sha
          // de propósito: se o caminho já existir, o GitHub recusa e o cadastro
          // falha alto, em vez de sobrescrever a Iniciativa que já estava lá.
          const existingSha = request.allowOverwrite ? await shaOf(file.path) : undefined
          await github(`/contents/${file.path}`, 'PUT', {
            message: request.title,
            content: file.encoding === 'base64' ? file.content : toBase64(file.content),
            branch: request.branch,
            ...(existingSha ? { sha: existingSha } : {}),
          })
        }
        // O sha lido do base vale porque nada do que sai aqui foi escrito antes
        // nesta mesma branch: o YAML e a imagem só são apagados, nunca regravados.
        for (const path of request.deletions ?? []) {
          await deleteFile(path, request.branch, request.title)
        }
        const pr = await github('/pulls', 'POST', {
          title: request.title,
          head: request.branch,
          base,
          body: request.body,
        })
        return { url: pr.html_url as string }
      } catch (error) {
        /*
         * Falhou no meio: a branch existe e não tem PR. Com nome determinístico
         * isso é pior do que a falha em si — todo clique seguinte daquela
         * Iniciativa colidiria com a branch órfã e receberia "já está em
         * revisão" para sempre, inclusive um pedido de saída, que é atendido
         * sem discussão. Apagar a branch aqui é o que faz "tente de novo em
         * instantes" ser verdade. Se a limpeza também falhar, o erro que
         * interessa é o original.
         */
        await deleteBranch(request.branch).catch(() => {})
        throw error
      }
    },

    secret: config.confirmationSecret ?? '',
    now: timestampNow,
    today: isoToday,
  }
}
