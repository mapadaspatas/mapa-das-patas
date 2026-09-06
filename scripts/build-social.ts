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
 * Estão versionadas em `public/fontes/`, com a licença ao lado, então o script
 * roda sem rede.
 *
 *   node scripts/build-social.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import {
  ajustar,
  arredondar,
  bloco,
  COR,
  dimensoes,
  ESPACEJAMENTO_DISPLAY,
  FAMILIA,
  pata,
  texto,
  type Trecho,
} from '../app/utils/desenho.ts'
import { logoViewBox } from '../app/utils/logo.ts'
import { strings } from '../app/utils/strings.ts'
import { ufShapes, ufViewBox } from '../app/utils/uf-map.ts'
import { medirComResvg as medir, medirDesenhoComResvg, rasterizarComResvg } from './resvg.ts'

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

const DIR_SAIDA = 'public/imagens/redes'

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

// ---------------------------------------------------------------- desenhos

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
  const caixa = medirDesenhoComResvg(desenho, logoViewBox, LOGO.largura)
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
  const estiloNome = { familia: FAMILIA.display, peso: 700, tamanho: NOME, espacejamento: ESPACEJAMENTO_DISPLAY }
  const caixaNome = medir(strings.siteName, estiloNome)
  if (MARGEM + PATA + INTERVALO + caixaNome.largura > LADO - MARGEM) {
    throw new Error(`a assinatura não cabe na largura do cartão: encolhe PATA (hoje ${PATA}px)`)
  }
  const assinatura = `<g transform="translate(${MARGEM} ${MARGEM}) scale(${arredondar(escalaPata)})">${pata(COR.marca)}</g>
  ${texto([{ conteudo: strings.siteName, cor: COR.tinta }], MARGEM + PATA + INTERVALO, MARGEM + PATA / 2 - (caixaNome.topo + caixaNome.base) / 2, estiloNome)}`

  // A tese da home, com o fim na cor da marca (`titleAccent` em `index.vue`).
  const destaque = strings.home.title.endsWith(strings.home.titleAccent) ? strings.home.titleAccent : ''
  const titulo = ajustar(medir, strings.home.title, {
    largura: larguraTexto,
    linhas: 2,
    teto: 88,
    familia: FAMILIA.display,
    peso: 700,
    espacejamento: ESPACEJAMENTO_DISPLAY,
  })
  const blocoTitulo = bloco(
    medir,
    destacarFim(titulo.linhas, destaque, COR.tinta, COR.marca),
    MARGEM,
    MARGEM + PATA + 56,
    titulo.estilo,
    1.06,
  )

  const subtitulo = ajustar(medir, strings.home.subtitle, {
    largura: larguraTexto,
    linhas: 3,
    teto: 34,
    familia: FAMILIA.texto,
    peso: 400,
  })
  const blocoSubtitulo = bloco(
    medir,
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

  const estiloPerfil = { familia: FAMILIA.texto, peso: 400, tamanho: 30 }
  const estiloEndereco = { familia: FAMILIA.texto, peso: 600, tamanho: 34 }
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
  const estiloPilar = { familia: FAMILIA.texto, peso: 600, tamanho: PILAR.tamanho, espacejamento: 0.12 }
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
  const png = rasterizarComResvg(svg)
  writeFileSync(`${DIR_SAIDA}/${nome}`, png)
  console.log(`${DIR_SAIDA}/${nome} (${(png.length / 1024).toFixed(1)} KB)`)
}
