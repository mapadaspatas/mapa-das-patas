import { describe, expect, it } from 'vitest'
import { avatarColorOf, initialsOf } from '../app/utils/avatar'

describe('initialsOf', () => {
  it('usa as duas primeiras palavras com identidade', () => {
    expect(initialsOf('Gatil Miau Feliz')).toBe('GM')
    expect(initialsOf('Recanto dos Felinos')).toBe('RF')
    expect(initialsOf('Amigos de Patas')).toBe('AP')
  })

  it('nome de uma palavra vira uma inicial', () => {
    expect(initialsOf('Adocat')).toBe('A')
  })

  it('ignora pontuação e emoji na borda das palavras', () => {
    expect(initialsOf('4 Patas 🐾')).toBe('4P')
    expect(initialsOf('ONG Abraça Vidas')).toBe('OA')
  })

  it('nome só de palavras vazias ainda produz algo renderizável', () => {
    expect(initialsOf('de')).toBe('D')
    expect(initialsOf('   ')).toBe('?')
  })
})

describe('avatarColorOf', () => {
  it('é determinístico: mesmo nome, mesma cor em todo build', () => {
    expect(avatarColorOf('Gatil Hope')).toBe(avatarColorOf('Gatil Hope'))
  })
})
