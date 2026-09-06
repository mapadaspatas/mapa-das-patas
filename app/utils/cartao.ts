/**
 * O Cartão de uma Iniciativa: o card que aparece ao colar o link em rede
 * social (1200x630) e o vertical de stories (1080x1920).
 *
 * Um desenho, dois enquadramentos. Cor, hierarquia tipográfica e cada elemento
 * (a foto, o nome, o lugar, o Selo, o endereço) são construídos uma vez só e
 * usados pelos dois; o que muda entre eles é a arrumação, porque 1200x630
 * deitado e 1080x1920 em pé não comportam a mesma pilha. Mexer na cor ou no
 * corpo do nome aqui muda os dois na mesma edição.
 *
 * A função não rasteriza e não escreve arquivo: devolve string de SVG e quem
 * chama decide o que fazer com ela. É o que permite o mesmo desenho sair do
 * resvg no build e do Canvas no navegador, e é o que mantém aberta a saída de
 * gerar sob demanda na borda sem reescrever nada disto.
 *
 * Todo Cartão leva o endereço da página. É o que o separa do print que ele
 * substitui: quem recebe consegue conferir na origem, onde a chave e a Fonte
 * estão atualizadas, em vez de acreditar no que a peça diz.
 */
import { initialsOf } from './avatar.ts'
import {
  ajustar,
  alturaDoBloco,
  arredondar,
  bloco,
  COR,
  dimensoes,
  ESPACEJAMENTO_DISPLAY,
  escapar,
  type Estilo,
  FAMILIA,
  type Medir,
  pata,
  quebrar,
  texto,
} from './desenho.ts'
import { logoViewBox } from './logo.ts'
import { strings } from './strings.ts'

/**
 * Muda sempre que o desenho muda: cor, corpo, espaçamento, um elemento novo.
 *
 * Existe para o gerador do card de link poder incluí-la na chave do cache — aí
 * subir este número redesenha o diretório inteiro, em vez de deixar cartão
 * velho publicado sem ninguém perceber. Esse gerador ainda não foi escrito, e
 * até ele existir nada aqui lê esta constante.
 */
export const VERSAO_DO_DESENHO = 2

export const ENQUADRAMENTOS = {
  /**
   * Card de link, no tamanho que WhatsApp, Telegram e Instagram esperam de um
   * `og:image`. O desenho já sai; quem o rasteriza no build ainda não existe.
   */
  link: { largura: 1200, altura: 630 },
  /** Vertical de stories, gerado no navegador de quem divulga. */
  stories: { largura: 1080, altura: 1920 },
} as const

export type Enquadramento = keyof typeof ENQUADRAMENTOS

export interface DadosDoCartao {
  nome: string
  cidade: string
  estado: string
  /**
   * Endereço da página, como se lê: `mapadaspatas.com.br/iniciativas/<slug>`.
   * Vem pronto de quem chama porque a base do site é configuração de deploy, e
   * o desenho não lê variável de ambiente.
   */
  endereco: string
  /** Selo Verificado: a Iniciativa confirmou os dados por canal oficial. */
  verificado?: boolean
  /**
   * A descrição que a Iniciativa publicou, como ela a escreveu. Entra só no
   * vertical, e o desenho apara o que não couber.
   */
  descricao?: string
  /**
   * As redes da Iniciativa, cada uma já como se lê e se digita (`@perfil`,
   * `linktr.ee/perfil`). Vêm prontas de quem chama pela mesma razão do
   * endereço: o desenho imprime texto e não decide o que uma rede é. Entram só
   * no vertical.
   */
  redes?: string[]
  /**
   * A Imagem que a própria Iniciativa enviou, já embutida como data URI. Tem
   * que vir embutida, e não como caminho: um `href` externo faria o navegador
   * recusar o Canvas na hora de salvar. Sem Imagem, entram as iniciais, como
   * na listagem.
   */
  imagem?: string
  /**
   * QR Code do BR Code, como fragmento de SVG com `viewBox` próprio. Opcional
   * e só faz sentido no stories: no card de link ninguém aponta a câmera para
   * a prévia de um link. Quem monta é o navegador, a partir da chave publicada
   * na página.
   */
  qr?: string
  /**
   * Bloco de `@font-face` com as fontes embutidas em base64, para quem
   * rasteriza sem elas. O resvg recebe os arquivos por fora e não precisa
   * disto; o navegador precisa, porque um SVG carregado como imagem não usa as
   * fontes da página nem busca nada na rede.
   */
  fontesEmbutidas?: string
}

