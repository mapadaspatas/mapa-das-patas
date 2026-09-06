/**
 * Gera o Cartão de uma Iniciativa no navegador de quem vai divulgar, a partir
 * do mesmo desenho que o build usa (`app/utils/cartao.ts`).
 *
 * É aqui, e não no build, porque a arte de stories tem variação (com e sem QR)
 * e é pedida por uma pessoa de cada vez: gerar as duas de cada Iniciativa com
 * CNPJ a cada publicação dobraria o trabalho do build para uma minoria delas.
 *
 * Um SVG carregado como imagem é um documento isolado: não usa as fontes da
 * página, não busca nada na rede, e qualquer `href` externo dentro dele faria
 * o navegador recusar exportar o Canvas. Por isso tudo entra embutido — as
 * fontes em base64 e a Imagem da Iniciativa como data URI —, e por isso a
 * medição usa os mesmos arquivos de fonte que vão embutidos, sob um nome
 * próprio: medir na variável que o site carrega e desenhar na estática daria
 * um layout ajustado para uma métrica que o resultado não tem.
 */
import {
  type DadosDoCartao,
  desenharCartao,
  type Enquadramento,
  ENQUADRAMENTOS,
} from './cartao.ts'
import { FAMILIA, type Estilo, type Medir } from './desenho.ts'

/** As mesmas instâncias estáticas que o resvg usa no build. */
const ARQUIVOS = [
  { arquivo: 'bricolage-grotesque-700.ttf', familia: FAMILIA.display, peso: 700 },
  { arquivo: 'instrument-sans-400.ttf', familia: FAMILIA.texto, peso: 400 },
  { arquivo: 'instrument-sans-600.ttf', familia: FAMILIA.texto, peso: 600 },
] as const

/**
 * Nome sob o qual as fontes do Cartão são registradas para medir. Precisa ser
 * diferente do nome real: o site já registrou os arquivos variáveis com ele, e
 * a medição cairia neles em vez de nas instâncias estáticas do Cartão.
 */
const medicao = (familia: string) => `Medida do Cartão ${familia}`

export interface PedidoDeCartao {
  nome: string
  cidade: string
  estado: string
  /** Endereço da página, como se lê, sem esquema. */
  endereco: string
  verificado?: boolean
  /** Caminho da Imagem no site (`/imagens/iniciativas/<slug>.webp`), se houver. */
  imagem?: string
  /**
   * BR Code da doação, quando a pessoa pediu o QR. Vem montado pela página, do
   * mesmo `pixBrCodeOf()` que desenha o QR da tela: a chave não sai daqui para
   * serviço nenhum, e o código da arte é o mesmo que a página mostra.
   */
  brCode?: string
}

function base64(bytes: ArrayBuffer) {
  const octetos = new Uint8Array(bytes)
  // Em pedaços: 82 KB de uma vez estouram o limite de argumentos de `apply`.
  let binario = ''
  for (let i = 0; i < octetos.length; i += 8192) {
    binario += String.fromCharCode(...octetos.subarray(i, i + 8192))
  }
  return btoa(binario)
}

/**
 * Busca as fontes uma vez por sessão, registra-as para medição e devolve o
 * `@font-face` que vai embutido no SVG. São 179 KB, buscados só quando alguém
 * clica em divulgar: quem só lê a página não paga por isto.
 */
let fontes: Promise<string> | undefined

function carregarFontes() {
  fontes ??= (async () => {
    const carregados = await Promise.all(ARQUIVOS.map(async (fonte) => {
      const resposta = await fetch(`/fontes/${fonte.arquivo}`)
      if (!resposta.ok) throw new Error(`fonte ${fonte.arquivo} respondeu ${resposta.status}`)
      return { ...fonte, bytes: await resposta.arrayBuffer() }
    }))

    await Promise.all(carregados.map(async (fonte) => {
      const face = new FontFace(medicao(fonte.familia), fonte.bytes, { weight: String(fonte.peso) })
      document.fonts.add(await face.load())
    }))

    return carregados
      .map((fonte) => `@font-face{font-family:'${fonte.familia}';font-weight:${fonte.peso};`
        + `src:url(data:font/ttf;base64,${base64(fonte.bytes)}) format('truetype')}`)
      .join('')
  })()
  return fontes
}

