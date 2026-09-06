import { describe, expect, it } from 'vitest'
import {
  type DadosDoCartao,
  desenharCartao,
  ENQUADRAMENTOS,
  VERSAO_DO_DESENHO,
} from '../app/utils/cartao'
import { medirComResvg, rasterizarComResvg } from '../scripts/resvg'

/**
 * O Cartão é a cara da Iniciativa em toda conversa em que o link dela for
 * colado, e ninguém o revisa antes de ele sair. O que estes testes travam é o
 * que não pode falhar em silêncio: o texto que estoura a caixa, o endereço que
 * some, o QR que aparece onde não devia.
 *
 * A medição é a do resvg, a mesma do build: com um medidor de mentira o ajuste
 * de corpo passaria sempre e o teste não diria nada sobre o que é publicado.
 */

const enquadramentos = ['link', 'stories'] as const

const base: DadosDoCartao = {
  nome: 'Patas do Bem',
  cidade: 'Natal',
  estado: 'RN',
  endereco: 'mapadaspatas.com.br/iniciativas/patas-do-bem',
}

/** O nome mais longo do diretório: o pior caso real, não um inventado. */
const maisLongo: DadosDoCartao = {
  nome: 'Recando dos Animais (Amanda Medeiros)',
  cidade: 'Ribeirão Preto',
  estado: 'SP',
  endereco: 'mapadaspatas.com.br/iniciativas/recando-dos-animais-amanda-medeiros',
}

/** Só o que o `<text>` do SVG imprime, sem tags nem atributos. */
function textoImpresso(svg: string) {
  return [...svg.matchAll(/>([^<>]+)</g)].map(([, conteudo]) => conteudo).join(' ')
}

/** Quantas linhas o nome ocupou: os `<text>` que saíram no corpo dele. */
function linhasDoNome(svg: string, trecho: string) {
  return svg.split(`font-size="${corpoDe(svg, trecho)}"`).length - 1
}

/** Corpo em que saiu o `<text>` que imprime um trecho, para comparar hierarquia. */
function corpoDe(svg: string, trecho: string) {
  const achado = [...svg.matchAll(/<text[^>]*font-size="([\d.]+)"[^>]*>([^<]*)/g)]
    .find(([, , conteudo]) => conteudo!.includes(trecho))
  if (!achado) throw new Error(`nenhum <text> imprime "${trecho}"`)
  return Number(achado[1])
}

describe.each(enquadramentos)('cartão no enquadramento %s', (enquadramento) => {
  const { largura, altura } = ENQUADRAMENTOS[enquadramento]

  it('sai no tamanho do enquadramento', () => {
    const svg = desenharCartao(base, enquadramento, medirComResvg)
    expect(svg).toContain(`viewBox="0 0 ${largura} ${altura}"`)
    expect(svg).toContain(`width="${largura}" height="${altura}"`)
  })

  it('leva o nome, a cidade e a UF', () => {
    const impresso = textoImpresso(desenharCartao(base, enquadramento, medirComResvg))
    expect(impresso).toContain('Patas do Bem')
    expect(impresso).toContain('Natal,')
    expect(impresso).toContain('RN')
  })

  it('leva sempre o endereço da página', () => {
    for (const dados of [base, maisLongo]) {
      const impresso = textoImpresso(desenharCartao(dados, enquadramento, medirComResvg))
      expect(impresso).toContain(dados.endereco)
    }
  })

  it('quebra o nome mais longo do diretório sem estourar a caixa', () => {
    const svg = desenharCartao(maisLongo, enquadramento, medirComResvg)
    // Quebrado em linhas, mas inteiro: nenhuma palavra pode se perder no meio.
    const impresso = textoImpresso(svg)
    for (const palavra of maisLongo.nome.split(' ')) {
      expect(impresso).toContain(palavra)
    }
  })

  it('gasta mais linhas com o nome longo do que com o curto', () => {
    const curto = desenharCartao(base, enquadramento, medirComResvg)
    const longo = desenharCartao(maisLongo, enquadramento, medirComResvg)
    expect(linhasDoNome(longo, 'Recando')).toBeGreaterThan(linhasDoNome(curto, 'Patas do Bem'))
  })

  it('mantém o nome acima da cidade na hierarquia', () => {
    const svg = desenharCartao(maisLongo, enquadramento, medirComResvg)
    expect(corpoDe(svg, 'Recando')).toBeGreaterThan(corpoDe(svg, 'Ribeirão Preto,'))
  })

  it('mostra o Selo Verificado só quando a Iniciativa tem', () => {
    const sem = textoImpresso(desenharCartao(base, enquadramento, medirComResvg))
    const com = textoImpresso(
      desenharCartao({ ...base, verificado: true }, enquadramento, medirComResvg),
    )
    expect(sem).not.toContain('Verificada')
    expect(com).toContain('Verificada')
  })

  it('usa as iniciais da Iniciativa quando ela não enviou Imagem', () => {
    const svg = desenharCartao(base, enquadramento, medirComResvg)
    expect(textoImpresso(svg)).toContain('PB')
    expect(svg).not.toContain('<image')
  })

  it('usa a Imagem que a Iniciativa enviou, no lugar das iniciais', () => {
    const imagem = 'data:image/webp;base64,UklGRg=='
    const svg = desenharCartao({ ...base, imagem }, enquadramento, medirComResvg)
    expect(svg).toContain(`href="${imagem}"`)
    expect(textoImpresso(svg)).not.toContain('PB')
  })

  it('vira um PNG válido', () => {
    const png = rasterizarComResvg(desenharCartao(maisLongo, enquadramento, medirComResvg))
    // Assinatura do formato: se o SVG fosse inválido, nem chegaria aqui.
    expect([...png.subarray(1, 4)].map((b) => String.fromCharCode(b)).join('')).toBe('PNG')
  })
})