/**
 * Proporções, todas em fração da largura do enquadramento: é a largura que
 * define quão grande o texto se lê, tanto na prévia pequena de uma conversa
 * quanto no story em tela cheia. A altura só decide quanto cabe.
 */
const PROPORCAO = {
  margem: 0.067,
  /** Assinatura do site no topo, na proporção do cabeçalho (`default.vue`). */
  pata: 0.046,
  /** Teto do corpo do nome; o corpo real sai de `ajustar()`. */
  nome: 0.088,
  lugar: 0.032,
  descricao: 0.030,
  redes: 0.030,
  /** Rótulo que abre as redes, um degrau abaixo delas. */
  rotulo: 0.022,
  endereco: 0.031,
  selo: 0.026,
  qr: 0.30,
  /** Teto da foto em pé: a largura útil, ou seja a foto de margem a margem. */
  fotoEmPe: 1 - 2 * 0.067,
  /** Teto do avatar de iniciais em pé, bem abaixo do da foto. */
  avatarEmPe: 0.42,
  /** Piso dos dois: abaixo disto a foto vira enfeite e some da leitura. */
  fotoMinima: 0.20,
  /** Lado deles quando o enquadramento está deitado e a altura é escassa. */
  fotoDeitado: 0.19,
}

/** Vãos entre os elementos, também em fração da largura. */
const VAO = {
  aposCabecalho: 0.05,
  aposFoto: 0.045,
  aposNome: 0.024,
  aposLugar: 0.032,
  aposDescricao: 0.030,
  /** Entre o rótulo e a linha de redes, que são a mesma peça. */
  aposRotulo: 0.010,
  antesRodape: 0.045,
  /** Entre a foto e a coluna de texto, no enquadramento deitado. */
  aoLadoDaFoto: 0.04,
  aposQr: 0.03,
}

const ENTRELINHA_NOME = 1.06

/**
 * Teto de linhas do nome. Três dão conta do nome mais longo do diretório sem
 * o corpo cair a ponto de o Cartão deixar de gritar de quem ele é.
 */
const LINHAS_DO_NOME = 3

/** Largura de um espaço, em fração do corpo, para separar trechos vizinhos. */
const ESPACO = 0.28

const ENTRELINHA_DESCRICAO = 1.35

/**
 * Teto de linhas da descrição. Quatro dão conta da descrição típica do
 * diretório inteira; as poucas mais longas que isso saem aparadas.
 */
const LINHAS_DA_DESCRICAO = 4

/** Entre uma rede e a seguinte, na mesma linha. */
const SEPARADOR = ' · '

const LOGO = dimensoes(logoViewBox)

function fracao(largura: number, chave: number) {
  return Math.round(largura * chave)
}

/**
 * Quadrado de cantos arredondados. Serve de moldura e de recorte, então sai sem
 * preenchimento: quem chama acrescenta o que precisa.
 *
 * O raio é proporcional ao lado, e não fixo: a mesma peça é desenhada de 152px
 * no card de link a 936px no story, e um raio fixo pareceria dois desenhos
 * diferentes. Note que não é o avatar redondo da listagem — no Cartão a foto é
 * o retrato da Iniciativa, com o peso de uma foto, e não um ícone ao lado do
 * nome.
 */
function quadradoArredondado(x: number, y: number, lado: number) {
  return `<rect x="${arredondar(x)}" y="${arredondar(y)}" width="${lado}" height="${lado}"`
    + ` rx="${arredondar(lado * 0.12)}"`
}

/**
 * A Imagem da Iniciativa, recortada no quadrado, ou as iniciais de quem não
 * enviou nenhuma. As iniciais saem de `initialsOf()`, a mesma função do avatar
 * da listagem, para o Cartão e o site nunca abreviarem a Iniciativa de dois
 * jeitos diferentes.
 *
 * A cor, essa não vem de lá: a listagem varia o tom por nome para dar a cada
 * Iniciativa a sua, num mosaico de dezenas delas. O Cartão mostra uma só, e
 * sozinha o tom variável não distingue nada de nada, só faz a mesma Iniciativa
 * sair de uma cor no story e de outra no card.
 */
