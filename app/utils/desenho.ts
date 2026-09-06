/**
 * Primitivas de desenho em SVG, compartilhadas por tudo o que o projeto
 * rasteriza: as imagens de marca das redes (`scripts/build-social.ts`) e o
 * Cartão de cada Iniciativa (`app/utils/cartao.ts`).
 *
 * O SVG não quebra linha nem ajusta corpo sozinho: quem faz isso é `quebrar()`
 * e `ajustar()`, medindo o texto de verdade. A medição não mora aqui, entra
 * como argumento: quem rasteriza muda (o resvg no build, o navegador na hora
 * de divulgar) e é ele quem sabe medir com a própria fonte. É o que mantém
 * este módulo sem I/O, sem resvg e sem Canvas, e igual nos dois lados.
 *
 * As cores são as escalas urucum, mato e stone de `app/assets/css/main.css`.
 * Ficam aqui, e não copiadas em cada gerador, para uma peça não sair no laranja
 * de ontem enquanto a outra sai no de hoje.
 */
import { logoPad, logoPadStroke, logoToes } from './logo.ts'

/** Famílias, com os mesmos nomes de `--font-display` e `--font-sans`. */
export const FAMILIA = {
  display: 'Bricolage Grotesque',
  texto: 'Instrument Sans',
} as const

/** Espacejamento dos títulos, o mesmo de `.font-display` em `main.css`. */
export const ESPACEJAMENTO_DISPLAY = -0.025

export const COR = {
  /** urucum-500: o `--ui-primary` do tema claro, a pata do cabeçalho. */
  marca: '#E2551F',
  /** urucum-600: o tile do favicon, para a foto de perfil falar com o ícone. */
  marcaTile: '#D6410E',
  /** urucum-700: o endereço, que precisa de contraste de texto e não de marca. */
  endereco: '#A82F07',
  /** urucum-200: o mapa, presente sem competir com o texto. */
  mapa: '#FACDB6',
  /** urucum-100: o fundo do avatar de iniciais, um degrau acima do papel. */
  avatar: '#FDE8DD',
  /**
   * mato-600 nos pilares e no Selo: o verde é o da confiança em `main.css`, mas
   * um degrau abaixo do `text-secondary` do site (o 500). No papel do cartão o
   * 500 dá 3.6:1, e o rótulo é lido pequeno na timeline; o 600 dá 4.6:1.
   */
  confianca: '#1C7A4A',
  /** mato-50: o fundo da tarja do Selo, o mesmo do `variant="soft"` do site. */
  confiancaFundo: '#F0F8F3',
  /** urucum-50: o papel. */
  fundo: '#FEF5F0',
  /** stone-900 e stone-600: `text-highlighted` e `text-muted` no tema claro. */
  tinta: '#1C1917',
  tintaFraca: '#57534E',
  /** stone-200: `border-muted`, o filete que fecha o texto. */
  filete: '#E7E5E4',
  branco: '#FFFFFF',
} as const

export type Estilo = {
  familia: string
  peso: number
  tamanho: number
  /** Fração do corpo, como em CSS `letter-spacing: -0.025em`. */
  espacejamento?: number
}

/** Pedaço de linha com cor própria: é o que permite pintar só o fim do título. */
export type Trecho = { conteudo: string, cor: string }

/**
 * Caixa de tinta de um texto, em pixels, relativa à linha de base: `topo` é
 * negativo (a tinta sobe) e `base` é positivo (as descidas do g e do p).
 */
export interface Medida {
  largura: number
  topo: number
  base: number
}

/**
 * Como o chamador mede texto. Tem que ser a mesma fonte que ele vai usar para
 * rasterizar: medir na Instrument Sans e desenhar em Arial devolve um layout
 * que só parece certo.
 */
export type Medir = (conteudo: string, estilo: Estilo) => Medida

/** Duas casas: o suficiente para o subpixel e menos ruído no SVG. */
export function arredondar(valor: number) {
  return Math.round(valor * 100) / 100
}

/** Largura e altura de um `viewBox`, para nenhuma escala aqui ser chutada. */
export function dimensoes(viewBox: string) {
  const [, , largura, altura] = viewBox.split(/\s+/).map(Number) as [number, number, number, number]
  return { largura, altura }
}

