/**
 * Testes para a lógica de remapeamento de IDs na importação de backup.
 *
 * A lógica de remapeamento no MyDataPage segue o padrão:
 *   catIdMap.get(categoryId) ?? categoryId
 *   faIdMap.get(fixedAccountId) ?? fixedAccountId
 *   igIdMap.get(installmentGroupId) ?? installmentGroupId
 *
 * Estes testes verificam que a lógica cobre todos os cenários esperados.
 */

import { describe, it, expect } from 'vitest'

// ── Utilitário de remapeamento (inline — espelha exatamente o que MyDataPage faz) ──

function remapTransactionIds(
  tx: {
    categoryId: string
    fixedAccountId?: string
    installmentGroupId?: string
  },
  catIdMap: Map<string, string>,
  faIdMap: Map<string, string>,
  igIdMap: Map<string, string>,
) {
  // Espelha exatamente o destructuring do MyDataPage.tsx handleImport
  const { categoryId, fixedAccountId, installmentGroupId, ...rest } = tx
  return {
    ...rest,
    categoryId: catIdMap.get(categoryId) ?? categoryId,
    ...(fixedAccountId ? { fixedAccountId: faIdMap.get(fixedAccountId) ?? fixedAccountId } : {}),
    ...(installmentGroupId
      ? { installmentGroupId: igIdMap.get(installmentGroupId) ?? installmentGroupId }
      : {}),
  }
}

// ── Testes ─────────────────────────────────────────────────────────────────────

describe('remapeamento de IDs na importação de backup', () => {
  it('remapeia categoryId quando o mapa contém o ID antigo', () => {
    const catIdMap = new Map([['old-cat-1', 'new-cat-1']])
    const result = remapTransactionIds(
      { categoryId: 'old-cat-1' },
      catIdMap,
      new Map(),
      new Map(),
    )
    expect(result.categoryId).toBe('new-cat-1')
  })

  it('mantém categoryId original quando não há mapeamento', () => {
    const catIdMap = new Map([['other-cat', 'new-other']])
    const result = remapTransactionIds(
      { categoryId: 'unchanged-cat' },
      catIdMap,
      new Map(),
      new Map(),
    )
    expect(result.categoryId).toBe('unchanged-cat')
  })

  it('remapeia fixedAccountId corretamente', () => {
    const faIdMap = new Map([['old-fa-1', 'new-fa-1']])
    const result = remapTransactionIds(
      { categoryId: 'cat-x', fixedAccountId: 'old-fa-1' },
      new Map(),
      faIdMap,
      new Map(),
    )
    expect(result.fixedAccountId).toBe('new-fa-1')
  })

  it('não inclui fixedAccountId no resultado se ele era undefined', () => {
    const result = remapTransactionIds(
      { categoryId: 'cat-x', fixedAccountId: undefined },
      new Map(),
      new Map(),
      new Map(),
    )
    expect('fixedAccountId' in result).toBe(false)
  })

  it('remapeia installmentGroupId corretamente', () => {
    const igIdMap = new Map([['old-ig-1', 'new-ig-1']])
    const result = remapTransactionIds(
      { categoryId: 'cat-x', installmentGroupId: 'old-ig-1' },
      new Map(),
      new Map(),
      igIdMap,
    )
    expect(result.installmentGroupId).toBe('new-ig-1')
  })

  it('parcela não fica órfã: installmentGroupId é remapeado para novo grupo', () => {
    const igIdMap = new Map([['backup-group-id', 'firestore-group-id']])
    const parcela = {
      categoryId: 'cat-1',
      installmentGroupId: 'backup-group-id',
    }
    const result = remapTransactionIds(parcela, new Map(), new Map(), igIdMap)
    expect(result.installmentGroupId).toBe('firestore-group-id')
  })

  it('múltiplos remapeamentos simultâneos funcionam corretamente', () => {
    const catIdMap = new Map([['old-cat', 'new-cat']])
    const faIdMap = new Map([['old-fa', 'new-fa']])
    const igIdMap = new Map([['old-ig', 'new-ig']])
    const result = remapTransactionIds(
      { categoryId: 'old-cat', fixedAccountId: 'old-fa', installmentGroupId: 'old-ig' },
      catIdMap,
      faIdMap,
      igIdMap,
    )
    expect(result.categoryId).toBe('new-cat')
    expect(result.fixedAccountId).toBe('new-fa')
    expect(result.installmentGroupId).toBe('new-ig')
  })

  it('quando ID já existe no destino (mesmo ID), o mapa aponta para si mesmo', () => {
    // Quando existingIds.has(id) → catIdMap.set(id, id) — sem mudança
    const catIdMap = new Map([['existing-cat', 'existing-cat']])
    const result = remapTransactionIds(
      { categoryId: 'existing-cat' },
      catIdMap,
      new Map(),
      new Map(),
    )
    expect(result.categoryId).toBe('existing-cat')
  })
})
