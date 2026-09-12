import { describe, expect, it } from 'vitest'
import {
  bumpVersion,
  classifyBump,
  extractReleaseNotes,
  parseUnreleased,
  rewriteChangelog,
} from '../../scripts/semver-bump'

describe('parseUnreleased', () => {
  it('collects keep-a-changelog items and ignores empty headings', () => {
    const md = `# Changelog

## [Unreleased]

### Added
- **Prop lens**

### Changed
- Capo sem dual

### Fixed
- Pulso do metrônomo

### Removed

## [0.1.3] - 2026-09-12
`

    expect(parseUnreleased(md)).toEqual({
      added: ['**Prop lens**'],
      changed: ['Capo sem dual'],
      deprecated: [],
      removed: [],
      fixed: ['Pulso do metrônomo'],
      security: [],
    })
  })
})

describe('bumpVersion', () => {
  it('bumps patch / minor / major', () => {
    expect(bumpVersion('0.1.3', 'patch')).toBe('0.1.4')
    expect(bumpVersion('0.1.3', 'minor')).toBe('0.2.0')
    expect(bumpVersion('1.4.2', 'major')).toBe('2.0.0')
  })

  it('never auto-jumps 0.x to 1.0.0 — breaking stays minor', () => {
    expect(bumpVersion('0.9.5', 'major')).toBe('0.10.0')
    expect(bumpVersion('0.1.3', 'major')).toBe('0.2.0')
  })
})

describe('classifyBump — the 0.1.x bugfix mistake must not recur', () => {
  it('treats a feat-only 0.1.2 follow-up as 0.2.0, not 0.1.3', () => {
    const plan = classifyBump({
      current: '0.1.2',
      commits: ['feat: enrich Cifra Club em cifra existente (meta-only)'],
      unreleased: parseUnreleased(`## [Unreleased]

### Added
- CLI enrich-cc
`),
    })
    expect(plan.kind).toBe('minor')
    expect(plan.next).toBe('0.2.0')
    expect(plan.kind).not.toBe('patch')
  })

  it('treats Added + Changed on top of 0.1.3 as 0.2.0, not 0.1.4', () => {
    const plan = classifyBump({
      current: '0.1.3',
      commits: [
        'feat: Cifra | Letra no chrome, sem menu Lentes',
        'feat: reescrever capo falso e honrar {transpose:} na leitura',
        'fix: pulso do 1 inverte chips da barra sem colar controles',
      ],
      unreleased: parseUnreleased(`## [Unreleased]

### Added
- Prop lens / hideComments

### Changed
- Cifra | Letra no chrome

### Fixed
- Pulso do metrônomo
`),
    })
    expect(plan.next).toBe('0.2.0')
    expect(plan.kind).toBe('minor')
  })

  it('does not let a feat commit hide as patch even if changelog only lists Fixed', () => {
    const plan = classifyBump({
      current: '0.1.3',
      commits: ['feat: nova prop lens no host'],
      unreleased: parseUnreleased(`## [Unreleased]

### Fixed
- typo
`),
    })
    expect(plan.kind).toBe('minor')
    expect(plan.next).toBe('0.2.0')
  })

  it('does not let changelog Added hide as patch even if commits are only fix:', () => {
    const plan = classifyBump({
      current: '1.0.0',
      commits: ['fix: crash on empty chart'],
      unreleased: parseUnreleased(`## [Unreleased]

### Added
- Export Nashville
`),
    })
    expect(plan.kind).toBe('minor')
    expect(plan.next).toBe('1.1.0')
  })

  it('uses patch only when every signal is a bugfix', () => {
    const plan = classifyBump({
      current: '0.2.0',
      commits: ['fix: lente Só letra persiste no ensaio'],
      unreleased: parseUnreleased(`## [Unreleased]

### Fixed
- Lente no ensaio
`),
    })
    expect(plan.kind).toBe('patch')
    expect(plan.next).toBe('0.2.1')
  })

  it('maps 0.x breaking to minor, 1.x breaking to major', () => {
    const zero = classifyBump({
      current: '0.2.0',
      commits: ['feat!: rename ChordproViewer prop chart → source'],
      unreleased: { added: [], changed: [], deprecated: [], removed: ['prop chart'], fixed: [], security: [] },
    })
    expect(zero.kind).toBe('minor')
    expect(zero.next).toBe('0.3.0')
    expect(zero.breaking).toBe(true)

    const one = classifyBump({
      current: '1.2.0',
      commits: ['feat!: rename ChordproViewer prop chart → source'],
      unreleased: { added: [], changed: [], deprecated: [], removed: ['prop chart'], fixed: [], security: [] },
    })
    expect(one.kind).toBe('major')
    expect(one.next).toBe('2.0.0')
  })

  it('returns none when there is nothing to ship', () => {
    const plan = classifyBump({
      current: '0.2.0',
      commits: ['docs: memória do contrato', 'chore: bump ci'],
      unreleased: parseUnreleased(`## [Unreleased]

## [0.2.0] - 2026-09-12
`),
    })
    expect(plan.kind).toBe('none')
    expect(plan.next).toBe('0.2.0')
  })
})

describe('rewriteChangelog', () => {
  const src = `# Changelog

## [Unreleased]

### Added
- Prop lens

### Fixed
- Pulso

## [0.1.3] - 2026-09-12

### Added
- Enrich

[Unreleased]: https://github.com/henryavila/titan-chordpro-ui/compare/v0.1.3...HEAD
[0.1.3]: https://github.com/henryavila/titan-chordpro-ui/releases/tag/v0.1.3
`

  it('moves Unreleased into the new version and retargets compare links', () => {
    const out = rewriteChangelog(src, {
      next: '0.2.0',
      date: '2026-09-12',
      repoUrl: 'https://github.com/henryavila/titan-chordpro-ui',
    })
    expect(out).toContain('## [Unreleased]\n')
    expect(out).toContain('## [0.2.0] - 2026-09-12')
    expect(out).toContain('- Prop lens')
    expect(out.indexOf('## [Unreleased]')).toBeLessThan(out.indexOf('## [0.2.0]'))
    expect(out.indexOf('## [0.2.0]')).toBeLessThan(out.indexOf('## [0.1.3]'))
    expect(out).toContain(
      '[Unreleased]: https://github.com/henryavila/titan-chordpro-ui/compare/v0.2.0...HEAD',
    )
    expect(out).toContain(
      '[0.2.0]: https://github.com/henryavila/titan-chordpro-ui/releases/tag/v0.2.0',
    )
    expect(extractReleaseNotes(out, '0.2.0')).toContain('Prop lens')
    expect(extractReleaseNotes(out, '0.2.0')).not.toContain('## [0.1.3]')
  })
})
