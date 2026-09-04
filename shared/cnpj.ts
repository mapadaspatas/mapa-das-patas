/**
 * CNPJ numérico e alfanumérico, num lugar só: o schema valida com isto, o BR
 * Code do PIX normaliza com isto e a máscara do formulário formata com isto.
 *
 * Desde a IN RFB nº 2.229/2024 o CNPJ tem 14 posições, das quais as 12
 * primeiras (raiz e ordem) podem ser letra maiúscula ou dígito, e as 2 últimas
 * são o dígito verificador, sempre numérico. Os CNPJs só de dígitos continuam
 * válidos: o formato novo é superconjunto do antigo, não substituto.
 */

const CNPJ_LENGTH = 14

/**
 * O CNPJ sem os separadores da máscara: o que entra no BR Code e o que o
 * formulário usa para decidir se o valor digitado ainda pode virar um CNPJ.
 * Letra minúscula sobe para maiúscula, porque o formato só admite maiúscula.
 */
const alphanumerics = (value: string) => value.toUpperCase().replace(/[^0-9A-Z]/g, '')

export const cnpjChars = (value: string) => alphanumerics(value).slice(0, CNPJ_LENGTH)

/** Formatado (`AB.CDE.FGH/IJKL-99`) ou cru (14 posições), com DV numérico. */
const cnpjPattern
  = /^(?:[0-9A-Z]{2}\.[0-9A-Z]{3}\.[0-9A-Z]{3}\/[0-9A-Z]{4}-\d{2}|[0-9A-Z]{12}\d{2})$/

export const isCnpj = (value: string) => cnpjPattern.test(value)

/**
 * Máscara progressiva `AB.CDE.FGH/IJKL-99`, aplicada a cada tecla. Formatar
 * enquanto se digita não é só conforto: sem separador, um CNPJ em construção
 * passa por estados de 10 a 13 dígitos que também são telefone válido, e o
 * aviso de chave pessoal acusava um CNPJ legítimo no meio da digitação.
 */
export function formatCnpj(value: string): string {
  const chars = cnpjChars(value)
  const groups = [
    chars.slice(0, 2),
    chars.slice(2, 5),
    chars.slice(5, 8),
    chars.slice(8, 12),
    chars.slice(12, 14),
  ]
  const separators = ['', '.', '.', '/', '-']

  return groups.reduce(
    (formatted, group, index) => (group ? formatted + separators[index] + group : formatted),
    '',
  )
}

/**
 * Se vale formatar o que a pessoa acabou de digitar ou colar.
 *
 * Valor com caractere que não cabe num CNPJ (o `@` de um e-mail, o `+` de um
 * telefone) fica como veio, e valor longo demais também: mascarar truncaria em
 * silêncio o dado que o aviso de chave pessoal precisa ver por inteiro.
 */
export const isCnpjMaskable = (value: string) =>
  /^[0-9A-Za-z\s.\-/]*$/.test(value) && alphanumerics(value).length <= CNPJ_LENGTH