function foto(medir: Medir, dados: DadosDoCartao, x: number, y: number, lado: number) {
  if (dados.imagem) {
    const id = 'recorte-da-foto'
    return `<clipPath id="${id}">${quadradoArredondado(x, y, lado)}/></clipPath>`
      + `<image href="${escapar(dados.imagem)}" x="${arredondar(x)}" y="${arredondar(y)}"`
      + ` width="${lado}" height="${lado}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>`
  }

  const iniciais = initialsOf(dados.nome)
  const estilo = { familia: FAMILIA.display, peso: 700, tamanho: Math.round(lado * 0.42), espacejamento: ESPACEJAMENTO_DISPLAY }
  const caixa = medir(iniciais, estilo)
  return `${quadradoArredondado(x, y, lado)} fill="${COR.avatar}"/>`
    + texto(
      [{ conteudo: iniciais, cor: COR.marca }],
      x + lado / 2 - caixa.largura / 2,
      y + lado / 2 - (caixa.topo + caixa.base) / 2,
      estilo,
    )
}

/** Assinatura do site: pata e nome, como no cabeçalho de toda página. */
function assinatura(medir: Medir, largura: number, margem: number) {
  const lado = fracao(largura, PROPORCAO.pata)
  const estilo = {
    familia: FAMILIA.display,
    peso: 700,
    tamanho: (lado * 20) / 24,
    espacejamento: ESPACEJAMENTO_DISPLAY,
  }
  const caixa = medir(strings.siteName, estilo)
  const svg = `<g transform="translate(${margem} ${margem}) scale(${arredondar(lado / LOGO.largura)})">${pata(COR.marca)}</g>`
    + texto(
      [{ conteudo: strings.siteName, cor: COR.tinta }],
      margem + lado + (lado * 8) / 24,
      margem + lado / 2 - (caixa.topo + caixa.base) / 2,
      estilo,
    )
  return { svg, fim: margem + lado }
}

/**
 * Cidade e UF, com a UF destacada como na página da Iniciativa, e a tarja do
 * Selo Verificado logo depois quando houver. O Selo é desenhado, e não escrito:
 * um ícone do site não chega aqui, e a marca de conferido é justamente o que
 * uma pessoa reconhece antes de ler.
 */
function lugar(medir: Medir, dados: DadosDoCartao, x: number, topo: number, largura: number) {
  const tamanho = fracao(largura, PROPORCAO.lugar)
  const estilo = { familia: FAMILIA.texto, peso: 400, tamanho }
  const negrito = { ...estilo, peso: 600 }
  const cidade = `${dados.cidade},`
  const caixaCidade = medir(cidade, estilo)
  const caixaUf = medir(dados.estado, negrito)
  const base = topo - Math.min(caixaCidade.topo, caixaUf.topo)
  /*
   * O espaço depois da vírgula é medido e somado à posição da UF, em vez de
   * escrito no texto: quem rasteriza SVG apara o branco no fim de um trecho, e
   * a cidade sairia colada na sigla.
   */
  const ufX = x + caixaCidade.largura + tamanho * ESPACO

  let svg = texto([{ conteudo: cidade, cor: COR.tintaFraca }], x, base, estilo)
    + texto([{ conteudo: dados.estado, cor: COR.tinta }], ufX, base, negrito)
  let fim = base + Math.max(caixaCidade.base, caixaUf.base)

  if (dados.verificado) {
    const tamanhoSelo = fracao(largura, PROPORCAO.selo)
    const estiloSelo = { familia: FAMILIA.texto, peso: 600, tamanho: tamanhoSelo }
    const caixaSelo = medir(strings.badge.verified, estiloSelo)
    const risco = tamanhoSelo * 0.62
    const respiro = tamanhoSelo * 0.62
    const alturaTarja = tamanhoSelo * 2
    const larguraTarja = respiro * 2 + risco + tamanhoSelo * 0.45 + caixaSelo.largura
    const tarjaX = ufX + caixaUf.largura + tamanho * 0.7
    const tarjaY = base - alturaTarja / 2 + (caixaCidade.topo + caixaCidade.base) / 2
    const meio = tarjaY + alturaTarja / 2
    const riscoX = tarjaX + respiro

    svg += `<rect x="${arredondar(tarjaX)}" y="${arredondar(tarjaY)}" width="${arredondar(larguraTarja)}"`
      + ` height="${arredondar(alturaTarja)}" rx="${arredondar(alturaTarja / 2)}" fill="${COR.confiancaFundo}"/>`
      + `<path d="M ${arredondar(riscoX)} ${arredondar(meio)}`
      + ` L ${arredondar(riscoX + risco * 0.38)} ${arredondar(meio + risco * 0.34)}`
      + ` L ${arredondar(riscoX + risco)} ${arredondar(meio - risco * 0.40)}"`
      + ` fill="none" stroke="${COR.confianca}" stroke-width="${arredondar(tamanhoSelo * 0.16)}"`
      + ` stroke-linecap="round" stroke-linejoin="round"/>`
      + texto(
        [{ conteudo: strings.badge.verified, cor: COR.confianca }],
        riscoX + risco + tamanhoSelo * 0.45,
        meio - (caixaSelo.topo + caixaSelo.base) / 2,
        estiloSelo,
      )
    fim = Math.max(fim, tarjaY + alturaTarja)
  }

  return { svg, fim }
}

