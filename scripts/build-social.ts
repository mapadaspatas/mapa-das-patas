/**
 * Gera as imagens de marca para as redes: a foto de perfil e o cartão de post
 * do Instagram do projeto (@mapadaspatas).
 *
 * Nada aqui é desenhado à mão. A pata-Brasil vem de `app/utils/logo.ts`, o
 * mapa de UFs de `app/utils/uf-map.ts` e a cópia de `app/utils/strings.ts` —
 * os mesmos arquivos que o site usa —, e as cores são as escalas urucum e
 * stone de `app/assets/css/main.css`. Assim o cartão é o herói da home no
 * tamanho de um post, e não uma peça paralela que envelhece sozinha.
 *
 * O SVG não quebra linha nem ajusta corpo: quem faz isso é `quebrar()` e
 * `ajustar()`, medindo o texto com o próprio resvg. É o que permite mexer na
 * cópia em `strings.ts`, rodar de novo e não reposicionar nada à mão.
 *
 * As fontes precisam chegar ao resvg como arquivo — ele não fala com o Google.
 * A API css2 devolve TTF, e não woff2, quando quem pede não é navegador (o
 * caso do fetch do Node); os arquivos ficam em `.data/fontes/`, fora do git.
 *
 *   node scripts/build-social.ts
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'
import { logoPad, logoPadStroke, logoToes, logoViewBox } from '../app/utils/logo.ts'
import { strings } from '../app/utils/strings.ts'
import { ufShapes, ufViewBox } from '../app/utils/uf-map.ts'

/** Largura e altura de um `viewBox`, para nenhuma escala aqui ser chutada. */
function dimensoes(viewBox: string) {
  const [, , largura, altura] = viewBox.split(/\s+/).map(Number) as [number, number, number, number]
  return { largura, altura }
}

const LOGO = dimensoes(logoViewBox)
const UF = dimensoes(ufViewBox)

/**
 * Lado do quadrado. O quadrado é o único formato que o Instagram não recorta
 * em nenhum lugar — feed, grade do perfil e compartilhamento mostram a imagem
 * inteira. Para o retrato 4:5 do feed, que ocupa mais tela mas é recortado na
 * grade, basta chamar `cartao(1350)`.
 */
const LADO = 1080

/** Margem do cartão, e por consequência a largura útil do texto. */
const MARGEM = 88

/**
 * Fração do lado ocupada pela maior dimensão da pata na foto de perfil. O
 * Instagram exibe o perfil em círculo: a 0.68 os cantos da caixa da pata caem
 * a 480px do centro, dentro do raio de 540, e nada encosta no corte.
 */
const OCUPACAO_PERFIL = 0.68

/**
 * Assinatura (pata + nome), na mesma proporção do cabeçalho do site:
 * `size-6` de pata, `text-xl` de nome e `gap-2` entre os dois (`default.vue`).
 */
const PATA = 96
const NOME = (PATA * 20) / 24
const INTERVALO = (PATA * 8) / 24

/** Espacejamento dos títulos, o mesmo de `.font-display` em `main.css`. */
const ESPACEJAMENTO_DISPLAY = -0.025

/**
 * Mapa de UFs no canto inferior direito. O tamanho sai do espaço que o texto
 * deixou; `alturaMinima` é o ponto em que ele deixaria de ser reconhecível
 * como Brasil e o script prefere falhar. `traco` está nas unidades do
 * `viewBox` de 1000x990, como no `UfMap.vue`.
 */
const MAPA = { alturaMinima: 220, traco: 5 }

/**
 * Pilares na coluna à esquerda do mapa. `recuo` é onde o rótulo começa, depois
 * do ponto; `passo` é a distância entre um rótulo e o próximo.
 */
const PILAR = { tamanho: 28, passo: 62, ponto: 7, recuo: 34 }

