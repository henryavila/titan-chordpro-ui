import { describe, expect, it } from 'vitest'
import {
  createSourceSession,
  parse,
  renderHtml,
  transpose,
  type TitanChordproDocument,
} from '../../src/core'
import { ELE_VIVE_IMG, loadFixture } from '../helpers/load-fixture'

const source = loadFixture(ELE_VIVE_IMG)
const clockMarks = () => source.match(/\][x/]+/g) ?? []
const embeddedContent = (document: TitanChordproDocument) => document.sections
  .flatMap(section => section.lines)
  .filter(line => line.type === 'score' || line.type === 'image')
  .map(line => line.type === 'image'
    ? { type: line.type, src: line.src }
    : { type: line.type, text: line.text })

describe('document pipeline with a real chart', () => {
  it('carries the source, notation and images through parse, transpose and HTML', () => {
    const document: TitanChordproDocument = parse(source)
    expect(document.source).toBe(source)
    expect(document.meta.key).toBe('G')
    expect(JSON.parse(JSON.stringify(document))).toEqual(document)
    expect(embeddedContent(document).map(line => line.type)).toEqual([
      'image', 'score', 'image', 'image',
    ])
    expect(clockMarks().length).toBeGreaterThan(0)

    const shifted = transpose(document, 2)
    expect(shifted).not.toBe(document)
    expect(document.transposeSemitones).toBe(0)
    expect(shifted.transposeSemitones).toBe(2)
    expect(shifted.displayKey).toBe('A')
    expect(shifted.source).toBe(source)
    expect(shifted.source.match(/\][x/]+/g)).toEqual(clockMarks())
    expect(embeddedContent(shifted)).toEqual(embeddedContent(document))
    expect(renderHtml(shifted)).toContain('assets/ele-vive-intro.png')
  })

  it('keeps clock marks and attachments when the editor changes metadata', () => {
    const session = createSourceSession({ source })
    session.setMeta({ title: 'Ele Vive em Mim (revisado)' })

    const edited = session.getSource()
    expect(session.getView().meta.title).toBe('Ele Vive em Mim (revisado)')
    expect(edited.match(/\][x/]+/g)).toEqual(clockMarks())
    expect(embeddedContent(session.getView())).toEqual(embeddedContent(parse(source)))
    expect(session.dirty()).toBe(true)

    session.undo()
    expect(session.getSource()).toBe(source)
    session.redo()
    expect(session.getSource()).toBe(edited)
    session.discard()
    expect(session.getSource()).toBe(source)
    expect(session.dirty()).toBe(false)
  })
})
