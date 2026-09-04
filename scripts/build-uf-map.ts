/**
 * Gera os contornos dos 27 estados a partir da malha oficial do IBGE.
 *
 * A malha vem em GeoJSON (lon/lat), pesada demais para um elemento de página:
 * ~250 KB só de coordenadas. Aqui ela é projetada em Mercator, simplificada por
 * Douglas-Peucker e reemitida como path SVG relativo com uma casa decimal.
 *
 * Fonte: IBGE, malha de UFs (dado público do governo brasileiro). Rodar de novo
 * só é necessário se a malha mudar — o resultado é versionado no repositório.
 *
 *   node scripts/build-uf-map.ts
 */
import { writeFileSync } from 'node:fs'

/** Largura do viewBox de saída; a altura sai da proporção da projeção. */
const LARGURA = 1000
/** Em unidades do viewBox. ~0.5px num mapa de 440px de largura. */
const TOLERANCIA = 1.1
/** Ilha menor que isto (fração da maior parte do estado) não entra. */
const AREA_MINIMA = 0.005

const URL_IBGE
  = 'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR'
    + '?formato=application/vnd.geo+json&qualidade=intermediaria&intrarregiao=UF'

/** Código numérico do IBGE para a sigla da UF. */
const UF_POR_CODIGO: Record<string, string> = {
  11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO',
  21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN', 25: 'PB', 26: 'PE', 27: 'AL',
  28: 'SE', 29: 'BA', 31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP', 41: 'PR',
  42: 'SC', 43: 'RS', 50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF',
}

const NOME_POR_UF: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AM: 'Amazonas', AP: 'Amapá', BA: 'Bahia',
  CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás',
  MA: 'Maranhão', MG: 'Minas Gerais', MS: 'Mato Grosso do Sul',
  MT: 'Mato Grosso', PA: 'Pará', PB: 'Paraíba', PE: 'Pernambuco',
  PI: 'Piauí', PR: 'Paraná', RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte', RO: 'Rondônia', RR: 'Roraima',
  RS: 'Rio Grande do Sul', SC: 'Santa Catarina', SE: 'Sergipe',
  SP: 'São Paulo', TO: 'Tocantins',
}

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

/** Douglas-Peucker iterativo: a recursão estoura em anéis de milhares de pontos. */
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

/** Centroide de área, para ancorar o rótulo da UF. */
function centroide(anel: Ponto[]): Ponto {
  let cx = 0
  let cy = 0
  let a = 0
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const f = anel[j]![0] * anel[i]![1] - anel[i]![0] * anel[j]![1]
    a += f
    cx += (anel[j]![0] + anel[i]![0]) * f
    cy += (anel[j]![1] + anel[i]![1]) * f
  }
  a *= 0.5
  if (!a) return anel[0]!
  return [cx / (6 * a), cy / (6 * a)]
}

/** Só anéis externos: buracos não existem entre UFs contíguas. */
function aneisDe(geom: { type: string, coordinates: unknown }): Ponto[][] {
  const coords = geom.coordinates as number[][][] | number[][][][]
  if (geom.type === 'Polygon') return [(coords as number[][][])[0] as Ponto[]]
  return (coords as number[][][][]).map((poly) => poly[0] as Ponto[])
}

const resposta = await fetch(URL_IBGE)
if (!resposta.ok) throw new Error(`IBGE respondeu ${resposta.status}`)
const geo = await resposta.json() as {
  features: { properties: { codarea: string }, geometry: { type: string, coordinates: unknown } }[]
}

// Projeta tudo antes de escalar: a caixa precisa ser a do país inteiro.
const estados = geo.features.map((f) => {
  const uf = UF_POR_CODIGO[String(f.properties.codarea)]
  if (!uf) throw new Error(`código IBGE desconhecido: ${f.properties.codarea}`)
  return { uf, aneis: aneisDe(f.geometry).map((anel) => anel.map(projetar)) }
})

let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity
for (const { aneis } of estados) {
  for (const anel of aneis) {
    for (const [x, y] of anel) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
}

const escala = LARGURA / (maxX - minX)
const ALTURA = Math.round((maxY - minY) * escala)
/** Mercator cresce para o norte; o SVG cresce para baixo, daí o eixo Y invertido. */
const paraTela = ([x, y]: Ponto): Ponto => [(x - minX) * escala, (maxY - y) * escala]

const r = (n: number) => Math.round(n * 10) / 10

function paraPath(aneis: Ponto[][]) {
  let d = ''
  for (const anel of aneis) {
    if (anel.length < 3) continue
    let cx = r(anel[0]![0])
    let cy = r(anel[0]![1])
    d += `M${cx} ${cy}`
    for (let k = 1; k < anel.length; k++) {
      const nx = r(anel[k]![0])
      const ny = r(anel[k]![1])
      const dx = r(nx - cx)
      const dy = r(ny - cy)
      if (dx === 0 && dy === 0) continue
      d += `l${dx} ${dy}`
      cx = r(cx + dx)
      cy = r(cy + dy)
    }
    d += 'z'
  }
  return d
}

const saida: Record<string, { d: string, nome: string, cx: number, cy: number, area: number }> = {}
let pontosAntes = 0
let pontosDepois = 0
const areaTotal = LARGURA * ALTURA

for (const { uf, aneis } of estados.sort((a, b) => a.uf.localeCompare(b.uf))) {
  const naTela = aneis.map((anel) => anel.map(paraTela))
  pontosAntes += naTela.reduce((s, a) => s + a.length, 0)

  const maior = Math.max(...naTela.map(area))
  const relevantes = naTela.filter((anel) => area(anel) >= maior * AREA_MINIMA)
  const simples = relevantes
    .map((anel) => simplificar(anel, TOLERANCIA))
    .filter((anel) => anel.length >= 3)
  pontosDepois += simples.reduce((s, a) => s + a.length, 0)

  const principal = simples.reduce((a, b) => (area(a) >= area(b) ? a : b))
  const [cx, cy] = centroide(principal)
  saida[uf] = {
    d: paraPath(simples),
    nome: NOME_POR_UF[uf]!,
    cx: r(cx),
    cy: r(cy),
    // Fração do viewBox ocupada pelo estado: quem desenha decide com isto se
    // cabe uma sigla dentro do contorno (PB, AL, SE e o DF não cabem).
    area: Math.round((area(principal) / areaTotal) * 10000) / 10000,
  }
}

const conteudo = `/**
 * Contornos dos 27 estados, em um viewBox de ${LARGURA}x${ALTURA} (Mercator).
 * Gerado por \`scripts/build-uf-map.ts\` a partir da malha de UFs do IBGE.
 * Não editar à mão.
 */
export const ufViewBox = '0 0 ${LARGURA} ${ALTURA}'

export const ufShapes = ${JSON.stringify(saida, null, 2)} as const satisfies Record<
  string,
  { d: string, nome: string, cx: number, cy: number, area: number }
>
`

writeFileSync('app/utils/uf-map.ts', conteudo)

console.log(`estados: ${Object.keys(saida).length}`)
console.log(`viewBox: ${LARGURA}x${ALTURA}`)
console.log(`pontos:  ${pontosAntes} -> ${pontosDepois} (${(100 - (pontosDepois / pontosAntes) * 100).toFixed(1)}% a menos)`)
console.log(`arquivo: app/utils/uf-map.ts, ${(conteudo.length / 1024).toFixed(0)} KB`)