/**
 * Endereço impresso no cartão. Fica aqui, e não em `strings.ts`, porque o
 * site lê o dele de `NUXT_PUBLIC_SITE_URL` e uma imagem não acompanha
 * variável de ambiente: se o endereço mudar (ver `docs/deploy.md`),
 * troque esta linha e rode o script de novo.
 */
const ENDERECO = 'mapadaspatas.com.br'

const COR = {
  /** urucum-500: o `--ui-primary` do tema claro, a pata do cabeçalho. */
  marca: '#E2551F',
  /** urucum-600: o tile do favicon, para a foto de perfil falar com o ícone. */
  marcaTile: '#D6410E',
  /** urucum-700: o endereço, que precisa de contraste de texto e não de marca. */
  endereco: '#A82F07',
  /** urucum-200: o mapa, presente sem competir com o texto. */
  mapa: '#FACDB6',
  /**
   * mato-600 nos pilares: o verde é o da confiança em `main.css`, mas um degrau
   * abaixo do `text-secondary` do site (o 500). No papel do cartão o 500 dá
   * 3.6:1, e o rótulo é lido pequeno na timeline; o 600 dá 4.6:1.
   */
  confianca: '#1C7A4A',
  /** urucum-50: o papel. */
  fundo: '#FEF5F0',
  /** stone-900 e stone-600: `text-highlighted` e `text-muted` no tema claro. */
  tinta: '#1C1917',
  tintaFraca: '#57534E',
  /** stone-200: `border-muted`, o filete que fecha o texto. */
  filete: '#E7E5E4',
  branco: '#FFFFFF',
}

const DISPLAY = 'Bricolage Grotesque'
const TEXTO = 'Instrument Sans'
const DIR_FONTES = '.data/fontes'
const DIR_SAIDA = 'public/imagens/redes'

// ---------------------------------------------------------------- fontes

/**
 * Baixa a instância estática do peso pedido. Estática, e não o arquivo
 * variável: o resvg não aplica eixos de variação, então o variável chegaria
 * sempre na instância padrão e o título sairia em regular.
 */
async function baixarFonte(familia: string, peso: number) {
  const arquivo = `${DIR_FONTES}/${familia.toLowerCase().replace(/ /g, '-')}-${peso}.ttf`
  if (existsSync(arquivo)) return arquivo

  const css = `https://fonts.googleapis.com/css2?family=${familia.replace(/ /g, '+')}:wght@${peso}`
  const resposta = await fetch(css)
  if (!resposta.ok) throw new Error(`Google Fonts respondeu ${resposta.status} para ${familia} ${peso}`)
  const url = (await resposta.text()).match(/url\((https:[^)]+\.ttf)\)/)?.[1]
  if (!url) throw new Error(`sem TTF para ${familia} ${peso}: a API css2 devolveu woff2`)

  const ttf = await fetch(url)
  if (!ttf.ok) throw new Error(`download de ${familia} ${peso} respondeu ${ttf.status}`)
  mkdirSync(DIR_FONTES, { recursive: true })
  writeFileSync(arquivo, Buffer.from(await ttf.arrayBuffer()))
  return arquivo
}

const fontFiles = [
  await baixarFonte(DISPLAY, 700),
  await baixarFonte(TEXTO, 400),
  await baixarFonte(TEXTO, 600),
]
/*
 * `loadSystemFonts: false` mantém o resultado igual em qualquer máquina: com
 * as fontes do sistema carregadas, um Windows sem Instrument Sans renderizaria
 * Arial sem avisar e o cartão sairia "quase certo".
 */
const font = { loadSystemFonts: false, fontFiles }

// ---------------------------------------------------------------- medição

type Estilo = { familia: string, peso: number, tamanho: number, espacejamento?: number }
/** Pedaço de linha com cor própria: é o que permite pintar só o fim do título. */
type Trecho = { conteudo: string, cor: string }

