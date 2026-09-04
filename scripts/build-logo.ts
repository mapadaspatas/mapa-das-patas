/**
 * Gera a marca do site: uma pata cuja almofada é a silhueta do Brasil.
 *
 * O contorno do país vem da malha oficial do IBGE, é projetado em Mercator e
 * simplificado por Douglas-Peucker até caber em poucos vértices (14), que uma
 * Catmull-Rom transforma em curvas. Por cima do preenchimento vai um traço da
 * mesma cor: é ele que engorda a silhueta em uma unidade e arredonda as pontas,
 * o que faz o mapa ler como almofada em 24px sem perder o Brasil em 128px.
 * Três dedos preenchidos seguem a costa norte e nordeste.
 *
 * Escreve `app/utils/logo.ts` (consumido por `SiteLogo.vue`), `public/favicon.svg`
 * (a mesma pata em branco sobre um tile na cor da marca) e
 * `public/apple-touch-icon.png` (o iOS não aceita SVG; o tile vai sem cantos
 * arredondados porque o próprio iOS aplica a máscara dele).
 * Rodar de novo só é necessário se a malha ou a composição mudarem.
 *
 *   node scripts/build-logo.ts
 */
import { writeFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'

/** Lado do viewBox: o mesmo do Lucide, que a pata substitui. */
const LADO = 24
/** Douglas-Peucker afrouxa até a silhueta caber neste número de vértices. */
const MAX_VERTICES = 16
/** Largura da almofada no viewBox e canto superior esquerdo da sua caixa. */
const ALMOFADA = { largura: 11.5, x: 4.2, y: 9.6 }
/** Traço sobre o preenchimento: engorda a almofada em metade disto. */
const TRACO = 2
/** Dedos: em arco sobre a costa, do Pará ao Rio Grande do Norte. */
const DEDOS = [
  { cx: 7.2, cy: 5.2, r: 2.7 },
  { cx: 13.2, cy: 3.6, r: 2.7 },
  { cx: 18.8, cy: 7.6, r: 2.7 },
]
/** Favicon: tile arredondado na cor da marca, pata em branco com margem. */
const FAVICON = { lado: 32, raio: 7, cor: '#D6410E', margem: 5 }
/** Tamanho que o iOS pede para o apple-touch-icon. */
const TOUCH_ICON = 180

const URL_IBGE
  = 'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR'
    + '?formato=application/vnd.geo+json&qualidade=minima'

type Ponto = [number, number]

/** Mercator. O Brasil fica entre ~5°N e ~34°S, bem longe da distorção polar. */
function projetar([lon, lat]: Ponto): Ponto {
  const rad = (lat * Math.PI) / 180
  return [lon, Math.log(Math.tan(Math.PI / 4 + rad / 2)) * (180 / Math.PI)]
}

function distanciaAoSegmento([px, py]: Ponto, [ax, ay]: Ponto, [bx, by]: Ponto) {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  if (!len2) return Math.hypot(px - ax, py - ay)
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/** Douglas-Peucker iterativo, o mesmo de `build-uf-map.ts`. */
function simplificar(pontos: Ponto[], tol: number): Ponto[] {
  if (pontos.length < 4) return pontos
  const manter = new Uint8Array(pontos.length)
  manter[0] = 1
  manter[pontos.length - 1] = 1
  const pilha: [number, number][] = [[0, pontos.length - 1]]
  while (pilha.length) {
    const [ini, fim] = pilha.pop()!
    let pior = 0
    let idx = -1
    for (let k = ini + 1; k < fim; k++) {
      const d = distanciaAoSegmento(pontos[k]!, pontos[ini]!, pontos[fim]!)
      if (d > pior) { pior = d; idx = k }
    }
    if (pior > tol && idx > 0) {
      manter[idx] = 1
      pilha.push([ini, idx], [idx, fim])
    }
  }
  return pontos.filter((_, k) => manter[k] === 1)
}

/** Área com sinal do polígono (fórmula do shoelace). */
function area(anel: Ponto[]) {
  let s = 0
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    s += anel[j]![0] * anel[i]![1] - anel[i]![0] * anel[j]![1]
  }
  return Math.abs(s / 2)
}

/** Catmull-Rom fechada reescrita como cúbicas de Bézier. */
function curvaFechada(pts: Ponto[]) {
  const n = pts.length
  const r = (v: number) => Math.round(v * 100) / 100
  let d = `M${r(pts[0]![0])} ${r(pts[0]![1])}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]!
    const p1 = pts[i]!
    const p2 = pts[(i + 1) % n]!
    const p3 = pts[(i + 2) % n]!
    const c1: Ponto = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: Ponto = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${r(c1[0])} ${r(c1[1])} ${r(c2[0])} ${r(c2[1])} ${r(p2[0])} ${r(p2[1])}`
  }
  return d + 'Z'
}