export function escapar(texto: string) {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Uma linha, em um ou mais trechos. O primeiro leva a cor no próprio `<text>`
 * e os seguintes viram `<tspan>`, que continua na mesma linha de onde o
 * anterior parou — o equivalente ao `<span class="text-primary">` da home.
 */
export function texto(trechos: Trecho[], x: number, base: number, estilo: Estilo) {
  const [primeiro, ...resto] = trechos as [Trecho, ...Trecho[]]
  const espacejamento = (estilo.espacejamento ?? 0) * estilo.tamanho
  return `<text x="${arredondar(x)}" y="${arredondar(base)}" fill="${primeiro.cor}"`
    + ` font-family="${estilo.familia}" font-weight="${estilo.peso}" font-size="${estilo.tamanho}"`
    + (espacejamento ? ` letter-spacing="${arredondar(espacejamento)}"` : '')
    + `>${escapar(primeiro.conteudo)}`
    + resto.filter((t) => t.conteudo).map((t) => `<tspan fill="${t.cor}">${escapar(t.conteudo)}</tspan>`).join('')
    + `</text>`
}

/** Quebra gulosa: só cabe na linha o que a medição disser que cabe. */
export function quebrar(medir: Medir, conteudo: string, largura: number, estilo: Estilo) {
  const linhas: string[] = []
  let atual = ''
  for (const palavra of conteudo.split(/\s+/).filter(Boolean)) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra
    if (atual && medir(tentativa, estilo).largura > largura) {
      linhas.push(atual)
      atual = palavra
    }
    else {
      atual = tentativa
    }
  }
  if (atual) linhas.push(atual)
  return linhas
}

/** Altura de tinta de um bloco: do topo da primeira linha à base da última. */
export function alturaDoBloco(medir: Medir, linhas: string[], estilo: Estilo, entrelinha: number) {
  return (linhas.length - 1) * estilo.tamanho * entrelinha
    - medir(linhas[0]!, estilo).topo
    + medir(linhas.at(-1)!, estilo).base
}

/**
 * Maior corpo em que o texto cabe no espaço reservado. Sem isto, um nome de
 * Iniciativa mais longo do que o previsto estouraria a caixa e a imagem sairia
 * com texto por cima do resto.
 *
 * `altura` é opcional porque nem todo bloco disputa altura com um vizinho; com
 * ela, o corpo cresce até onde o bloco inteiro couber, e não até o teto de
 * linhas — é o que deixa um nome de uma linha maior que um de três no mesmo
 * espaço, em vez de os dois saírem no corpo do pior caso.
 *
 * Falha em vez de encolher indefinidamente: um nome desenhado a 8px é ilegível
 * e ninguém percebe, enquanto um erro no build aparece na hora.
 */
export function ajustar(
  medir: Medir,
  conteudo: string,
  opcoes: {
    largura: number
    linhas: number
    teto: number
    altura?: number
    entrelinha?: number
  } & Omit<Estilo, 'tamanho'>,
) {
  const { largura, linhas: maximo, teto, altura, entrelinha = 1, ...resto } = opcoes
  for (let tamanho = Math.floor(teto); tamanho > 8; tamanho -= 1) {
    const estilo = { ...resto, tamanho }
    const linhas = quebrar(medir, conteudo, largura, estilo)
    const cabe = linhas.length <= maximo
      && linhas.every((linha) => medir(linha, estilo).largura <= largura)
      && (altura === undefined || alturaDoBloco(medir, linhas, estilo, entrelinha) <= altura)
    if (cabe) return { estilo, linhas }
  }
  throw new Error(
    `"${conteudo.slice(0, 40)}…" não cabe em ${maximo} linhas de ${Math.round(largura)}px`
    + (altura === undefined ? '' : ` por ${Math.round(altura)}px de altura`),
  )
}

/**
 * Desenha as linhas de um bloco a partir do topo da tinta da primeira: em SVG
 * se posiciona a linha de base, e alinhar pelo topo é o que faz o bloco
 * encostar onde o layout pediu, sem depender do corpo escolhido.
 */
export function bloco(
  medir: Medir,
  linhas: Trecho[][],
  x: number,
  topo: number,
  estilo: Estilo,
  entrelinha: number,
) {
  const plana = (linha: Trecho[]) => linha.map((t) => t.conteudo).join('')
  const base = topo - medir(plana(linhas[0]!), estilo).topo
  const passo = estilo.tamanho * entrelinha
  return {
    svg: linhas.map((linha, i) => texto(linha, x, base + i * passo, estilo)).join('\n  '),
    fim: base + (linhas.length - 1) * passo + medir(plana(linhas.at(-1)!), estilo).base,
  }
}

/** A marca, nas unidades de `logoViewBox`: preenchimento e traço da mesma cor. */
export function pata(cor: string) {
  return `<path d="${logoPad}" fill="${cor}" stroke="${cor}" stroke-width="${logoPadStroke}" stroke-linejoin="round"/>`
    + logoToes.map((dedo) => `<circle cx="${dedo.cx}" cy="${dedo.cy}" r="${dedo.r}" fill="${cor}"/>`).join('')
}
