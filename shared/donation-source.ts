/**
 * Fonte em forma canônica, num lugar só. Fonte é o link oficial da Iniciativa
 * onde a Chave de Doação aparece: o campo `fonte` de `doacoes`, e o único lugar
 * do schema onde ele existe — daí o nome do arquivo. O formulário de Cadastro
 * limpa com isto o que a pessoa colou, e o núcleo do Cadastro repete a limpeza
 * antes de escrever o YAML.
 *
 * Quem preenche cola o link do app, e o app cola junto o rastreio do
 * compartilhamento (`?stkn=…` e `?igsh=…` no Instagram, `?mibextid=…` e
 * `?fbclid=…` no Facebook, `?si=…` no YouTube). A Fonte vai versionada num
 * repositório público e fica no histórico: o que identifica a Iniciativa é o
 * endereço, e o rastreio de quem compartilhou não é dado dela.
 *
 * A lista é de parâmetros de rastreio, e não "toda query": Fonte legítima
 * depende de parâmetro para existir (`facebook.com/permalink.php?story_fbid=…`,
 * `youtube.com/watch?v=…`), e o corte largo apagaria o link em vez de limpá-lo.
 * O fragmento também fica: é âncora de post em site próprio.
 *
 * A autoridade sobre o que é Fonte válida continua sendo o schema
 * (shared/schema/initiative.ts): aqui nada é recusado, só limpo.
 */

/** Rastreio de compartilhamento das redes que o schema aceita em `redes`. */
const trackingParams = new Set([
  'igsh', // Instagram, link do app
  'igshid', // Instagram, formato antigo
  'stkn', // Instagram, link de perfil compartilhado
  'mibextid', // Facebook, link do app
  'rdid', // Facebook, redirecionamento do app
  'fbclid', // Facebook, clique
  'si', // YouTube, link de compartilhamento
])

/** Campanha de origem (`utm_source`, `utm_medium`, …), de qualquer host. */
const trackingPrefix = 'utm_'

export function canonicalSource(value: string): string {
  const trimmed = value.trim()

  let url: URL
  try {
    url = new URL(trimmed)
  }
  catch {
    /*
     * Não é endereço: devolvemos como veio para o schema recusar com a
     * mensagem dele. Inventar um protocolo aqui transformaria um erro de
     * digitação em link publicado que ninguém conferiu.
     */
    return trimmed
  }

  // Os nomes são colhidos antes de apagar: remover parâmetro no meio da
  // própria varredura pularia o seguinte.
  const names: string[] = []
  url.searchParams.forEach((_value, name) => names.push(name))

  let removed = false
  for (const name of names) {
    if (trackingParams.has(name) || name.startsWith(trackingPrefix)) {
      url.searchParams.delete(name)
      removed = true
    }
  }

  /*
   * Sem rastreio, o valor volta como veio: `url.href` reescreveria o endereço
   * inteiro (barra final, host em minúsculas, acento em percent-encoding) e
   * uma Fonte já publicada deixaria de ser igual a si mesma. A correção conta
   * com essa igualdade para saber que a Fonte não foi mexida — quando ela
   * muda junto com a chave, a Fonte antiga é apagada de propósito.
   */
  return removed ? url.href : trimmed
}
