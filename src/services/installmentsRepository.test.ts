/**
 * Testes para installmentsRepository — criação offline de parcelamentos.
 *
 * Verificações:
 * - createInstallmentGroupOfflineFirst (offline) cria grupo local no IndexedDB
 * - createInstallmentGroupOfflineFirst (offline) cria N parcelas locais
 * - Cada parcela tem o installmentGroupId correto (= localId do grupo)
 * - chargeDate de cada parcela respeita a progressão mensal
 * - month/year de cada parcela correspondem ao chargeDate calculado
 * - Parcelas não são adicionadas à sync_queue individualmente
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockPutInstallmentGroup = vi.fn().mockResolvedValue(undefined)
const mockPutTransaction = vi.fn().mockResolvedValue(undefined)
const mockAddQueueItem = vi.fn().mockResolvedValue(undefined)
const mockRemoveQueueItem = vi.fn().mockResolvedValue(undefined)
const mockGetPendingQueue = vi.fn().mockResolvedValue([])
const mockGetInstallmentGroups = vi.fn().mockResolvedValue([])
const mockGetInstallmentGroupByLocalId = vi.fn().mockResolvedValue(null)
const mockGetInstallmentGroupByServerId = vi.fn().mockResolvedValue(null)
const mockSoftDeleteInstallmentGroup = vi.fn().mockResolvedValue(undefined)
const mockDeleteLocalRecord = vi.fn().mockResolvedValue(undefined)
const mockGetTransactionsByInstallmentGroupId = vi.fn().mockResolvedValue([])

vi.mock('../offline/offlineDb', () => ({
  putInstallmentGroup: mockPutInstallmentGroup,
  putTransaction: mockPutTransaction,
  addQueueItem: mockAddQueueItem,
  removeQueueItem: mockRemoveQueueItem,
  getPendingQueue: mockGetPendingQueue,
  getInstallmentGroups: mockGetInstallmentGroups,
  getInstallmentGroupByLocalId: mockGetInstallmentGroupByLocalId,
  getInstallmentGroupByServerId: mockGetInstallmentGroupByServerId,
  softDeleteInstallmentGroup: mockSoftDeleteInstallmentGroup,
  deleteLocalRecord: mockDeleteLocalRecord,
  getTransactionsByInstallmentGroupId: mockGetTransactionsByInstallmentGroupId,
}))

const mockFsCreate = vi.fn().mockResolvedValue('server-id-123')
const mockFsGetGroups = vi.fn().mockResolvedValue([])
const mockFsDelete = vi.fn().mockResolvedValue(undefined)
const mockFsGetTransactions = vi.fn().mockResolvedValue([])

vi.mock('./firestore', () => ({
  createInstallmentGroup: mockFsCreate,
  getInstallmentGroups: mockFsGetGroups,
  deleteInstallmentGroup: mockFsDelete,
  getInstallmentTransactions: mockFsGetTransactions,
}))

// ── Setup ──────────────────────────────────────────────────────────────────────

// Simula modo offline por padrão
let onlineValue = false
Object.defineProperty(navigator, 'onLine', {
  get: () => onlineValue,
  configurable: true,
})

// ── Importação tardia (após mocks) ────────────────────────────────────────────

let createInstallmentGroupOfflineFirst: typeof import('./installmentsRepository').createInstallmentGroupOfflineFirst

beforeEach(async () => {
  vi.clearAllMocks()
  onlineValue = false
  const mod = await import('./installmentsRepository')
  createInstallmentGroupOfflineFirst = mod.createInstallmentGroupOfflineFirst
})

afterEach(() => {
  vi.resetModules()
})

// ── Dados de teste ────────────────────────────────────────────────────────────

const basePayload = {
  description: 'Notebook',
  categoryId: 'cat-123',
  categoryName: 'Eletrônicos',
  totalValue: 3000,
  installmentValue: 1000,
  totalInstallments: 3,
  firstInstallmentDate: '2025-08-10',
  transactionNature: 'expense' as const,
}

// ── Testes ─────────────────────────────────────────────────────────────────────

describe('createInstallmentGroupOfflineFirst — modo offline', () => {
  it('cria exatamente um grupo local no IndexedDB', async () => {
    await createInstallmentGroupOfflineFirst('uid-1', basePayload)
    expect(mockPutInstallmentGroup).toHaveBeenCalledTimes(1)
  })

  it('cria N parcelas locais no IndexedDB (uma por installment)', async () => {
    await createInstallmentGroupOfflineFirst('uid-1', basePayload)
    expect(mockPutTransaction).toHaveBeenCalledTimes(basePayload.totalInstallments)
  })

  it('cada parcela tem installmentGroupId igual ao localId do grupo', async () => {
    await createInstallmentGroupOfflineFirst('uid-1', basePayload)
    const groupCall = mockPutInstallmentGroup.mock.calls[0][0]
    const groupLocalId: string = groupCall.localId

    const txCalls = mockPutTransaction.mock.calls.map((c) => c[0])
    for (const tx of txCalls) {
      expect(tx.installmentGroupId).toBe(groupLocalId)
    }
  })

  it('localId de cada parcela segue o padrão ${groupLocalId}_inst_N', async () => {
    await createInstallmentGroupOfflineFirst('uid-1', basePayload)
    const groupLocalId: string = mockPutInstallmentGroup.mock.calls[0][0].localId
    const txCalls = mockPutTransaction.mock.calls.map((c) => c[0])

    txCalls.forEach((tx, i) => {
      expect(tx.localId).toBe(`${groupLocalId}_inst_${i + 1}`)
    })
  })

  it('installmentNumber de cada parcela está correto (1 a N)', async () => {
    await createInstallmentGroupOfflineFirst('uid-1', basePayload)
    const txCalls = mockPutTransaction.mock.calls.map((c) => c[0])
    txCalls.forEach((tx, i) => {
      expect(tx.installmentNumber).toBe(i + 1)
    })
  })

  it('a primeira parcela tem chargeDate igual a firstInstallmentDate', async () => {
    await createInstallmentGroupOfflineFirst('uid-1', basePayload)
    const firstTx = mockPutTransaction.mock.calls[0][0]
    expect(firstTx.chargeDate).toBe('2025-08-10')
  })

  it('chargeDate das parcelas avança um mês por parcela', async () => {
    await createInstallmentGroupOfflineFirst('uid-1', basePayload)
    const txCalls = mockPutTransaction.mock.calls.map((c) => c[0])
    expect(txCalls[0].chargeDate).toBe('2025-08-10')
    expect(txCalls[1].chargeDate).toBe('2025-09-10')
    expect(txCalls[2].chargeDate).toBe('2025-10-10')
  })

  it('month e year de cada parcela correspondem ao chargeDate', async () => {
    await createInstallmentGroupOfflineFirst('uid-1', basePayload)
    const txCalls = mockPutTransaction.mock.calls.map((c) => c[0])
    expect(txCalls[0].month).toBe(8)
    expect(txCalls[0].year).toBe(2025)
    expect(txCalls[1].month).toBe(9)
    expect(txCalls[1].year).toBe(2025)
    expect(txCalls[2].month).toBe(10)
    expect(txCalls[2].year).toBe(2025)
  })

  it('parcelas têm syncStatus "pending" e type "installment"', async () => {
    await createInstallmentGroupOfflineFirst('uid-1', basePayload)
    const txCalls = mockPutTransaction.mock.calls.map((c) => c[0])
    for (const tx of txCalls) {
      expect(tx.syncStatus).toBe('pending')
      expect(tx.type).toBe('installment')
    }
  })

  it('parcelas NÃO são adicionadas à sync_queue individualmente', async () => {
    await createInstallmentGroupOfflineFirst('uid-1', basePayload)
    // addQueueItem deve ser chamado apenas 1 vez (para o grupo)
    expect(mockAddQueueItem).toHaveBeenCalledTimes(1)
    const queuedItem = mockAddQueueItem.mock.calls[0][0]
    expect(queuedItem.collection).toBe('installmentGroups')
  })

  it('lastInstallmentDate do grupo é calculado corretamente', async () => {
    await createInstallmentGroupOfflineFirst('uid-1', basePayload)
    const group = mockPutInstallmentGroup.mock.calls[0][0]
    // 3 parcelas a partir de 2025-08-10 → última em 2025-10-10
    expect(group.lastInstallmentDate).toBe('2025-10-10')
  })

  it('grupo tem pendingInstallments = totalInstallments e paidInstallments = 0', async () => {
    await createInstallmentGroupOfflineFirst('uid-1', basePayload)
    const group = mockPutInstallmentGroup.mock.calls[0][0]
    expect(group.paidInstallments).toBe(0)
    expect(group.pendingInstallments).toBe(basePayload.totalInstallments)
  })
})

describe('createInstallmentGroupOfflineFirst — modo online', () => {
  beforeEach(() => {
    onlineValue = true
  })

  it('chama fsCreate e NÃO chama putTransaction quando online', async () => {
    await createInstallmentGroupOfflineFirst('uid-1', basePayload)
    expect(mockFsCreate).toHaveBeenCalledTimes(1)
    expect(mockPutTransaction).not.toHaveBeenCalled()
    expect(mockAddQueueItem).not.toHaveBeenCalled()
  })

  it('retorna o serverId do Firestore quando online', async () => {
    const id = await createInstallmentGroupOfflineFirst('uid-1', basePayload)
    expect(id).toBe('server-id-123')
  })
})

describe('deleteInstallmentGroupOfflineFirst — grupo não-sincronizado (offline)', () => {
  let deleteInstallmentGroupOfflineFirst: typeof import('./installmentsRepository').deleteInstallmentGroupOfflineFirst

  const fakeLocalId = 'local_ig_test_abc'
  const fakeLocalGroup = {
    localId: fakeLocalId,
    serverId: undefined,
    uid: 'uid-1',
    syncStatus: 'pending',
    deleted: false,
    description: 'Notebook',
    categoryId: 'cat-123',
    categoryName: 'Eletrônicos',
    totalValue: 3000,
    installmentValue: 1000,
    totalInstallments: 3,
    firstInstallmentDate: '2025-08-10',
    lastInstallmentDate: '2025-10-10',
    paidInstallments: 0,
    pendingInstallments: 3,
    paidValue: 0,
    remainingValue: 3000,
    status: 'ongoing',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastModifiedAt: new Date().toISOString(),
  }

  const fakePendingCreate = {
    id: 'queue-item-1',
    uid: 'uid-1',
    collection: 'installmentGroups',
    action: 'create',
    localId: fakeLocalId,
    payload: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attempts: 0,
    status: 'pending',
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    onlineValue = false
    // Grupo existe por localId, não por serverId
    mockGetInstallmentGroupByServerId.mockResolvedValue(null)
    mockGetInstallmentGroupByLocalId.mockResolvedValue(fakeLocalGroup)
    // Fila tem o create pendente
    mockGetPendingQueue.mockResolvedValue([fakePendingCreate])
    const mod = await import('./installmentsRepository')
    deleteInstallmentGroupOfflineFirst = mod.deleteInstallmentGroupOfflineFirst
  })

  it('deleta N parcelas temporárias do transactions_cache', async () => {
    await deleteInstallmentGroupOfflineFirst('uid-1', fakeLocalId)
    const deletedKeys = mockDeleteLocalRecord.mock.calls
      .filter((c) => c[0] === 'transactions_cache')
      .map((c) => c[1])
    expect(deletedKeys).toContain(`${fakeLocalId}_inst_1`)
    expect(deletedKeys).toContain(`${fakeLocalId}_inst_2`)
    expect(deletedKeys).toContain(`${fakeLocalId}_inst_3`)
  })

  it('cancela o create pendente na sync_queue', async () => {
    await deleteInstallmentGroupOfflineFirst('uid-1', fakeLocalId)
    expect(mockRemoveQueueItem).toHaveBeenCalledWith('queue-item-1')
  })

  it('deleta o registro local do grupo do installment_groups_cache', async () => {
    await deleteInstallmentGroupOfflineFirst('uid-1', fakeLocalId)
    const groupDeleted = mockDeleteLocalRecord.mock.calls.some(
      (c) => c[0] === 'installment_groups_cache' && c[1] === fakeLocalId,
    )
    expect(groupDeleted).toBe(true)
  })

  it('NÃO adiciona novo item de delete na sync_queue', async () => {
    await deleteInstallmentGroupOfflineFirst('uid-1', fakeLocalId)
    expect(mockAddQueueItem).not.toHaveBeenCalled()
  })

  it('NÃO chama softDeleteInstallmentGroup para grupo não-sincronizado', async () => {
    await deleteInstallmentGroupOfflineFirst('uid-1', fakeLocalId)
    expect(mockSoftDeleteInstallmentGroup).not.toHaveBeenCalled()
  })
})
