import { describe, it, expect } from 'vitest'
import { getErrorMessage } from './errorUtils'

describe('getErrorMessage', () => {
  it('extrai mensagem de Error', () => {
    expect(getErrorMessage(new Error('erro teste'))).toBe('erro teste')
  })

  it('retorna string diretamente', () => {
    expect(getErrorMessage('falha')).toBe('falha')
  })

  it('extrai message de objeto', () => {
    expect(getErrorMessage({ message: 'objeto com mensagem' })).toBe('objeto com mensagem')
  })

  it('retorna fallback para tipo desconhecido', () => {
    expect(getErrorMessage(42)).toBe('Erro inesperado')
  })

  it('retorna fallback customizado', () => {
    expect(getErrorMessage(null, 'Fallback custom')).toBe('Fallback custom')
  })
})
