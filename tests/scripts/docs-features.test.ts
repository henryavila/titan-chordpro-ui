import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import {
  FEATURE_INDEX_END,
  FEATURE_INDEX_START,
  featureIndexInterior,
  featureIndexMatches,
  firstSentence,
  loadFeatureDocs,
  parseFeatureDoc,
  syncFeatureIndexes,
  upsertFeatureIndex,
} from '../../scripts/docs-features'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const temps: string[] = []

afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'docs-features-'))
  temps.push(dir)
  return dir
}

describe('parseFeatureDoc', () => {
  it('reads the title and the first prose sentence', () => {
    const doc = parseFeatureDoc(`---
id: exportacao
status: in-progress
---

# Exportar a cifra

No computador abre Exportar; no telefone fica em Mais. O resto não entra.

Segundo parágrafo.
`)
    expect(doc).toEqual({
      id: 'exportacao',
      title: 'Exportar a cifra',
      sentence: 'No computador abre Exportar; no telefone fica em Mais.',
    })
  })

  it('ignores a file without an id in the frontmatter', () => {
    expect(parseFeatureDoc('# Sem ficha\n\nTexto.\n')).toBeNull()
    expect(
      parseFeatureDoc(`---
status: in-progress
---

# Sem id

Texto.
`),
    ).toBeNull()
    expect(parseFeatureDoc('id: solto\n\n# Não conta\n\nTexto.\n')).toBeNull()
  })

  it('stops the sentence at punctuation outside backticks', () => {
    expect(firstSentence('Veja `a.b` agora. Depois não.')).toBe('Veja `a.b` agora.')
    expect(firstSentence('Cabe? Sim.')).toBe('Cabe?')
    expect(firstSentence('Olha! Depois.')).toBe('Olha!')
  })
})

describe('feature index', () => {
  it('lists title and first sentence, sorted by id', () => {
    const interior = featureIndexInterior([
      { id: 'ficha-campos', title: 'Ficha — campos da cifra', sentence: 'Meta e Nova cifra.' },
      { id: 'chrome-botoes', title: 'Chrome — botões da cifra', sentence: 'O músico vê Rolar.' },
    ])
    expect(interior).toBe(
      [
        '',
        '## Na tela',
        '',
        '- **Chrome — botões da cifra.** O músico vê Rolar.',
        '- **Ficha — campos da cifra.** Meta e Nova cifra.',
        '',
      ].join('\n'),
    )
  })

  it('appends one block and leaves the rest of the file', () => {
    const interior = featureIndexInterior([
      { id: 'exportacao', title: 'Exportar a cifra', sentence: 'Abre Exportar.' },
    ])
    const source = 'Guia do host.\n\nNão reescrever este parágrafo.\n'
    const once = upsertFeatureIndex(source, interior)
    expect(once.startsWith(source)).toBe(true)
    expect(once).toContain(FEATURE_INDEX_START)
    expect(once).toContain(FEATURE_INDEX_END)
    expect(once).toContain('- **Exportar a cifra.** Abre Exportar.')
    expect(upsertFeatureIndex(once, interior)).toBe(once)
    expect(featureIndexMatches(once, interior)).toBe(true)
    expect(featureIndexMatches(source, interior)).toBe(false)
  })

  it('replaces only the span between the markers', () => {
    const interior = featureIndexInterior([
      { id: 'exportacao', title: 'Exportar a cifra', sentence: 'Abre Exportar.' },
    ])
    const source = ['antes', FEATURE_INDEX_START, 'miolo velho', FEATURE_INDEX_END, 'depois', ''].join(
      '\n',
    )
    const next = upsertFeatureIndex(source, interior)
    expect(next.startsWith('antes\n')).toBe(true)
    expect(next.endsWith(`${FEATURE_INDEX_END}\ndepois\n`)).toBe(true)
    expect(next).not.toContain('miolo velho')
    expect(featureIndexMatches(next, interior)).toBe(true)
  })

  it('throws when the start marker has no end and does not append', () => {
    const interior = featureIndexInterior([
      { id: 'exportacao', title: 'Exportar a cifra', sentence: 'Abre Exportar.' },
    ])
    const source = `${FEATURE_INDEX_START}\nalgum texto depois\n`
    expect(() => upsertFeatureIndex(source, interior)).toThrow(/end/)
    expect(source).toBe(`${FEATURE_INDEX_START}\nalgum texto depois\n`)
    expect(source).not.toContain(FEATURE_INDEX_END)
  })
})

describe('syncFeatureIndexes', () => {
  it('skips a markdown file without id and writes both targets', () => {
    const dir = tempDir()
    const features = join(dir, 'features')
    mkdirSync(features)
    writeFileSync(join(features, 'nota.md'), '# Sem frontmatter\n\nIgnorar.\n')
    writeFileSync(join(features, 'b.md'), '---\nid: beta\n---\n\n# Beta\n\nSegunda peça.\n')
    writeFileSync(join(features, 'a.md'), '---\nid: alfa\n---\n\n# Alfa\n\nPrimeira peça.\n')
    const readme = join(dir, 'README.md')
    const consumer = join(dir, 'CONSUMER.md')
    writeFileSync(readme, '# Leia\n')
    writeFileSync(consumer, 'Contrato.\n\nFim.\n')

    const preview = syncFeatureIndexes({
      featuresDir: features,
      targets: [readme, consumer],
      write: false,
    })
    expect(preview.ok).toBe(false)
    expect(readFileSync(readme, 'utf8')).toBe('# Leia\n')
    expect(readFileSync(consumer, 'utf8')).toBe('Contrato.\n\nFim.\n')

    const written = syncFeatureIndexes({
      featuresDir: features,
      targets: [readme, consumer],
      write: true,
    })
    expect(written.ok).toBe(false)
    const readmeOut = readFileSync(readme, 'utf8')
    const consumerOut = readFileSync(consumer, 'utf8')
    expect(readmeOut.startsWith('# Leia\n')).toBe(true)
    expect(consumerOut.startsWith('Contrato.\n\nFim.\n')).toBe(true)
    expect(readmeOut).toContain('- **Alfa.** Primeira peça.')
    expect(readmeOut).toContain('- **Beta.** Segunda peça.')
    expect(readmeOut).not.toContain('Ignorar')
    expect(consumerOut).toContain('- **Alfa.** Primeira peça.')
    expect(readmeOut.indexOf('- **Alfa.**')).toBeLessThan(readmeOut.indexOf('- **Beta.**'))

    const again = syncFeatureIndexes({
      featuresDir: features,
      targets: [readme, consumer],
      write: false,
    })
    expect(again.ok).toBe(true)
    expect(loadFeatureDocs(features).map((doc) => doc.id)).toEqual(['alfa', 'beta'])
  })
})

describe('docs/features do repositório', () => {
  it('inclui exportação junto dos dois pacotes já existentes', () => {
    const docs = loadFeatureDocs(join(root, 'docs/features'))
    expect(docs.map((doc) => doc.id)).toEqual(['chrome-botoes', 'exportacao', 'ficha-campos'])
    const exportacao = docs.find((doc) => doc.id === 'exportacao')
    expect(exportacao?.title).toBe('Exportar a cifra')
    expect(exportacao?.sentence).toMatch(/telefone/)
    expect(exportacao?.sentence).toMatch(/Mais/)
    expect(exportacao?.sentence.endsWith('.')).toBe(true)
  })
})
