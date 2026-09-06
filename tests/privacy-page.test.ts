import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { strings } from '../app/utils/strings'
import { initiativeSchema } from '../shared/schema/initiative'

/*
 * A política de privacidade promete o canal do titular: sem endereço real ela
 * não cumpre o art. 18 da LGPD e ainda cria a expectativa de um canal que não
 * existe. O texto nasceu com o marcador `A_DEFINIR` no lugar do e-mail, então a
 * trava mora aqui, na CI, e não na memória de quem for publicar.
 *
 * Desde a /contato o mesmo endereço aparece em dois lugares — aqui em texto
 * corrido e em `strings.contact.email`, que a página Vue consome — e markdown
 * não acompanha uma variável. O terceiro caso amarra os dois: divergir é erro
 * de CI, não descoberta de quem for pedir remoção.
 */
const page = readFileSync(new URL('../content/paginas/privacidade.md', import.meta.url), 'utf8')

describe('política de privacidade', () => {
  it('não vai ao ar com o canal de contato pendente', () => {
    expect(page).not.toContain('A_DEFINIR')
  })

  it('publica um e-mail de contato para pedidos de titular', () => {
    expect(page).toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/)
  })

  it('publica o mesmo endereço que a página de contato', () => {
    expect(page).toContain(strings.contact.email)
  })
})

/*
 * A recusa de chave pessoal é a única mensagem do schema que manda o
 * contribuidor ler uma página. Ela aparece sob o campo no formulário, para
 * alguém que acabou de ter a chave recusada e quer saber por quê: se o caminho
 * mudar, ou a regra sair da página, o erro passa a apontar para lugar nenhum.
 *
 * O arquivo lido acima é o que responde por `/privacidade`, então renomear a
 * página quebra este teste antes de quebrar a mensagem.
 */
describe('recusa de chave pessoal', () => {
  const refused = initiativeSchema.safeParse({
    nome: 'Gatil Hope',
    tipo: 'projeto-informal',
    estado: 'PA',
    cidade: 'Marituba',
    descricao: 'Resgate e cuidado de gatos em situação de rua.',
    doacoes: [{
      tipo: 'pix-cnpj',
      chave: '123.456.789-09',
      fonte: 'https://instagram.com/p/abc',
    }],
  })

  const message = refused.success
    ? ''
    : refused.error.issues.find((issue) => issue.message.includes('não é publicada aqui'))?.message ?? ''

  it('manda para a página de privacidade, e não para um arquivo do repositório', () => {
    expect(message).toContain('/privacidade')
  })

  it('a página para onde ela manda publica a regra', () => {
    expect(page).toMatch(/chave de pessoa física/i)
  })
})
