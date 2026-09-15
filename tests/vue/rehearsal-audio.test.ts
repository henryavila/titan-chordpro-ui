import { describe, expect, it } from 'vitest'
import {
  effectiveChannels,
  prefsFromSource,
  shouldRollSilent,
  softClickFromPrefs,
  sourceFromPrefs,
  strumAudibleDuringRun,
} from '../../src/vue/use/rehearsal-audio'

describe('sourceFromPrefs / prefsFromSource', () => {
  it('maps mute / click / batida round-trip', () => {
    expect(sourceFromPrefs(false, false, true)).toBe('mute')
    expect(sourceFromPrefs(true, false, true)).toBe('click')
    expect(sourceFromPrefs(false, true, true)).toBe('batida')
    expect(sourceFromPrefs(true, true, true)).toBe('batida')

    expect(prefsFromSource('mute', false)).toEqual({ sound: false, strumSound: false })
    expect(prefsFromSource('click', true)).toEqual({ sound: true, strumSound: false })
    expect(prefsFromSource('batida', false)).toEqual({ sound: false, strumSound: true })
    expect(prefsFromSource('batida', true)).toEqual({ sound: true, strumSound: true })
  })

  it('ignores strum pref when the chart has no batida', () => {
    expect(sourceFromPrefs(false, true, false)).toBe('mute')
    expect(sourceFromPrefs(true, true, false)).toBe('click')
  })

  it('soft click only when batida is the primary source', () => {
    expect(softClickFromPrefs(true, true, true)).toBe(true)
    expect(softClickFromPrefs(false, true, true)).toBe(false)
    expect(softClickFromPrefs(true, false, true)).toBe(false)
  })
})

describe('effectiveChannels + shouldRollSilent', () => {
  it('Rolar outside Ensaio Batida forces silence without clearing prefs', () => {
    expect(shouldRollSilent('off')).toBe(true)
    expect(shouldRollSilent('batida')).toBe(false)

    expect(
      effectiveChannels({ sound: true, strumSound: true, rollSilent: true }),
    ).toEqual({ click: false, strum: false })

    expect(
      effectiveChannels({ sound: true, strumSound: true, rollSilent: false }),
    ).toEqual({ click: true, strum: true })
  })
})

describe('strumAudibleDuringRun', () => {
  it('keeps batida mute for the whole count-in bar', () => {
    expect(
      strumAudibleDuringRun({ strumSound: true, rollSilent: false, countIn: 4 }),
    ).toBe(false)
    expect(
      strumAudibleDuringRun({ strumSound: true, rollSilent: false, countIn: 1 }),
    ).toBe(false)
    expect(
      strumAudibleDuringRun({ strumSound: true, rollSilent: false, countIn: 0 }),
    ).toBe(true)
  })
})
