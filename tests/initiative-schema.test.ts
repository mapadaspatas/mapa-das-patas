import { describe, expect, it } from 'vitest'
import { initiativeSchema } from '../shared/schema/initiative'

const validInitiative = {
  nome: 'Gatil Hope',
  tipo: 'projeto-informal',
  estado: 'PA',
  cidade: 'Marituba',
  descricao: 'Resgate e cuidado de gatos em situação de rua na região de Marituba.',
}

describe('schema da Iniciativa', () => {
  it('aceita uma Iniciativa com os campos essenciais', () => {
    const result = initiativeSchema.safeParse(validInitiative)
    expect(result.success).toBe(true)
  })

  it('rejeita Iniciativa sem nome', () => {
    const { nome, ...withoutName } = validInitiative
    const result = initiativeSchema.safeParse(withoutName)
    expect(result.success).toBe(false)
  })

  it('rejeita Iniciativa sem estado', () => {
    const { estado, ...withoutState } = validInitiative
    const result = initiativeSchema.safeParse(withoutState)
    expect(result.success).toBe(false)
  })

  it('rejeita Iniciativa sem tipo', () => {
    const { tipo, ...withoutType } = validInitiative
    const result = initiativeSchema.safeParse(withoutType)
    expect(result.success).toBe(false)
  })

  it('rejeita Iniciativa sem cidade', () => {
    const { cidade, ...withoutCity } = validInitiative
    const result = initiativeSchema.safeParse(withoutCity)
    expect(result.success).toBe(false)
  })

  it('rejeita Iniciativa sem descrição', () => {
    const { descricao, ...withoutDescription } = validInitiative
    const result = initiativeSchema.safeParse(withoutDescription)
    expect(result.success).toBe(false)
  })
})

/*
 * Cidade é município do IBGE, e do estado informado. Sem esta regra o mesmo
 * lugar entra escrito de vários jeitos e o filtro da listagem, que monta as
 * opções a partir do que foi publicado, oferece cada grafia como um lugar.
 */
describe('cidade dentro da lista do IBGE', () => {
  const parseCity = (estado: string, cidade: string) =>
    initiativeSchema.safeParse({ ...validInitiative, estado, cidade })

  it('aceita município do estado informado', () => {
    expect(parseCity('SP', 'São Paulo').success).toBe(true)
    expect(parseCity('RJ', 'Rio de Janeiro').success).toBe(true)
    expect(parseCity('DF', 'Brasília').success).toBe(true)
  })

  it('rejeita município de outro estado', () => {
    expect(parseCity('RJ', 'São Paulo').success).toBe(false)
    expect(parseCity('SP', 'Salvador').success).toBe(false)
  })

  it('rejeita bairro e distrito, que não são município', () => {
    expect(parseCity('SP', 'Vila Prudente').success).toBe(false)
    expect(parseCity('RJ', 'Realengo').success).toBe(false)
  })

  it('exige o nome como o IBGE escreve', () => {
    expect(parseCity('SP', 'Sao Paulo').success).toBe(false)
    expect(parseCity('SP', 'são paulo').success).toBe(false)
    expect(parseCity('SP', 'São Paulo ').success).toBe(false)
  })

  it('aponta o erro no campo cidade, e não na raiz', () => {
    const result = parseCity('SP', 'Realengo')
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toContain('cidade')
  })

  it('aceita o mesmo nome de cidade em estados diferentes', () => {
    expect(parseCity('MS', 'Bonito').success).toBe(true)
    expect(parseCity('PE', 'Bonito').success).toBe(true)
  })
})