const resposta = await fetch(URL_IBGE)
if (!resposta.ok) throw new Error(`IBGE respondeu ${resposta.status}`)
const geo = await resposta.json() as {
  features: { geometry: { type: string, coordinates: unknown } }[]
}

const geom = geo.features[0]!.geometry
const aneis = geom.type === 'Polygon'
  ? [(geom.coordinates as number[][][])[0] as Ponto[]]
  : (geom.coordinates as number[][][][]).map((poly) => poly[0] as Ponto[])

// Só o continente: ilhas somem em escala de ícone.
let anel = aneis.map((a) => a.map(projetar)).reduce((a, b) => (area(a) >= area(b) ? a : b))
const [x0, y0] = anel[0]!
const [xn, yn] = anel[anel.length - 1]!
if (anel.length > 1 && x0 === xn && y0 === yn) anel = anel.slice(0, -1)

// Normaliza numa caixa de LADO unidades; Mercator cresce para o norte, o SVG para baixo.
const xs = anel.map((p) => p[0])
const ys = anel.map((p) => p[1])
const minX = Math.min(...xs)
const maxX = Math.max(...xs)
const minY = Math.min(...ys)
const maxY = Math.max(...ys)
const escala = LADO / Math.max(maxX - minX, maxY - minY)
anel = anel.map(([x, y]) => [(x - minX) * escala, (maxY - y) * escala])

// Douglas-Peucker fixa as pontas do anel. Começar pelo ponto mais a leste (a
// Ponta do Seixas) garante que a ponta fixada é um vértice real, e não o corte
// arbitrário onde o GeoJSON começou a listar coordenadas.
const iLeste = anel.reduce((melhor, p, i) => (p[0] > anel[melhor]![0] ? i : melhor), 0)
anel = [...anel.slice(iLeste), ...anel.slice(0, iLeste), anel[iLeste]!]

let tolerancia = 0.05
let simples = anel
while (true) {
  simples = simplificar(anel, tolerancia)
  if (simples.length <= MAX_VERTICES) break
  tolerancia *= 1.15
}
simples = simples.slice(0, -1)

// Encaixa a silhueta na caixa da almofada, escalando pela largura.
const larguraAtual = Math.max(...simples.map((p) => p[0])) - Math.min(...simples.map((p) => p[0]))
const s = ALMOFADA.largura / larguraAtual
const almofada = curvaFechada(simples.map(([x, y]) => [x * s + ALMOFADA.x, y * s + ALMOFADA.y]))

const utils = `/**
 * Marca do site: pata com a almofada na silhueta do Brasil, num viewBox de
 * ${LADO}x${LADO}. Gerado por \`scripts/build-logo.ts\` a partir da malha do IBGE.
 * Não editar à mão; quem desenha é \`SiteLogo.vue\`.
 */
export const logoViewBox = '0 0 ${LADO} ${LADO}'

/** Silhueta do Brasil (${simples.length} vértices, Catmull-Rom), a ser preenchida E traçada. */
export const logoPad = '${almofada}'

/** Traço da mesma cor sobre a almofada: engorda-a em ${TRACO / 2} e arredonda as pontas. */
export const logoPadStroke = ${TRACO}

/** Dedos preenchidos, em arco sobre a costa norte e nordeste. */
export const logoToes = ${JSON.stringify(DEDOS)} as const
`
writeFileSync('app/utils/logo.ts', utils)

const escalaFav = (FAVICON.lado - 2 * FAVICON.margem) / LADO
const tile = (raio: number) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FAVICON.lado} ${FAVICON.lado}" width="${FAVICON.lado}" height="${FAVICON.lado}">
  <rect width="${FAVICON.lado}" height="${FAVICON.lado}" rx="${raio}" fill="${FAVICON.cor}"/>
  <g transform="translate(${FAVICON.margem} ${FAVICON.margem}) scale(${Math.round(escalaFav * 10000) / 10000})" fill="#ffffff">
    <path d="${almofada}" stroke="#ffffff" stroke-width="${TRACO}" stroke-linejoin="round"/>
${DEDOS.map((d) => `    <circle cx="${d.cx}" cy="${d.cy}" r="${d.r}"/>`).join('\n')}
  </g>
</svg>
`
writeFileSync('public/favicon.svg', tile(FAVICON.raio))

const png = new Resvg(tile(0), { fitTo: { mode: 'width', value: TOUCH_ICON } }).render().asPng()
writeFileSync('public/apple-touch-icon.png', png)

console.log(`vértices: ${anel.length} -> ${simples.length} (tolerância ${tolerancia.toFixed(2)})`)
console.log(`arquivos: app/utils/logo.ts, public/favicon.svg, public/apple-touch-icon.png (${TOUCH_ICON}px, ${(png.length / 1024).toFixed(1)} KB)`)