/**
 * O endereço da página, sempre. Vai em peso 600 e na cor de texto do urucum,
 * não na cor de marca: aqui ele é o que se lê e se digita, não um enfeite.
 */
function endereco(medir: Medir, dados: DadosDoCartao, x: number, largura: number, larguraUtil: number) {
  const ajuste = ajustar(medir, dados.endereco, {
    largura: larguraUtil,
    linhas: 1,
    teto: fracao(largura, PROPORCAO.endereco),
    familia: FAMILIA.texto,
    peso: 600,
  })
  const caixa = medir(dados.endereco, ajuste.estilo)
  return {
    altura: caixa.base - caixa.topo,
    desenhar: (topo: number) =>
      texto([{ conteudo: dados.endereco, cor: COR.endereco }], x, topo - caixa.topo, ajuste.estilo),
  }
}

/** O QR sobre um quadrado branco: código escuro em papel colorido não lê. */
function qrCode(fragmento: string, x: number, y: number, lado: number) {
  const respiro = lado * 0.06
  return `<rect x="${arredondar(x)}" y="${arredondar(y)}" width="${arredondar(lado)}" height="${arredondar(lado)}"`
    + ` rx="${arredondar(lado * 0.06)}" fill="${COR.branco}"/>`
    + `<svg x="${arredondar(x + respiro)}" y="${arredondar(y + respiro)}"`
    + ` width="${arredondar(lado - respiro * 2)}" height="${arredondar(lado - respiro * 2)}">${fragmento}</svg>`
}

/**
 * As linhas de um texto corrido, no máximo `maximo`, com o corte marcado por
 * reticência.
 *
 * A descrição é escrita pela Iniciativa e o schema não limita o tamanho dela: a
 * mais longa do diretório tem meia página. Aqui não serve o `ajustar()` do
 * nome, que encolhe o corpo até caber e falha quando não dá — meia página de
 * texto cabe, sim, num corpo que ninguém lê. Cortar é o que mantém o resto do
 * Cartão legível, e o endereço logo abaixo leva quem quiser a descrição
 * inteira, na página, onde ela está atualizada.
 */
function aparar(medir: Medir, conteudo: string, estilo: Estilo, largura: number, maximo: number) {
  const linhas = quebrar(medir, conteudo, largura, estilo)
  if (linhas.length <= maximo) return linhas

  const cortadas = linhas.slice(0, maximo)
  const palavras = cortadas[maximo - 1]!.split(' ')
  // A reticência ocupa espaço: sai palavra até ela caber junto na linha.
  while (palavras.length > 1 && medir(`${palavras.join(' ')}…`, estilo).largura > largura) {
    palavras.pop()
  }
  cortadas[maximo - 1] = `${palavras.join(' ')}…`
  return cortadas
}

/**
 * As redes numa linha só. Quando não cabem todas, as últimas ficam de fora em
 * vez de o corpo encolher: a linha é endereço para ler e digitar de dentro de
 * uma imagem, e endereço pequeno demais para ler não serve para nada. A ordem
 * é a da página, então o que fica de fora é sempre o fim da lista.
 */
