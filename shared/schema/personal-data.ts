/**
 * Política de dados pessoais: a única chave PIX publicada é o CNPJ, dado
 * empresarial público. Chave de pessoa — CPF, e-mail, telefone ou chave
 * aleatória — nunca é republicada: a doação entra como pix-na-fonte e o site
 * aponta para o canal oficial onde ela está.
 *
 * Mora fora de `initiative.ts` por causa do peso: aquele arquivo carrega o zod
 * e a lista de municípios do IBGE, e quem usa isto fora da validação (o
 * formulário, as strings de interface) não precisa de nenhum dos dois. O schema
 * reexporta tudo daqui, então quem já importa dele não muda nada.
 *
 * Sem imports, de propósito: é isto que mantém o arquivo leve.
 */

const looksLikeCpf = (value: string) =>
  /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value) || /^\d{11}$/.test(value)

const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

/**
 * Telefone com ou sem DDI, formatado ou cru. O teto de 13 dígitos é o que
 * separa telefone de CNPJ cru (14): sem ele, um CNPJ válido cairia aqui.
 */
const looksLikePhone = (value: string) => {
  const digits = value.replace(/\D/g, '')
  return /^[\d\s()+-]+$/.test(value.trim()) && digits.length >= 10 && digits.length <= 13
}

/**
 * Chave de doação que identifica uma pessoa física. Olha o campo inteiro, então
 * serve ao campo de chave: o formulário usa isto para oferecer `pix-na-fonte` na
 * hora da digitação, em vez de deixar a pessoa descobrir a recusa só no envio.
 * A autoridade continua sendo o schema.
 */
export const looksLikePersonalPixKey = (value: string) =>
  looksLikeCpf(value) || looksLikeEmail(value) || looksLikePhone(value)

/**
 * Nenhum dígito imediatamente antes nem depois do trecho. É esta fronteira que
 * deixa o CNPJ passar: os 14 dígitos de um CNPJ cru contêm sequências de 10 a 13
 * dígitos, que sem ela seriam lidas como telefone.
 */
const betweenDigitEdges = (pattern: string) => `(?<!\\d)(?:${pattern})(?!\\d)`

/*
 * Cada padrão é fechado nas duas pontas, para que número comum em descrição
 * ("150 gatos", "desde 2019", "R$ 1.200,00", CEP) não dispare. Os separadores
 * de telefone são espaço, hífen e parênteses, nunca ponto: é o ponto que
 * distingue um CNPJ pontuado (31.696.864/0001-13) de um telefone.
 */
const personalDataPatterns = [
  // CPF pontuado
  betweenDigitEdges('\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}'),
  // Sequência crua de 10 a 13 dígitos: CPF sem pontuação e telefone com ou sem DDI
  betweenDigitEdges('\\d{10,13}'),
  // Telefone escrito com separador, com DDD obrigatório e DDI opcional
  betweenDigitEdges('(?:\\+?55[\\s-]?)?(?:\\(\\d{2}\\)\\s?|\\d{2}[\\s-])\\d{4,5}[\\s-]?\\d{4}'),
  // E-mail
  '[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)*\\.[A-Za-z]{2,}',
  // Chave aleatória (formato UUID)
  '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}',
]

const personalDataInText = new RegExp(personalDataPatterns.join('|'))

/**
 * O texto contém, em qualquer trecho, algo com formato de chave de pessoa.
 * Diferente de `looksLikePersonalPixKey`, que julga o campo inteiro: aqui o
 * campo é texto livre (nome, descrição) e a chave chega no meio de uma frase.
 */
export const containsPersonalPixKey = (text: string) => personalDataInText.test(text)

/**
 * A recusa dita ao Contribuidor: o que reconhecemos, por que não publicamos e
 * para onde a informação vai. Uma mensagem só, usada pelo schema (formulário,
 * Function de Cadastro e validação de CI) e pelo aviso que aparece enquanto se
 * digita.
 */
export const personalKeyInTextMessage =
  'Encontramos o que parece ser um CPF, e-mail, telefone ou chave PIX. '
  + 'Chave de pessoa não é publicada aqui: informe o link do post onde ela aparece, '
  + 'no campo de doação.'

/**
 * A mesma recusa no campo de chave. Diz o que acontece com a doação, e não que
 * controle usar: o mesmo texto sai no formulário, na resposta da Function e na
 * validação de CI, e quem abre PR direto no YAML não tem tela nenhuma na frente.
 */
export const personalKeyInKeyFieldMessage =
  'Chave de pessoa não é publicada aqui: só publicamos chave de CNPJ. '
  + 'A doação entra sem a chave, apontando para o link do post onde ela aparece.'