describe('enums fechados', () => {
  it('aceita todos os tipos de Iniciativa do vocabulário', () => {
    for (const tipo of ['ong', 'associacao', 'protetor-independente', 'projeto-informal', 'abrigo-santuario']) {
      expect(initiativeSchema.safeParse({ ...validInitiative, tipo }).success).toBe(true)
    }
  })

  it('rejeita tipo fora do enum', () => {
    expect(initiativeSchema.safeParse({ ...validInitiative, tipo: 'empresa' }).success).toBe(false)
  })

  it('aceita UF brasileira válida e rejeita inválida', () => {
    // A cidade acompanha a UF: a Iniciativa toda precisa continuar coerente.
    expect(initiativeSchema.safeParse({ ...validInitiative, estado: 'SP', cidade: 'Santos' }).success).toBe(true)
    expect(initiativeSchema.safeParse({ ...validInitiative, estado: 'XX' }).success).toBe(false)
    expect(initiativeSchema.safeParse({ ...validInitiative, estado: 'sp' }).success).toBe(false)
  })

  it('aceita espécies do enum e rejeita fora dele', () => {
    expect(initiativeSchema.safeParse({ ...validInitiative, especies: ['caes', 'gatos'] }).success).toBe(true)
    expect(initiativeSchema.safeParse({ ...validInitiative, especies: ['dragoes'] }).success).toBe(false)
  })

  it('aceita necessidades do enum e rejeita fora dele', () => {
    expect(
      initiativeSchema.safeParse({
        ...validInitiative,
        necessidades: ['racao', 'lar-temporario', 'voluntarios', 'castracao', 'medicamentos'],
      }).success,
    ).toBe(true)
    expect(initiativeSchema.safeParse({ ...validInitiative, necessidades: ['dinheiro'] }).success).toBe(false)
  })

  it('espécies e necessidades são opcionais', () => {
    expect(initiativeSchema.safeParse(validInitiative).success).toBe(true)
  })
})

const source = 'https://instagram.com/p/exemplo'

function withDonations(donations: unknown[]) {
  return initiativeSchema.safeParse({ ...validInitiative, doacoes: donations })
}

describe('Chaves de Doação, regra nº 1: nenhuma chave sem Fonte', () => {
  it('aceita pix-cnpj com CNPJ formatado e Fonte', () => {
    expect(withDonations([{ tipo: 'pix-cnpj', chave: '31.696.864/0001-13', fonte: source }]).success).toBe(true)
  })

  it('aceita pix-cnpj com CNPJ em dígitos crus', () => {
    expect(withDonations([{ tipo: 'pix-cnpj', chave: '31696864000113', fonte: source }]).success).toBe(true)
  })

  it('rejeita pix-cnpj com valor que não é CNPJ', () => {
    expect(withDonations([{ tipo: 'pix-cnpj', chave: 'não é cnpj', fonte: source }]).success).toBe(false)
  })

  it('rejeita qualquer doação sem Fonte', () => {
    expect(withDonations([{ tipo: 'pix-cnpj', chave: '31.696.864/0001-13' }]).success).toBe(false)
  })

  it('rejeita Fonte que não é URL http(s)', () => {
    expect(withDonations([{ tipo: 'pix-cnpj', chave: '31.696.864/0001-13', fonte: 'perfil oficial' }]).success).toBe(false)
  })

  /*
   * Só o CNPJ é publicado como chave. Os tipos que publicavam e-mail e telefone
   * saíram do schema: o discriminador não os conhece mais, então o YAML que os
   * usar é reprovado na CI.
   */
  it('rejeita pix-email e pix-telefone: tipos não existem mais', () => {
    expect(withDonations([{ tipo: 'pix-email', chave: 'doacao@exemplo.org', fonte: source }]).success).toBe(false)
    expect(withDonations([{ tipo: 'pix-telefone', chave: '+5511994773463', fonte: source }]).success).toBe(false)
  })

  it('rejeita chave de pessoa física em pix-cnpj: CPF, e-mail ou telefone', () => {
    expect(withDonations([{ tipo: 'pix-cnpj', chave: '002.980.205-99', fonte: source }]).success).toBe(false)
    expect(withDonations([{ tipo: 'pix-cnpj', chave: '00298020599', fonte: source }]).success).toBe(false)
    expect(withDonations([{ tipo: 'pix-cnpj', chave: 'doacao@exemplo.org', fonte: source }]).success).toBe(false)
    expect(withDonations([{ tipo: 'pix-cnpj', chave: '+5511994773463', fonte: source }]).success).toBe(false)
    expect(withDonations([{ tipo: 'pix-cnpj', chave: '(11) 99477-3463', fonte: source }]).success).toBe(false)
  })

  it('pix-na-fonte exige Fonte e não pode ter chave', () => {
    expect(withDonations([{ tipo: 'pix-na-fonte', fonte: source }]).success).toBe(true)
    expect(withDonations([{ tipo: 'pix-na-fonte', chave: '002.980.205-99', fonte: source }]).success).toBe(false)
    expect(withDonations([{ tipo: 'pix-na-fonte' }]).success).toBe(false)
  })

  it('vaquinha, apoio recorrente e paypal usam url própria + Fonte', () => {
    expect(withDonations([{ tipo: 'vaquinha', url: 'https://apoia.se/exemplo', fonte: source }]).success).toBe(true)
    expect(withDonations([{ tipo: 'apoio-recorrente', url: 'https://apoia.se/exemplo', fonte: source }]).success).toBe(true)
    expect(withDonations([{ tipo: 'paypal', url: 'https://paypal.me/exemplo', fonte: source }]).success).toBe(true)
    expect(withDonations([{ tipo: 'vaquinha', fonte: source }]).success).toBe(false)
  })

  it('rejeita tipo de doação fora do enum', () => {
    expect(withDonations([{ tipo: 'dinheiro-vivo', chave: 'x', fonte: source }]).success).toBe(false)
  })

  it('doações são opcionais', () => {
    expect(initiativeSchema.safeParse(validInitiative).success).toBe(true)
  })
})