function emUmaLinha(medir: Medir, redes: string[], estilo: Estilo, largura: number) {
  const cabem = [...redes]
  while (cabem.length > 1 && medir(cabem.join(SEPARADOR), estilo).largura > largura) cabem.pop()
  return cabem.join(SEPARADOR)
}

/**
 * O que vem abaixo do lugar: a descrição publicada e as redes da Iniciativa.
 *
 * As duas só entram em pé. Deitado, os 630px de altura já são disputados pelo
 * nome e pela foto, e um parágrafo ali sairia no corpo em que ninguém lê — o
 * enquadramento decide, como no QR, para nenhum chamador conseguir pedir o
 * contrário.
 *
 * As redes saem todas no mesmo peso, na ordem em que a página as mostra: qual
 * delas é o canal principal é escolha da Iniciativa, não nossa, e o Cartão não
 * tem como saber onde ela responde hoje. O endereço, logo abaixo, leva a todas
 * elas com link.
 */
function cauda(
  medir: Medir,
  dados: DadosDoCartao,
  largura: number,
  x: number,
  util: number,
  emPe: boolean,
) {
  const pedacos: { vao: number, altura: number, desenhar: (topo: number) => string }[] = []
  const descricao = emPe ? dados.descricao?.trim() : undefined
  const redes = emPe ? (dados.redes ?? []).filter((rede) => rede.trim()) : []

  if (descricao) {
    const estilo = { familia: FAMILIA.texto, peso: 400, tamanho: fracao(largura, PROPORCAO.descricao) }
    const linhas = aparar(medir, descricao, estilo, util, LINHAS_DA_DESCRICAO)
    pedacos.push({
      vao: fracao(largura, VAO.aposLugar),
      altura: alturaDoBloco(medir, linhas, estilo, ENTRELINHA_DESCRICAO),
      desenhar: (topo) => bloco(
        medir,
        linhas.map((conteudo) => [{ conteudo, cor: COR.tintaFraca }]),
        x,
        topo,
        estilo,
        ENTRELINHA_DESCRICAO,
      ).svg,
    })
  }

  if (redes.length) {
    const estiloRotulo = { familia: FAMILIA.texto, peso: 600, tamanho: fracao(largura, PROPORCAO.rotulo) }
    const estilo = { familia: FAMILIA.texto, peso: 600, tamanho: fracao(largura, PROPORCAO.redes) }
    const linha = emUmaLinha(medir, redes, estilo, util)
    const caixaRotulo = medir(strings.shareCard.social, estiloRotulo)
    const caixaLinha = medir(linha, estilo)
    const entre = fracao(largura, VAO.aposRotulo)
    const alturaRotulo = caixaRotulo.base - caixaRotulo.topo

    pedacos.push({
      vao: fracao(largura, pedacos.length ? VAO.aposDescricao : VAO.aposLugar),
      altura: alturaRotulo + entre + caixaLinha.base - caixaLinha.topo,
      desenhar: (topo) =>
        texto([{ conteudo: strings.shareCard.social, cor: COR.tintaFraca }], x, topo - caixaRotulo.topo, estiloRotulo)
        + '\n  '
        + texto([{ conteudo: linha, cor: COR.tinta }], x, topo + alturaRotulo + entre - caixaLinha.topo, estilo),
    })
  }

  return {
    altura: pedacos.reduce((soma, pedaco) => soma + pedaco.vao + pedaco.altura, 0),
    desenhar: (topo: number) => {
      let y = topo
      return pedacos
        .map((pedaco) => {
          y += pedaco.vao
          const svg = pedaco.desenhar(y)
          y += pedaco.altura
          return svg
        })
        .join('\n  ')
    },
  }
}

/** O vão entre a assinatura e o rodapé, que é onde a identidade é arrumada. */
interface Vao {
  largura: number
  margem: number
  util: number
  topo: number
  fim: number
}

/** Onde cada peça da identidade ficou, depois de arrumada no enquadramento. */
interface Arrumacao {
  fotoY: number
  lado: number
  colunaX: number
  colunaTopo: number
  nome: ReturnType<typeof ajustar>
}