let pincel: CanvasRenderingContext2D | undefined

/**
 * Caixa de tinta de um trecho, medida no Canvas com as fontes do Cartão.
 *
 * `letterSpacing` do contexto é recente, e onde não existe a medida sai um
 * pouco larga (o espacejamento dos títulos é negativo). Isso encolhe o corpo
 * escolhido em vez de estourar a caixa, que é o erro que dá para conviver.
 */
const medirComCanvas: Medir = (conteudo, estilo: Estilo) => {
  if (!conteudo.trim()) return { largura: 0, topo: 0, base: 0 }
  pincel ??= document.createElement('canvas').getContext('2d')!
  pincel.font = `${estilo.peso} ${estilo.tamanho}px "${medicao(estilo.familia)}"`
  pincel.letterSpacing = `${(estilo.espacejamento ?? 0) * estilo.tamanho}px`
  const caixa = pincel.measureText(conteudo)
  return {
    largura: caixa.width,
    topo: -caixa.actualBoundingBoxAscent,
    base: caixa.actualBoundingBoxDescent,
  }
}

/** Arquivo do próprio site como data URI, para o SVG não depender da rede. */
async function embutir(caminho: string) {
  const resposta = await fetch(caminho)
  if (!resposta.ok) throw new Error(`${caminho} respondeu ${resposta.status}`)
  const arquivo = await resposta.blob()
  return await new Promise<string>((entregar, falhar) => {
    const leitor = new FileReader()
    leitor.onload = () => entregar(leitor.result as string)
    leitor.onerror = () => falhar(leitor.error ?? new Error(`não deu para ler ${caminho}`))
    leitor.readAsDataURL(arquivo)
  })
}

/** O SVG desenhado, rasterizado no tamanho cheio do enquadramento. */
async function rasterizar(svg: string, largura: number, altura: number) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const imagem = new Image()
    await new Promise((pronta, falhou) => {
      imagem.onload = pronta
      imagem.onerror = () => falhou(new Error('o navegador não desenhou o Cartão'))
      imagem.src = url
    })
    const tela = document.createElement('canvas')
    tela.width = largura
    tela.height = altura
    tela.getContext('2d')!.drawImage(imagem, 0, 0, largura, altura)
    return await new Promise<Blob>((pronto, falhou) => {
      tela.toBlob(
        (arquivo) => (arquivo ? pronto(arquivo) : falhou(new Error('o Canvas não virou PNG'))),
        'image/png',
      )
    })
  }
  finally {
    URL.revokeObjectURL(url)
  }
}

/** O Cartão pronto como PNG, para salvar ou compartilhar. */
export async function gerarCartao(
  pedido: PedidoDeCartao,
  enquadramento: Enquadramento = 'stories',
): Promise<Blob> {
  const { renderSVG } = await import('uqr')
  const [fontesEmbutidas, imagem] = await Promise.all([
    carregarFontes(),
    pedido.imagem ? embutir(pedido.imagem) : undefined,
  ])

  const dados: DadosDoCartao = {
    nome: pedido.nome,
    cidade: pedido.cidade,
    estado: pedido.estado,
    endereco: pedido.endereco,
    verificado: pedido.verificado,
    imagem,
    // Sem borda: o respiro do código é o do prato branco que o desenho põe.
    qr: pedido.brCode ? renderSVG(pedido.brCode, { border: 0, pixelSize: 8, ecc: 'M' }) : undefined,
    fontesEmbutidas,
  }

  const { largura, altura } = ENQUADRAMENTOS[enquadramento]
  return await rasterizar(desenharCartao(dados, enquadramento, medirComCanvas), largura, altura)
}