function withSocial(social: unknown) {
  return initiativeSchema.safeParse({ ...validInitiative, redes: social })
}

describe('redes sociais', () => {
  it('aceita todas as redes do schema de uma vez', () => {
    expect(
      withSocial({
        instagram: 'gatilhope',
        facebook: 'https://facebook.com/gatilhope',
        tiktok: 'https://tiktok.com/@gatilhope',
        youtube: 'https://youtube.com/@gatilhope',
        x: 'https://x.com/gatilhope',
        whatsapp: '+5591999999999',
        site: 'https://gatilhope.org',
        linktree: 'https://linktr.ee/gatilhope',
      }).success,
    ).toBe(true)
  })

  it('instagram é handle sem @', () => {
    expect(withSocial({ instagram: 'gatil.hope_2' }).success).toBe(true)
    expect(withSocial({ instagram: '@gatilhope' }).success).toBe(false)
    expect(withSocial({ instagram: 'https://instagram.com/gatilhope' }).success).toBe(false)
  })

  it('whatsapp aceita telefone +55 ou link wa.me', () => {
    expect(withSocial({ whatsapp: 'https://wa.me/5591999999999' }).success).toBe(true)
    expect(withSocial({ whatsapp: '91999999999' }).success).toBe(false)
  })

  it('demais redes exigem URL http(s)', () => {
    expect(withSocial({ site: 'gatilhope.org' }).success).toBe(false)
    expect(withSocial({ linktree: 'linktr.ee/gatilhope' }).success).toBe(false)
  })

  it('rejeita rede desconhecida', () => {
    expect(withSocial({ orkut: 'https://orkut.com/gatilhope' }).success).toBe(false)
  })

  it('redes são opcionais', () => {
    expect(initiativeSchema.safeParse(validInitiative).success).toBe(true)
    expect(withSocial({ instagram: 'gatilhope' }).success).toBe(true)
  })
})

describe('Selo Verificado', () => {
  it('aceita verificado: false e ausência do campo', () => {
    expect(initiativeSchema.safeParse({ ...validInitiative, verificado: false }).success).toBe(true)
    expect(initiativeSchema.safeParse(validInitiative).success).toBe(true)
  })

  it('aceita verificação com data e canal', () => {
    expect(
      initiativeSchema.safeParse({
        ...validInitiative,
        verificado: { em: '2026-08-17', canal: 'dm-instagram' },
      }).success,
    ).toBe(true)
  })

  it('rejeita verificação sem canal ou com data inválida', () => {
    expect(initiativeSchema.safeParse({ ...validInitiative, verificado: { em: '2026-08-17' } }).success).toBe(false)
    expect(
      initiativeSchema.safeParse({ ...validInitiative, verificado: { em: 'ontem', canal: 'dm' } }).success,
    ).toBe(false)
    expect(initiativeSchema.safeParse({ ...validInitiative, verificado: 'sim' }).success).toBe(false)
  })
})

/*
 * Chave de pessoa em texto livre. Nome e descrição são publicados como vieram,
 * então a política que barra a chave no campo de chave vale também para o que
 * se escreve neles. O que se testa aqui é o que o Contribuidor observa: o texto
 * passa ou é recusado, e com qual mensagem.
 */
