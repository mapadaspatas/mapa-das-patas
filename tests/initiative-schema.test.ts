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
  it('aceita todos os tipos de Iniciativa da spec', () => {
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
   * Só o CNPJ é publicado como chave (ver docs/adr/0006). Os tipos que
   * publicavam e-mail e telefone saíram do schema: o discriminador não os
   * conhece mais, então o YAML que os usar é reprovado na CI.
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
  it('aceita todas as redes da spec de uma vez', () => {
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