/** O nome no maior corpo que couber na coluna, em largura e em altura. */
function ajustarNome(medir: Medir, dados: DadosDoCartao, largura: number, altura: number, colunaLargura: number) {
  return ajustar(medir, dados.nome, {
    largura: colunaLargura,
    linhas: LINHAS_DO_NOME,
    teto: fracao(largura, PROPORCAO.nome),
    altura,
    entrelinha: ENTRELINHA_NOME,
    familia: FAMILIA.display,
    peso: 700,
    espacejamento: ESPACEJAMENTO_DISPLAY,
  })
}

/** Altura do nome, do lugar e do que mais vier abaixo deles. */
function alturaDaColuna(medir: Medir, nome: Arrumacao['nome'], largura: number, abaixo: number) {
  return alturaDoBloco(medir, nome.linhas, nome.estilo, ENTRELINHA_NOME)
    + fracao(largura, VAO.aposNome)
    + fracao(largura, PROPORCAO.lugar) * 1.5
    + abaixo
}

/**
 * Centra a pilha no vão em vez de colá-la no topo: nome de uma linha e nome de
 * três ficam ambos equilibrados entre a assinatura e o rodapé, sem deixar
 * buraco embaixo.
 */
function centrar(vao: Vao, alturaDaPilha: number) {
  return vao.topo + Math.max(0, (vao.fim - vao.topo - alturaDaPilha) / 2)
}

/**
 * Deitado, a foto vai ao lado do texto. 630px de altura não comportam foto,
 * nome e lugar empilhados sem espremer justamente o nome, que é o que o Cartão
 * existe para dizer — então a foto tem tamanho fixo, a coluna fica com o resto
 * da largura, e a altura toda do vão é do texto.
 */
function deitar(medir: Medir, dados: DadosDoCartao, vao: Vao): Arrumacao {
  const { largura, margem, util } = vao
  const lado = fracao(largura, PROPORCAO.fotoDeitado)
  const aoLado = fracao(largura, VAO.aoLadoDaFoto)
  const colunaX = margem + lado + aoLado

  const nome = ajustarNome(
    medir,
    dados,
    largura,
    vao.fim - vao.topo - fracao(largura, VAO.aposNome) - fracao(largura, PROPORCAO.lugar) * 1.5,
    util - lado - aoLado,
  )
  const alturaColuna = alturaDaColuna(medir, nome, largura, 0)

  // Foto e coluna são vizinhas: cada uma se centra na altura da outra.
  const pilhaTopo = centrar(vao, Math.max(lado, alturaColuna))
  return {
    lado,
    colunaX,
    fotoY: pilhaTopo + Math.max(0, (alturaColuna - lado) / 2),
    colunaTopo: pilhaTopo + Math.max(0, (lado - alturaColuna) / 2),
    nome,
  }
}

/**
 * Em pé sobra altura, e a pilha é o que preenche o story: a foto fica com toda
 * a altura que o texto deixou, até a largura útil, e é isso que faz o vertical
 * parecer desenhado para o formato em vez de um card de link esticado. O
 * avatar de iniciais para bem antes disso — ampliar duas letras até a largura
 * da página não diz nada a mais sobre a Iniciativa.
 */
function empilhar(medir: Medir, dados: DadosDoCartao, vao: Vao, abaixo: number): Arrumacao {
  const { largura, margem, util } = vao
  const aposFoto = fracao(largura, VAO.aposFoto)
  const minima = fracao(largura, PROPORCAO.fotoMinima)

  // A foto tem direito ao tamanho mínimo antes de o nome ocupar o que sobrar.
  const nome = ajustarNome(
    medir,
    dados,
    largura,
    vao.fim - vao.topo - fracao(largura, VAO.aposNome)
    - fracao(largura, PROPORCAO.lugar) * 1.5 - minima - aposFoto - abaixo,
    util,
  )
  const alturaColuna = alturaDaColuna(medir, nome, largura, abaixo)

  const teto = fracao(largura, dados.imagem ? PROPORCAO.fotoEmPe : PROPORCAO.avatarEmPe)
  const lado = Math.max(minima, Math.min(teto, vao.fim - vao.topo - alturaColuna - aposFoto))
  const pilhaTopo = centrar(vao, lado + aposFoto + alturaColuna)

  return {
    lado,
    colunaX: margem,
    fotoY: pilhaTopo,
    colunaTopo: pilhaTopo + lado + aposFoto,
    nome,
  }
}