describe('chave de pessoa em nome e descrição', () => {
  const withDescription = (descricao: string) =>
    initiativeSchema.safeParse({ ...validInitiative, descricao })

  const withName = (nome: string) => initiativeSchema.safeParse({ ...validInitiative, nome })

  it.each([
    ['CPF pontuado', 'Ajude o gatil. PIX: 002.980.205-99, obrigado!'],
    ['CPF cru', 'Ajude o gatil. PIX 00298020599'],
    ['e-mail', 'Doações pelo PIX doacao@exemplo.org'],
    ['telefone com DDI', 'PIX +55 11 99477-3463'],
    ['telefone com DDD entre parênteses', 'Fale conosco no (11) 99477-3463'],
    ['telefone cru', 'Chame no zap 11994773463'],
    ['chave aleatória', 'Chave: 123e4567-e89b-12d3-a456-426614174000'],
  ])('rejeita %s na descrição', (_caso, descricao) => {
    expect(withDescription(descricao).success).toBe(false)
  })

  it.each([
    ['CPF pontuado', 'Gatil Hope 002.980.205-99'],
    ['CPF cru', 'Gatil Hope 00298020599'],
    ['e-mail', 'Gatil Hope doacao@exemplo.org'],
    ['telefone com DDI', 'Gatil Hope +55 11 99477-3463'],
    ['telefone com DDD entre parênteses', 'Gatil Hope (11) 99477-3463'],
    ['telefone cru', 'Gatil Hope 11994773463'],
    ['chave aleatória', 'Gatil Hope 123e4567-e89b-12d3-a456-426614174000'],
  ])('rejeita %s no nome', (_caso, nome) => {
    expect(withName(nome).success).toBe(false)
  })

  it('aponta o erro no campo em que a chave foi escrita', () => {
    const naDescricao = withDescription('PIX 002.980.205-99')
    expect(naDescricao.error?.issues.map((issue) => issue.path.join('.'))).toContain('descricao')

    const noNome = withName('Gatil Hope 002.980.205-99')
    expect(noNome.error?.issues.map((issue) => issue.path.join('.'))).toContain('nome')
  })

  it('explica em linguagem simples onde a informação deve ir', () => {
    const result = withDescription('PIX 002.980.205-99')
    expect(result.error?.issues[0]?.message).toBe(
      'Encontramos o que parece ser um CPF, e-mail, telefone ou chave PIX. '
      + 'Chave de pessoa não é publicada aqui: informe o link do post onde ela aparece, '
      + 'no campo de doação.',
    )
  })

  /*
   * CNPJ é dado público da pessoa jurídica e continua passando. O cru é o caso
   * que obriga a fronteira de dígito nas duas pontas do padrão numérico: os 14
   * dígitos dele contêm sequências de 10 a 13 dígitos, que sem a fronteira
   * seriam lidas como telefone.
   */
  it.each([
    ['CNPJ pontuado', 'Somos ONG registrada, CNPJ 31.696.864/0001-13, nota fiscal na hora.'],
    ['CNPJ cru', 'Somos ONG registrada, CNPJ 31696864000113, nota fiscal na hora.'],
    ['CNPJ alfanumérico', 'Somos ONG registrada, CNPJ 12.ABC.345/01DE-35.'],
  ])('aceita %s na descrição', (_caso, descricao) => {
    expect(withDescription(descricao).success).toBe(true)
  })

  it.each([
    ['quantidade', 'Cuidamos de 150 gatos e 40 cães resgatados da rua.'],
    ['ano de fundação', 'Atuamos desde 2019 no resgate de animais abandonados.'],
    ['valor em reais', 'Gastamos R$ 1.200,00 por mês só de ração.'],
    ['CEP', 'Recebemos doações na Rua das Flores, CEP 01310-100.'],
    [
      'descrição longa e legítima',
      'Somos um grupo de protetoras que resgata, castra e cuida de cães e gatos '
      + 'abandonados desde 2019. Hoje mantemos 150 animais em lares temporários, '
      + 'com 40 castrações por mês e gasto mensal de R$ 1.200,00 em ração e remédios. '
      + 'Também fazemos feiras de adoção aos sábados na praça central.',
    ],
  ])('aceita %s na descrição', (_caso, descricao) => {
    expect(withDescription(descricao).success).toBe(true)
  })
})
