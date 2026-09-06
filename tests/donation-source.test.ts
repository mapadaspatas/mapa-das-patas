import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { initiativeSchema } from '../shared/schema/initiative'
import { canonicalSource } from '../shared/donation-source'

describe('canonicalSource: o rastreio que sai', () => {
  it.each([
    [
      'link de perfil compartilhado no Instagram',
      'https://www.instagram.com/gatilhope?stkn=AbCdEf123',
      'https://www.instagram.com/gatilhope',
    ],
    [
      'link do app do Instagram',
      'https://www.instagram.com/gatilhope/?igsh=MXY3',
      'https://www.instagram.com/gatilhope/',
    ],
    [
      'clique do Facebook',
      'https://www.facebook.com/gatilhope?fbclid=IwAR123',
      'https://www.facebook.com/gatilhope',
    ],
    [
      'campanha de origem',
      'https://gatilhope.org/doe?utm_source=instagram&utm_medium=bio',
      'https://gatilhope.org/doe',
    ],
    [
      'espaço em volta',
      '  https://www.instagram.com/gatilhope?igsh=MXY3  ',
      'https://www.instagram.com/gatilhope',
    ],
  ])('%s: o parâmetro sai e o endereço fica', (_label, value, expected) => {
    expect(canonicalSource(value)).toBe(expected)
  })
})

describe('canonicalSource: o que precisa ficar', () => {
  /*
   * Fonte legítima que depende de parâmetro para existir: cortar toda a query
   * apagaria o link em vez de limpá-lo, e o post que prova a chave viraria a
   * página inicial da rede.
   */
  it.each([
    ['post do Facebook', 'https://www.facebook.com/permalink.php?story_fbid=123&id=456'],
    ['foto do Facebook', 'https://www.facebook.com/photo?fbid=789'],
    ['vídeo do YouTube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
    ['âncora de post em site próprio', 'https://gatilhope.org/transparencia#pix'],
    /*
     * Sem rastreio nada é reescrito, nem o que a forma canônica de URL mudaria
     * por conta própria: barra final, maiúscula no host e acento no caminho
     * fariam uma Fonte já publicada deixar de ser igual a si mesma.
     */
    ['host com maiúscula e sem barra final', 'https://Gatil.Hope.org/Doe'],
    ['domínio pelado', 'https://gatilhope.org'],
    ['acento no caminho', 'https://gatilhope.org/transparência'],
  ])('%s continua inteiro', (_label, value) => {
    expect(canonicalSource(value)).toBe(value)
  })

  it('link do YouTube perde só o rastreio, e o vídeo continua', () => {
    expect(canonicalSource('https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=AbCd'))
      .toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  })
})

describe('canonicalSource: contrato com o schema', () => {
  /*
   * Nada é recusado aqui: valor que não é endereço volta como veio, para o
   * schema recusar com a mensagem dele em vez de virar link publicado.
   */
  it.each([
    ['vazio', '', ''],
    ['só espaço', '   ', ''],
    ['sem protocolo', 'instagram.com/gatilhope', 'instagram.com/gatilhope'],
    ['texto qualquer', 'está na bio', 'está na bio'],
  ])('%s passa direto', (_label, value, expected) => {
    expect(canonicalSource(value)).toBe(expected)
  })

  it('o que não é endereço continua sendo recusado pelo schema', () => {
    const result = initiativeSchema.safeParse({
      nome: 'Gatil Hope',
      tipo: 'projeto-informal',
      estado: 'PA',
      cidade: 'Marituba',
      descricao: 'Resgate e cuidado de gatos em situação de rua.',
      doacoes: [{ tipo: 'pix-na-fonte', fonte: canonicalSource('está na bio') }],
    })
    expect(result.success).toBe(false)
  })

  it('toda Fonte limpa continua aceita pelo schema', () => {
    const values = [
      'https://www.instagram.com/gatilhope?stkn=AbCdEf123',
      'https://www.instagram.com/p/DQ1xAbCdEf/?igsh=MXY3',
      'https://www.facebook.com/permalink.php?story_fbid=123&id=456',
    ]

    for (const value of values) {
      const result = initiativeSchema.safeParse({
        nome: 'Gatil Hope',
        tipo: 'projeto-informal',
        estado: 'PA',
        cidade: 'Marituba',
        descricao: 'Resgate e cuidado de gatos em situação de rua.',
        doacoes: [{ tipo: 'pix-na-fonte', fonte: canonicalSource(value) }],
      })
      expect(result.success, value).toBe(true)
    }
  })

  it('é idempotente: limpar de novo não muda o valor', () => {
    const once = canonicalSource('https://www.instagram.com/gatilhope?stkn=AbCdEf123')
    expect(canonicalSource(once)).toBe(once)
  })
})

/*
 * A Fonte publicada precisa ser igual à sua forma canônica, e não só parecida:
 * a correção decide que a Fonte não foi mexida comparando o valor do campo com
 * o do YAML (ver a regra do ticket 08 em RegistrationForm). Se a limpeza
 * reescrevesse uma Fonte já publicada, abrir /editar e passar pelo campo já
 * contaria como alteração, e a Fonte antiga seria herdada em silêncio junto de
 * uma chave nova.
 */
describe('canonicalSource: contrato com o dado publicado', () => {
  const files = readdirSync(new URL('../content/iniciativas/', import.meta.url))
    .filter((name) => name.endsWith('.yml'))

  it.each(files)('%s: toda Fonte publicada já está limpa', (name) => {
    const initiative = parse(
      readFileSync(new URL(`../content/iniciativas/${name}`, import.meta.url), 'utf8'),
    ) as { doacoes?: { fonte: string }[] }

    for (const donation of initiative.doacoes ?? []) {
      expect(canonicalSource(donation.fonte), donation.fonte).toBe(donation.fonte)
    }
  })
})
