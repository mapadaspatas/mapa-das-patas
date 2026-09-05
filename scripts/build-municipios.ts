/**
 * Gera a lista de municípios por UF a partir da API de localidades do IBGE.
 *
 * O cadastro precisa da lista para oferecer as cidades da UF escolhida, e o
 * schema precisa dela para recusar o que não é município. Buscar em runtime
 * funcionaria (a API responde com CORS liberado e cache de 30 dias), mas
 * amarraria o formulário e a Function de Cadastro a um serviço externo no
 * momento do envio; aqui vale o mesmo do `build-uf-map.ts`, que é a fonte
 * oficial entrar uma vez, no build, e o resultado ficar versionado.
 *
 * Fonte: IBGE, divisão territorial (dado público do governo brasileiro). Rodar
 * de novo só quando o IBGE mudar a divisão — criação e fusão de município são
 * raras e dependem de lei.
 *
 *   node scripts/build-municipios.ts
 */
import { writeFileSync } from 'node:fs'

const URL_IBGE = 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios'

/**
 * O que este script usa da resposta. A API devolve muito mais por município
 * (microrregião, mesorregião, região imediata e intermediária); nada disso
 * entra no arquivo gerado, porque a UF já é a única chave de agrupamento e o
 * resto multiplicaria o tamanho por trinta.
 */
interface MunicipioIbge {
  nome: string
  microrregiao?: { mesorregiao?: { UF?: { sigla?: string } } }
  'regiao-imediata'?: { 'regiao-intermediaria'?: { UF?: { sigla?: string } } }
}

const resposta = await fetch(URL_IBGE)
if (!resposta.ok) {
  console.error(`IBGE respondeu ${resposta.status} ${resposta.statusText}`)
  process.exit(1)
}

const municipios = (await resposta.json()) as MunicipioIbge[]

const porUf: Record<string, string[]> = {}
for (const municipio of municipios) {
  /*
   * A sigla da UF vem aninhada por dois caminhos diferentes na mesma resposta.
   * O segundo é a saída dos poucos municípios que a API devolve sem a árvore
   * de microrregião; sem ele, eles sumiriam da lista sem nenhum erro.
   */
  const uf = municipio.microrregiao?.mesorregiao?.UF?.sigla
    ?? municipio['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla
  if (!uf) {
    console.error(`município sem UF na resposta do IBGE: ${municipio.nome}`)
    process.exit(1)
  }
  ;(porUf[uf] ??= []).push(municipio.nome)
}

/*
 * A ordem da API não é alfabética e nem é prometida. Ordenar aqui, com as
 * regras do pt-BR, é o que faz "Água Boa" ficar no A e não depois de "Zortéa"
 * na lista que aparece para quem cadastra.
 */
const saida = Object.fromEntries(
  Object.entries(porUf)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([uf, nomes]) => [uf, nomes.sort((a, b) => a.localeCompare(b, 'pt-BR'))]),
)

const total = Object.values(saida).reduce((soma, nomes) => soma + nomes.length, 0)

const conteudo = `/**
 * Municípios de cada UF, em ordem alfabética (pt-BR).
 * Gerado por \`scripts/build-municipios.ts\` a partir da API de localidades do
 * IBGE. Não editar à mão.
 */
export const municipiosPorUf = ${JSON.stringify(saida, null, 2)} as const satisfies Record<string, readonly string[]>
`

writeFileSync('shared/municipios.ts', conteudo)

console.log(`ufs:        ${Object.keys(saida).length}`)
console.log(`municípios: ${total}`)
console.log(`arquivo:    shared/municipios.ts, ${(conteudo.length / 1024).toFixed(0)} KB`)
