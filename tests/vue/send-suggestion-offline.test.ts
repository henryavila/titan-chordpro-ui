import { describe, expect, it, vi } from 'vitest'
import { memoryStore, OFFLINE_SUGGEST_TOAST } from '../../src/core'
import type { Overlay } from '../../src/core/overlay'
import { sendSuggestion, type SuggestHost } from '../../src/vue/use/overlay/queue'

const ov: Overlay = {
  baseVersion: 'v1',
  at: 1,
  ops: [
    {
      id: 'o1',
      type: 'replace',
      at: 0,
      anchor: '',
      anchorHash: '',
      before: ['a'],
      after: ['b'],
      ctx: { transpose: 0, capo: 0 },
    },
  ],
}

function host(over: Partial<SuggestHost> = {}): SuggestHost & { toasts: string[] } {
  const toasts: string[] = []
  const base: SuggestHost = {
    sending: () => false,
    setSending: () => {},
    overlay: () => ov,
    actorName: () => 'Ana',
    setNameNeeded: () => {},
    confirming: () => true,
    setConfirming: () => {},
    armConfirm: () => {},
    disarmConfirm: () => {},
    songId: () => 's1',
    title: () => 'Canção',
    version: () => 'v1',
    actorKey: () => 'ana',
    store: memoryStore(),
    loadScoreAsset: () => undefined,
    persist: () => undefined,
    all: () => [],
    write: () => {},
    closePanel: () => {},
    toast: (msg) => {
      toasts.push(msg)
    },
  }
  return Object.assign(base, over, { toasts })
}

describe('sendSuggestion when the device is offline', () => {
  it('keeps Minha versão and does not POST when persist needs the network', async () => {
    const persist = vi.fn(() => Promise.resolve())
    const write = vi.fn()
    const h = host({
      persist: () => persist,
      write,
      online: () => false,
    })
    await sendSuggestion(h)
    expect(persist).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
    expect(h.toasts).toEqual([OFFLINE_SUGGEST_TOAST])
  })

  it('still queues locally when there is no persistSuggestion', async () => {
    const write = vi.fn()
    const h = host({ write, online: () => false })
    await sendSuggestion(h)
    expect(write).toHaveBeenCalledTimes(1)
    expect(h.toasts).toEqual(['Sugestão enviada'])
  })
})