function escapar(texto: string) {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Uma linha, em um ou mais trechos. O primeiro leva a cor no próprio `<text>`
 * e os seguintes viram `<tspan>`, que continua na mesma linha de onde o
 * anterior parou — o equivalente ao `<span class="text-primary">` da home.
 */
function texto(trechos: Trecho[], x: number, base: number, estilo: Estilo) {
  const [primeiro, ...resto] = trechos as [Trecho, ...Trecho[]]
  const espacejamento = (estilo.espacejamento ?? 0) * estilo.tamanho
  return `<text x="${arredondar(x)}" y="${arredondar(base)}" fill="${primeiro.cor}"`
    + ` font-family="${estilo.familia}" font-weight="${estilo.peso}" font-size="${estilo.tamanho}"`
    + (espacejamento ? ` letter-spacing="${arredondar(espacejamento)}"` : '')
    + `>${escapar(primeiro.conteudo)}`
    + resto.filter((t) => t.conteudo).map((t) => `<tspan fill="${t.cor}">${escapar(t.conteudo)}</tspan>`).join('')
    + `</text>`
}

/**
 * Caixa de tinta de um trecho, em pixels, relativa à linha de base. É o resvg
 * que mede: ele já converte o texto em contornos para desenhar, então a conta
 * é a mesma que vai para o PNG — inclusive com as acentuações do português,
 * que sobem acima da altura de caixa alta.
 */
function medir(conteudo: string, estilo: Estilo) {
  if (!conteudo.trim()) return { largura: 0, topo: 0, base: 0 }
  const base = 1000
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="8000" height="2000">`
    + texto([{ conteudo, cor: '#000' }], 0, base, estilo)
    + `</svg>`
  const caixa = new Resvg(svg, { font }).getBBox()
  if (!caixa) throw new Error(`o resvg não mediu "${conteudo}"`)
  return { largura: caixa.width, topo: caixa.y - base, base: caixa.y + caixa.height - base }
}

/**
 * Caixa de tinta de um trecho de SVG qualquer, nas unidades dele. `getBBox`, e
 * não `innerBBox`: este arredonda para o pixel inteiro, e a caixa da pata tem
 * 24 unidades de lado — um pixel ali é 4% do desenho. O traço entra na conta.
 */
function medirDesenho(conteudo: string, viewBox: string, lado: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${lado}" height="${lado}">${conteudo}</svg>`
  const caixa = new Resvg(svg, { font }).getBBox()
  if (!caixa) throw new Error('o resvg não mediu o desenho')
  return caixa
}

/** Quebra gulosa: só cabe na linha o que a medição disser que cabe. */
function quebrar(conteudo: string, largura: number, estilo: Estilo) {
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

/**
 * Maior corpo em que o texto cabe no espaço reservado. O cartão inteiro está
 * amarrado a `strings.ts`: sem isto, uma frase mais longa lá estouraria a
 * caixa aqui, e a imagem sairia com texto por cima do mapa.
 */
function ajustar(conteudo: string, opcoes: { largura: number, linhas: number, teto: number } & Omit<Estilo, 'tamanho'>) {
  const { largura, linhas: maximo, teto, ...resto } = opcoes
  for (let tamanho = teto; tamanho > 8; tamanho -= 1) {
    const estilo = { ...resto, tamanho }
    const linhas = quebrar(conteudo, largura, estilo)
    if (linhas.length <= maximo) return { estilo, linhas }
  }
  throw new Error(`"${conteudo.slice(0, 40)}…" não cabe em ${maximo} linhas de ${largura}px`)
}

/**
 * Desenha as linhas de um bloco a partir do topo da tinta da primeira: em SVG
 * se posiciona a linha de base, e alinhar pelo topo é o que faz o bloco
 * encostar onde o layout pediu, sem depender do corpo escolhido.
 */
function bloco(linhas: Trecho[][], x: number, topo: number, estilo: Estilo, entrelinha: number) {
  const plana = (linha: Trecho[]) => linha.map((t) => t.conteudo).join('')
  const base = topo - medir(plana(linhas[0]!), estilo).topo
  const passo = estilo.tamanho * entrelinha
  return {
    svg: linhas.map((linha, i) => texto(linha, x, base + i * passo, estilo)).join('\n  '),
    fim: base + (linhas.length - 1) * passo + medir(plana(linhas.at(-1)!), estilo).base,
  }
}

/**
 * Pinta o fim do texto com a cor da marca, atravessando a quebra de linha:
 * o destaque pode começar no meio de uma linha, como o `<span>` da home faz.
 */
function destacarFim(linhas: string[], destaque: string, tinta: string, marca: string): Trecho[][] {
  const inteiro = linhas.join(' ')
  // Sem o destaque no fim do que sobrou, pintar por posição erraria o trecho.
  const corte = destaque && inteiro.endsWith(destaque) ? inteiro.length - destaque.length : inteiro.length
  let lidos = 0
  return linhas.map((linha) => {
    const quebra = Math.min(Math.max(corte - lidos, 0), linha.length)
    lidos += linha.length + 1
    return [
      { conteudo: linha.slice(0, quebra), cor: tinta },
      { conteudo: linha.slice(quebra), cor: marca },
    ].filter((t) => t.conteudo) as Trecho[]
  })
}

function arredondar(valor: number) {
  return Math.round(valor * 100) / 100
}

// ---------------------------------------------------------------- desenhos

/** A marca, nas unidades de `logoViewBox`: preenchimento e traço da mesma cor. */
function pata(cor: string) {
  return `<path d="${logoPad}" fill="${cor}" stroke="${cor}" stroke-width="${logoPadStroke}" stroke-linejoin="round"/>`
    + logoToes.map((dedo) => `<circle cx="${dedo.cx}" cy="${dedo.cy}" r="${dedo.r}" fill="${cor}"/>`).join('')
}

/** Os 27 estados em chapado, sem sigla e sem rampa: aqui o mapa é figura, não dado. */
function mapa() {
  return Object.values(ufShapes)
    .map((uf) => `<path d="${uf.d}" fill="${COR.mapa}" stroke="${COR.fundo}" stroke-width="${MAPA.traco}" stroke-linejoin="round"/>`)
    .join('\n    ')
}

/**
 * Foto de perfil: a pata em branco sobre o tile da marca, como no favicon.
 * A diferença é que aqui a pata é centrada pela caixa de tinta, e não pela
 * caixa de 24 unidades: é o recorte em círculo do Instagram que manda, e ele
 * não perdoa uma marca fora do centro como um favicon quadrado perdoa.
 */
function perfil() {
  const desenho = pata(COR.branco)
  const caixa = medirDesenho(desenho, logoViewBox, LOGO.largura)
  const escala = (LADO * OCUPACAO_PERFIL) / Math.max(caixa.width, caixa.height)
  const x = LADO / 2 - (caixa.x + caixa.width / 2) * escala
  const y = LADO / 2 - (caixa.y + caixa.height / 2) * escala

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LADO} ${LADO}" width="${LADO}" height="${LADO}">
  <rect width="${LADO}" height="${LADO}" fill="${COR.marcaTile}"/>
  <g transform="translate(${arredondar(x)} ${arredondar(y)}) scale(${arredondar(escala)})">${desenho}</g>
</svg>
`
}

/**
 * Cartão de post: o herói da home ampliado. Assinatura, a tese com o fim na
 * cor da marca, a regra da Fonte, e o endereço com o mapa fechando embaixo.
 */
function cartao(altura: number) {
  const larguraTexto = LADO - 2 * MARGEM
  const fundo = `<rect width="${LADO}" height="${altura}" fill="${COR.fundo}"/>`

  // Assinatura: pata à esquerda, nome com a caixa alta centrada na altura dela.
  const escalaPata = PATA / LOGO.largura
  const estiloNome = { familia: DISPLAY, peso: 700, tamanho: NOME, espacejamento: ESPACEJAMENTO_DISPLAY }
  const caixaNome = medir(strings.siteName, estiloNome)
  if (MARGEM + PATA + INTERVALO + caixaNome.largura > LADO - MARGEM) {
    throw new Error(`a assinatura não cabe na largura do cartão: encolhe PATA (hoje ${PATA}px)`)
  }
  const assinatura = `<g transform="translate(${MARGEM} ${MARGEM}) scale(${arredondar(escalaPata)})">${pata(COR.marca)}</g>
  ${texto([{ conteudo: strings.siteName, cor: COR.tinta }], MARGEM + PATA + INTERVALO, MARGEM + PATA / 2 - (caixaNome.topo + caixaNome.base) / 2, estiloNome)}`

  // A tese da home, com o fim na cor da marca (`titleAccent` em `index.vue`).
  const destaque = strings.home.title.endsWith(strings.home.titleAccent) ? strings.home.titleAccent : ''
  const titulo = ajustar(strings.home.title, {
    largura: larguraTexto,
    linhas: 2,
    teto: 88,
    familia: DISPLAY,
    peso: 700,
    espacejamento: ESPACEJAMENTO_DISPLAY,
  })
  const blocoTitulo = bloco(
    destacarFim(titulo.linhas, destaque, COR.tinta, COR.marca),
    MARGEM,
    MARGEM + PATA + 56,
    titulo.estilo,
    1.06,
  )

  const subtitulo = ajustar(strings.home.subtitle, {
    largura: larguraTexto,
    linhas: 3,
    teto: 34,
    familia: TEXTO,
    peso: 400,
  })
  const blocoSubtitulo = bloco(
    subtitulo.linhas.map((conteudo) => [{ conteudo, cor: COR.tintaFraca }]),
    MARGEM,
    blocoTitulo.fim + 44,
    subtitulo.estilo,
    1.5,
  )

  /*
   * Faixa de fecho: um filete como o `border-t border-muted` das seções do
   * site, o mapa à direita e o endereço à esquerda, ancorados na margem de
   * baixo. Ela ocupa toda a altura que o texto deixou — cópia mais curta dá
   * mapa maior, em vez de abrir um buraco no meio do cartão.
   */
  const linhaFilete = blocoSubtitulo.fim + 52
  const topoMapa = linhaFilete + 40
  const alturaMapa = altura - MARGEM - topoMapa
  const escalaMapa = alturaMapa / UF.altura
  const larguraMapa = UF.largura * escalaMapa
  const selo = `<g transform="translate(${arredondar(LADO - MARGEM - larguraMapa)} ${arredondar(topoMapa)}) scale(${arredondar(escalaMapa)})">
    ${mapa()}
  </g>`

  const estiloPerfil = { familia: TEXTO, peso: 400, tamanho: 30 }
  const estiloEndereco = { familia: TEXTO, peso: 600, tamanho: 34 }
  const basePerfil = altura - MARGEM - medir(strings.contact.instagramHandle, estiloPerfil).base
  const baseEndereco = basePerfil - 48
  const rodape = texto([{ conteudo: ENDERECO, cor: COR.endereco }], MARGEM, baseEndereco, estiloEndereco)
    + '\n  ' + texto([{ conteudo: strings.contact.instagramHandle, cor: COR.tintaFraca }], MARGEM, basePerfil, estiloPerfil)
  const topoEndereco = baseEndereco + medir(ENDERECO, estiloEndereco).topo

  /*
   * A coluna à esquerda do mapa é dos três pilares do "Por que confiar" da
   * home (`home.trust`), e só dos rótulos: o corpo de cada um repete o que o
   * subtítulo já disse. Em versal espaçado e no verde da confiança, como na
   * fileira que fecha o herói do site — e o ponto verde é o que os lê como
   * lista, no lugar do `border-t` que ali separa as três colunas.
   *
   * As três linhas andam de `passo` em `passo` a partir da caixa do primeiro
   * rótulo, e não cada uma da sua: alinhar pelo topo da tinta faria HISTÓRICO
   * PÚBLICO descer o que o acento sobe, e as linhas de base sairiam tortas.
   * O bloco fica centrado no vão entre o filete e o endereço.
   */
  const estiloPilar = { familia: TEXTO, peso: 600, tamanho: PILAR.tamanho, espacejamento: 0.12 }
  const rotulos = [strings.home.trust.source, strings.home.trust.history, strings.home.trust.moderation]
    .map((pilar) => pilar.title.toLocaleUpperCase('pt-BR'))
  const caixasPilar = rotulos.map((rotulo) => medir(rotulo, estiloPilar))
  const referencia = caixasPilar[0]!
  const alturaPilares = (rotulos.length - 1) * PILAR.passo + (referencia.base - referencia.topo)
  const basePilares = topoMapa + (topoEndereco - topoMapa - alturaPilares) / 2 - referencia.topo
  const colunaPilares = rotulos
    .map((conteudo, i) => {
      const base = basePilares + i * PILAR.passo
      return `<circle cx="${MARGEM + PILAR.ponto}" cy="${arredondar(base + (referencia.topo + referencia.base) / 2)}"`
        + ` r="${PILAR.ponto}" fill="${COR.confianca}"/>`
        + texto([{ conteudo, cor: COR.confianca }], MARGEM + PILAR.recuo, base, estiloPilar)
    })
    .join('\n  ')

  /*
   * O cartão inteiro está amarrado a `strings.ts` e às fontes, então o que o
   * layout supõe é conferido, e não presumido: cópia mais longa encolhe o
   * mapa até ele sumir, ou passa por baixo dele. Falhar aqui é mais barato
   * que descobrir isso num PNG já publicado.
   */
  if (alturaMapa < MAPA.alturaMinima) {
    throw new Error(
      `sobraram ${Math.round(alturaMapa)}px para o mapa (mínimo ${MAPA.alturaMinima}): `
      + 'a cópia cresceu — baixe o teto do corpo, ou gere o cartão mais alto',
    )
  }
  const larguraColuna = Math.max(
    medir(ENDERECO, estiloEndereco).largura,
    medir(strings.contact.instagramHandle, estiloPerfil).largura,
    PILAR.recuo + Math.max(...caixasPilar.map((caixa) => caixa.largura)),
  )
  if (MARGEM + larguraColuna > LADO - MARGEM - larguraMapa - 40) {
    throw new Error(`a coluna da esquerda (${Math.round(larguraColuna)}px) encosta no mapa: encolhe o corpo dela`)
  }
  if (alturaPilares + 48 > topoEndereco - topoMapa) {
    throw new Error(
      `os pilares pedem ${Math.round(alturaPilares)}px e o vão até o endereço tem `
      + `${Math.round(topoEndereco - topoMapa)}px: encolhe PILAR.passo (hoje ${PILAR.passo}px)`,
    )
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LADO} ${altura}" width="${LADO}" height="${altura}">
  ${fundo}
  ${assinatura}
  ${blocoTitulo.svg}
  ${blocoSubtitulo.svg}
  <rect x="${MARGEM}" y="${arredondar(linhaFilete)}" width="${larguraTexto}" height="1.5" fill="${COR.filete}"/>
  ${colunaPilares}
  ${rodape}
  ${selo}
</svg>
`
}

// ---------------------------------------------------------------- saída

mkdirSync(DIR_SAIDA, { recursive: true })

const arquivos: [string, string][] = [
  ['instagram-perfil.png', perfil()],
  ['instagram-post.png', cartao(LADO)],
]

for (const [nome, svg] of arquivos) {
  const png = new Resvg(svg, { font }).render().asPng()
  writeFileSync(`${DIR_SAIDA}/${nome}`, png)
  console.log(`${DIR_SAIDA}/${nome} (${(png.length / 1024).toFixed(1)} KB)`)
}
