import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { strings } from '../app/utils/strings'

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
