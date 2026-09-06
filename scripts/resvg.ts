/**
 * O resvg como medidor e rasterizador do desenho: é ele que transforma em PNG
 * o SVG que `app/utils/desenho.ts` monta, no build e nos testes.
 *
 * Mora em `scripts/`, e não em `app/utils/`, de propósito: o `@resvg/resvg-js`
 * é um binário nativo de Node e nada que o navegador carregue pode importá-lo,
 * nem por engano. O desenho é compartilhado; quem rasteriza, não.
 */
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import { type Medir, texto } from '../app/utils/desenho.ts'

const arquivo = (nome: string) => fileURLToPath(new URL(`../public/fontes/${nome}`, import.meta.url))

/**
 * As instâncias estáticas versionadas no repositório (ver `public/fontes/`).
 * `loadSystemFonts: false` mantém o resultado igual em qualquer máquina: com as
 * fontes do sistema carregadas, um Windows sem Instrument Sans renderizaria
 * Arial sem avisar e a imagem sairia "quase certa".
 */
export const fontes = {
  loadSystemFonts: false,
  fontFiles: [
    arquivo('bricolage-grotesque-700.ttf'),
    arquivo('instrument-sans-400.ttf'),
    arquivo('instrument-sans-600.ttf'),
  ],
}

/**
 * Caixa de tinta de um trecho. É o resvg que mede: ele já converte o texto em
 * contornos para desenhar, então a conta é a mesma que vai para o PNG —
 * inclusive com as acentuações do português, que sobem acima da caixa alta.
 */
export const medirComResvg: Medir = (conteudo, estilo) => {
  if (!conteudo.trim()) return { largura: 0, topo: 0, base: 0 }
  const base = 1000
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="8000" height="2000">`
    + texto([{ conteudo, cor: '#000' }], 0, base, estilo)
    + `</svg>`
  const caixa = new Resvg(svg, { font: fontes }).getBBox()
  if (!caixa) throw new Error(`o resvg não mediu "${conteudo}"`)
  return { largura: caixa.width, topo: caixa.y - base, base: caixa.y + caixa.height - base }
}

/**
 * Caixa de tinta de um trecho de SVG qualquer, nas unidades dele. `getBBox`, e
 * não `innerBBox`: este arredonda para o pixel inteiro, e a caixa da pata tem
 * 24 unidades de lado — um pixel ali é 4% do desenho. O traço entra na conta.
 */
export function medirDesenhoComResvg(conteudo: string, viewBox: string, lado: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${lado}" height="${lado}">${conteudo}</svg>`
  const caixa = new Resvg(svg, { font: fontes }).getBBox()
  if (!caixa) throw new Error('o resvg não mediu o desenho')
  return caixa
}

export function rasterizarComResvg(svg: string) {
  return new Resvg(svg, { font: fontes }).render().asPng()
}
