import { describe, expect, it } from 'vitest'
import {
  type DadosDoCartao,
  desenharCartao,
  ENQUADRAMENTOS,
  VERSAO_DO_DESENHO,
} from '../app/utils/cartao'
import { socialLinks } from '../app/utils/labels'
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

  /*
   * O pior caso real do diretório: o nome mais longo gastando três linhas e a
   * tarja do Selo entrando ao lado da cidade. É a combinação que aperta o vão
   * até o rodapé, e a única que pode fazer `desenharCartao` falhar por altura.
   */
  it('acomoda o nome mais longo com o Selo junto, inclusive com QR', () => {
    const pior = { ...maisLongo, verificado: true }
    for (const dados of [pior, { ...pior, qr: '<rect width="10" height="10"/>' }]) {
      const impresso = textoImpresso(desenharCartao(dados, enquadramento, medirComResvg))
      expect(impresso).toContain('Verificada')
      expect(impresso).toContain('Ribeirão Preto,')
      expect(impresso).toContain(pior.endereco)
    }
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
  const dados = {
    ...base,
    verificado: true,
    descricao: 'O abrigo cuida de 120 cães e é mantido por meio de doações.',
    redes: ['@patasdobem'],
  }
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

/**
 * A descrição e as redes entram só no vertical, que é o que uma pessoa monta
 * para postar. O card de link é a prévia de um endereço numa conversa: ali o
 * que precisa aparecer é de quem é a página.
 */
describe('descrição e redes', () => {
  const completa: DadosDoCartao = {
    ...base,
    descricao: 'O abrigo cuida de 120 cães e é mantido por meio de doações.',
    redes: ['@patasdobem', 'patasdobem.com.br'],
  }

  it('entram no vertical de stories', () => {
    const impresso = textoImpresso(desenharCartao(completa, 'stories', medirComResvg))
    expect(impresso).toContain('O abrigo cuida de 120 cães')
    expect(impresso).toContain('@patasdobem')
    expect(impresso).toContain('patasdobem.com.br')
  })

  it('ficam de fora do card de link, por mais que quem chama peça', () => {
    const impresso = textoImpresso(desenharCartao(completa, 'link', medirComResvg))
    expect(impresso).not.toContain('O abrigo cuida')
    expect(impresso).not.toContain('@patasdobem')
  })

  it('não empurram o endereço nem o nome para fora', () => {
    const impresso = textoImpresso(desenharCartao(completa, 'stories', medirComResvg))
    expect(impresso).toContain(completa.endereco)
    expect(impresso).toContain('Patas do Bem')
  })

  /*
   * A descrição mais longa do diretório, na íntegra: o schema não limita o
   * tamanho dela, então é ela que diz se o desenho aguenta o que a moderação
   * aprova. Cortada, e não espremida — o Cartão continua legível e o resto
   * está na página, cujo endereço vai logo abaixo.
   */
  it('apara a descrição longa demais e marca o corte', () => {
    const longa = 'Em 2020 ao sonho virou realidade: a RonronAmar nasceu do sonho de resgatar '
      + 'gatos em situação de risco e aumentar o número de lares cheios de amor com nossos '
      + 'ronrons. Temos uma casa que servirá como abrigo para transformar a vida de animais '
      + 'que sofreram abandono e maus trastos. Mas para deixar ela 100% preparada para receber '
      + 'os animais, precisamos fazer alguns ajustes, como telar as janelas, consertar telhas '
      + 'quebradas, enfim. É aí onde vocês entram, nos ajudando mensalmente a construir esse '
      + 'abrigo e mudar o mundo desses nenéns.'
    const impresso = textoImpresso(
      desenharCartao({ ...completa, descricao: longa }, 'stories', medirComResvg),
    )
    expect(impresso).toContain('Em 2020 ao sonho virou realidade')
    expect(impresso).toContain('…')
    expect(impresso).not.toContain('mudar o mundo desses nenéns')
    expect(impresso).toContain(completa.endereco)
  })

  /*
   * Uma rede a menos é melhor que a linha inteira ilegível: quem quiser o
   * resto abre a página, e o endereço dela está logo abaixo.
   */
  it('deixa de fora a rede que não couber na linha', () => {
    const muitas = {
      ...completa,
      redes: ['@patasdobem', 'facebook.com/patasdobem', 'linktr.ee/patasdobem', 'patasdobem.com.br'],
    }
    const impresso = textoImpresso(desenharCartao(muitas, 'stories', medirComResvg))
    // A primeira fica, e o que sobra da linha é o fim da lista.
    expect(impresso).toContain('@patasdobem')
    expect(impresso).not.toContain('linktr.ee/patasdobem')
    expect(impresso).not.toContain('patasdobem.com.br')
  })

  /*
   * O pior caso real de pé, com tudo junto: o nome mais longo do diretório em
   * três linhas, o Selo, a descrição, as redes e o QR disputando a mesma
   * altura. É a combinação que faz `desenharCartao` falhar se algum vão sair
   * do lugar.
   */
  it('acomoda o nome mais longo com descrição, redes, Selo e QR', () => {
    const pior: DadosDoCartao = {
      ...maisLongo,
      verificado: true,
      descricao: 'Iniciativa de proteção animal em São Gonçalo do Amarante (CE). Informações '
        + 'reunidas pela comunidade a partir de fontes públicas. Ajude pelos canais oficiais.',
      redes: ['@malu.recantodosanimais'],
      qr: '<rect width="10" height="10"/>',
    }
    const impresso = textoImpresso(desenharCartao(pior, 'stories', medirComResvg))
    expect(impresso).toContain('Verificada')
    expect(impresso).toContain('@malu.recantodosanimais')
    expect(impresso).toContain(pior.endereco)
  })
})

/**
 * As redes como o Cartão as imprime. O rótulo mora junto com os links da
 * página para as duas listas nunca discordarem sobre o que uma rede é.
 */
describe('as redes impressas', () => {
  it('diz o Instagram pelo @, que é como se procura um perfil', () => {
    expect(socialLinks({ instagram: 'patasdobem' })[0]!.label).toBe('@patasdobem')
  })

  it('encurta os links, que são lidos e digitados de dentro de uma imagem', () => {
    expect(socialLinks({ site: 'https://www.patasdobem.com.br/' })[0]!.label).toBe('patasdobem.com.br')
    expect(socialLinks({ linktree: 'https://linktr.ee/patasdobem' })[0]!.label).toBe('linktr.ee/patasdobem')
  })

  /*
   * O número é telefone de pessoa: na tela ele é destino de um botão, numa
   * imagem que circula ele vira dado publicado por nós.
   */
  it('não imprime o número do WhatsApp', () => {
    const [link] = socialLinks({ whatsapp: '+5511999998888' })
    expect(link!.label).toBe('WhatsApp')
    expect(link!.label).not.toContain('11999998888')
  })
})
