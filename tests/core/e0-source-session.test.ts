import { describe, expect, it } from 'vitest'
import { createSourceSession } from '../../src/core/source-session'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

describe('E0 source session', () => {
  it('meta edit writes into source and re-parses', () => {
    const s = createSourceSession({ source: loadFixture(JESUS_1) })
    s.setMeta({ title: 'Novo título', key: 'A' })
    expect(s.getSource()).toMatch(/\{title:\s*Novo título\}/)
    expect(s.getView().meta.title).toBe('Novo título')
    expect(s.getView().meta.key).toBe('A')
    expect(s.dirty()).toBe(true)
  })

  it('setMeta also writes duration, time and reference', () => {
    const s = createSourceSession({ source: '{title: T}\n[G]a\n' })
    s.setMeta({ duration: '04:26', time: '6/8', x_source: 'https://youtu.be/x' })
    expect(s.getSource()).toMatch(/\{duration:04:26\}/)
    expect(s.getSource()).toMatch(/\{time:6\/8\}/)
    expect(s.getSource()).toMatch(/\{x_source:https:\/\/youtu\.be\/x\}/)
    expect(s.getView().meta.duration).toBe('04:26')
    expect(s.getView().meta.time).toBe('6/8')
  })

  it('undo/redo and discard restore committed source', () => {
    const src = loadFixture(JESUS_1)
    const s = createSourceSession({ source: src })
    s.replace(src + '\n{c:(NOVO)}\n')
    expect(s.dirty()).toBe(true)
    s.undo()
    expect(s.getSource()).toBe(src)
    s.redo()
    expect(s.getSource()).toContain('NOVO')
    s.discard()
    expect(s.getSource()).toBe(src)
    expect(s.dirty()).toBe(false)
  })

  it('commit clears dirty', () => {
    const s = createSourceSession({ source: 'x' })
    s.replace('y')
    s.commit()
    expect(s.dirty()).toBe(false)
  })
})