describe('nome longo onde a altura é escassa', () => {
  it('encolhe o corpo no card de link, que tem 630px de altura', () => {
    const curto = corpoDe(desenharCartao(base, 'link', medirComResvg), 'Patas do Bem')
    const longo = corpoDe(desenharCartao(maisLongo, 'link', medirComResvg), 'Recando')
    expect(longo).toBeLessThan(curto)
  })

  it('mantém o corpo no vertical de stories, onde sobra altura para quebrar', () => {
    const curto = corpoDe(desenharCartao(base, 'stories', medirComResvg), 'Patas do Bem')
    const longo = corpoDe(desenharCartao(maisLongo, 'stories', medirComResvg), 'Recando')
    expect(longo).toBe(curto)
  })
})

describe('QR Code no Cartão', () => {
  const qr = '<rect width="10" height="10" fill="#000"/>'

  it('entra no vertical de stories, que é onde alguém aponta a câmera', () => {
    expect(desenharCartao({ ...base, qr }, 'stories', medirComResvg)).toContain(qr)
  })

  it('não entra no card de link, por mais que quem chama peça', () => {
    expect(desenharCartao({ ...base, qr }, 'link', medirComResvg)).not.toContain(qr)
  })

  it('não empurra o endereço para fora do Cartão', () => {
    const impresso = textoImpresso(desenharCartao({ ...base, qr }, 'stories', medirComResvg))
    expect(impresso).toContain(base.endereco)
  })
})

describe('o mesmo desenho nos dois enquadramentos', () => {
  const dados = { ...base, verificado: true }
  const svgs = enquadramentos.map((e) => desenharCartao(dados, e, medirComResvg))

  it('pinta com as mesmas cores', () => {
    const cores = (svg: string) => [...new Set([...svg.matchAll(/#[0-9A-F]{6}/g)].map(([c]) => c))].sort()
    expect(cores(svgs[0]!)).toEqual(cores(svgs[1]!))
  })

  it('usa as mesmas famílias', () => {
    const familias = (svg: string) =>
      [...new Set([...svg.matchAll(/font-family="([^"]+)"/g)].map(([, f]) => f))].sort()
    expect(familias(svgs[0]!)).toEqual(familias(svgs[1]!))
  })
})

describe('versão do desenho', () => {
  it('é um inteiro positivo, que o cache do build usa como chave', () => {
    expect(Number.isInteger(VERSAO_DO_DESENHO)).toBe(true)
    expect(VERSAO_DO_DESENHO).toBeGreaterThan(0)
  })
})

describe('desenho que não cabe', () => {
  it('falha em vez de publicar um Cartão ilegível', () => {
    const impossivel = { ...base, nome: 'A'.repeat(400) }
    expect(() => desenharCartao(impossivel, 'link', medirComResvg)).toThrow(/não cabe/)
  })
})