/**
 * O Cartão de uma Iniciativa, em SVG. Pura: os mesmos dados e o mesmo medidor
 * devolvem sempre a mesma string, que é o que permite o cache por hash do
 * gerador do build.
 */
export function desenharCartao(
  dados: DadosDoCartao,
  enquadramento: Enquadramento,
  medir: Medir,
): string {
  const { largura, altura } = ENQUADRAMENTOS[enquadramento]
  const emPe = altura > largura
  const margem = fracao(largura, PROPORCAO.margem)
  const util = largura - 2 * margem

  const marca = assinatura(medir, largura, margem)

  /*
   * Rodapé ancorado na margem de baixo, montado de baixo para cima: o endereço
   * primeiro, o QR acima dele quando houver. Assim o endereço fica no mesmo
   * lugar nos dois enquadramentos, com ou sem QR, e o desenho não depende de
   * quantas linhas o nome acabou ocupando.
   */
  const enderecoDesenho = endereco(medir, dados, margem, largura, util)
  let rodapeTopo = altura - margem - enderecoDesenho.altura
  let rodape = enderecoDesenho.desenhar(rodapeTopo)
  /*
   * O QR só entra em pé. Deitado ninguém aponta a câmera para a prévia de um
   * link, e o quadrado comeria justamente a altura de que o nome precisa — o
   * enquadramento decide, para nenhum chamador conseguir pedir o contrário.
   */
  if (dados.qr && emPe) {
    const lado = fracao(largura, PROPORCAO.qr)
    rodapeTopo -= fracao(largura, VAO.aposQr) + lado
    rodape = qrCode(dados.qr, margem, rodapeTopo, lado) + '\n  ' + rodape
  }

  const vao = {
    largura,
    margem,
    util,
    topo: marca.fim + fracao(largura, VAO.aposCabecalho),
    fim: rodapeTopo - fracao(largura, VAO.antesRodape),
  }
  /*
   * A descrição e as redes são medidas antes de a pilha ser arrumada: elas
   * disputam a mesma altura que a foto e o nome, e é a sobra delas que os dois
   * dividem.
   */
  const abaixo = cauda(medir, dados, largura, margem, util, emPe)
  const arrumacao = emPe
    ? empilhar(medir, dados, vao, abaixo.altura)
    : deitar(medir, dados, vao)

  const blocoNome = bloco(
    medir,
    arrumacao.nome.linhas.map((conteudo) => [{ conteudo, cor: COR.tinta }]),
    arrumacao.colunaX,
    arrumacao.colunaTopo,
    arrumacao.nome.estilo,
    ENTRELINHA_NOME,
  )
  const blocoLugar = lugar(
    medir,
    dados,
    arrumacao.colunaX,
    blocoNome.fim + fracao(largura, VAO.aposNome),
    largura,
  )

  const svgAbaixo = abaixo.desenhar(blocoLugar.fim)
  const fimDaColuna = blocoLugar.fim + abaixo.altura

  /*
   * O desenho está amarrado a dados que a moderação aprova, não a constantes
   * daqui: um nome longo demais empurraria o lugar por cima do rodapé e o
   * Cartão sairia ilegível sem ninguém ver. Falhar é mais barato que publicar.
   */
  if (fimDaColuna > rodapeTopo) {
    throw new Error(
      `"${dados.nome}" não cabe no enquadramento ${enquadramento}: `
      + `o bloco passa ${Math.round(fimDaColuna - rodapeTopo)}px do rodapé`,
    )
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largura} ${altura}" width="${largura}" height="${altura}">
  ${dados.fontesEmbutidas ? `<defs><style>${dados.fontesEmbutidas}</style></defs>` : ''}
  <rect width="${largura}" height="${altura}" fill="${COR.fundo}"/>
  ${marca.svg}
  ${foto(medir, dados, margem, arrumacao.fotoY, arrumacao.lado)}
  ${blocoNome.svg}
  ${blocoLugar.svg}
  ${svgAbaixo}
  ${rodape}
</svg>
`
}
