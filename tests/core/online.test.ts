import { describe, expect, it } from 'vitest'
import { OFFLINE_SUGGEST_TOAST, resolveOnline } from '../../src/core/online'

describe('resolveOnline', () => {
  it('the host hint wins over the browser flag', () => {
    expect(resolveOnline({ host: false, navigatorOnline: true })).toBe(false)
    expect(resolveOnline({ host: true, navigatorOnline: false })).toBe(true)
  })

  it('falls back to navigator, then assumes online', () => {
    expect(resolveOnline({ navigatorOnline: false })).toBe(false)
    expect(resolveOnline({ navigatorOnline: true })).toBe(true)
    expect(resolveOnline({})).toBe(true)
  })
})

describe('offline copy', () => {
  it('tells the musician the suggestion stays on this device', () => {
    expect(OFFLINE_SUGGEST_TOAST).toMatch(/sem internet/i)
    expect(OFFLINE_SUGGEST_TOAST).toMatch(/minha versão/i)
  })
})
