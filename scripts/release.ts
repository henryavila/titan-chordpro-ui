#!/usr/bin/env npx tsx
/**
 * Release planner/applier. Chooses the next semver; does not guess patch.
 *
 *   pnpm exec tsx scripts/release.ts              plan (stdout)
 *   pnpm exec tsx scripts/release.ts --json       plan as JSON
 *   pnpm exec tsx scripts/release.ts --apply      bump package.json + CHANGELOG.md
 *   pnpm exec tsx scripts/release.ts --notes      print GH notes for package.json version
 *   pnpm exec tsx scripts/release.ts --ship       tag + push + GitHub Release (tree must be clean)
 *
 * npm publish is NOT done here. GitHub Release triggers OIDC stage; a human
 * approves with 2FA (`npm stage approve`).
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  classifyBump,
  cmpVersion,
  extractReleaseNotes,
  githubRepoUrl,
  maxVersion,
  parseUnreleased,
  parseVersion,
  rewriteChangelog,
  todayISO,
  type BumpPlan,
  type Unreleased,
} from './semver-bump'

type Pkg = {
  name: string
  version: string
  repository?: { url?: string } | string
  homepage?: string
}

type Facts = {
  name: string
  packageVersion: string
  npmLatest: string | null
  npmVersions: string[]
  gitTags: string[]
  githubReleases: string[]
  baseline: string
  since: string
  commits: string[]
  unreleased: Unreleased
  plan: BumpPlan
  alreadyBumped: boolean
  repoUrl: string
  warnings: string[]
  changelog: string
  pkg: Pkg
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PKG_PATH = join(ROOT, 'package.json')
const CHANGELOG_PATH = join(ROOT, 'CHANGELOG.md')

const args = new Set(process.argv.slice(2))
const WANT_JSON = args.has('--json')
const WANT_APPLY = args.has('--apply')
const WANT_NOTES = args.has('--notes')
const WANT_SHIP = args.has('--ship')
const DRY = args.has('--dry-run') || args.has('-n')

function sh(cmd: string, argv: string[], opts: { allowFail?: boolean } = {}): string {
  try {
    return execFileSync(cmd, argv, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  } catch (err) {
    if (opts.allowFail) return ''
    throw err
  }
}

function npmJson(pkgName: string, field: string): unknown {
  const out = sh('npm', ['view', pkgName, field, '--json'], { allowFail: true })
  if (!out) return null
  try {
    return JSON.parse(out)
  } catch {
    return out
  }
}

function gitCommitsSince(rev: string | null): string[] {
  const range = rev ? `${rev}..HEAD` : 'HEAD'
  const out = sh('git', ['log', range, '--pretty=format:%s'], { allowFail: true })
  return out ? out.split('\n').filter(Boolean) : []
}

function findBumpCommit(version: string): string | null {
  const out = sh(
    'git',
    ['log', '-1', '--format=%H', '-S', `"version": "${version}"`, '--', 'package.json'],
    { allowFail: true },
  )
  return out || null
}

function collect(): Facts {
  const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf8')) as Pkg
  const changelog = readFileSync(CHANGELOG_PATH, 'utf8')
  const unreleased = parseUnreleased(changelog)
  const pkgVersion = parseVersion(pkg.version).raw

  const npmVersionsRaw = npmJson(pkg.name, 'versions')
  const npmVersions = Array.isArray(npmVersionsRaw)
    ? npmVersionsRaw.map(String)
    : npmVersionsRaw
      ? [String(npmVersionsRaw)]
      : []
  const npmLatest = npmVersions.length ? maxVersion(npmVersions) : null

  const tags = sh('git', ['tag', '-l', 'v*'], { allowFail: true })
    .split('\n')
    .map((t) => t.replace(/^v/, ''))
    .filter((t) => /^\d+\.\d+\.\d+$/.test(t))

  let ghTags: string[] = []
  const ghOut = sh('gh', ['release', 'list', '--json', 'tagName', '-L', '50'], { allowFail: true })
  if (ghOut) {
    try {
      ghTags = (JSON.parse(ghOut) as { tagName: string }[]).map((r) =>
        String(r.tagName).replace(/^v/, ''),
      )
    } catch {
      ghTags = []
    }
  }

  if (npmLatest && cmpVersion(pkgVersion, npmLatest) < 0) {
    throw new Error(
      `package.json ${pkgVersion} is behind npm ${npmLatest}. Pull/sync before releasing.`,
    )
  }

  const alreadyBumped = npmLatest ? cmpVersion(pkgVersion, npmLatest) > 0 : false
  const current = alreadyBumped && npmLatest ? npmLatest : pkgVersion

  const tagRef = tags.includes(current) ? `v${current}` : null
  const bumpCommit = findBumpCommit(current)
  const since = tagRef || bumpCommit
  const commits = gitCommitsSince(since)

  const plan = classifyBump({ current, commits, unreleased })
  const repoUrl = githubRepoUrl(pkg)

  const ghLatest = maxVersion(ghTags)
  const warnings: string[] = []
  if (npmLatest && ghLatest && cmpVersion(npmLatest, ghLatest) > 0) {
    warnings.push(
      `npm is at ${npmLatest} but GitHub latest release is ${ghLatest}. Do not backfill a GH release for ${npmLatest} — that retriggers OIDC stage of a version already on the registry.`,
    )
  }
  if (alreadyBumped) {
    warnings.push(
      `package.json already at ${pkgVersion} (ahead of npm ${npmLatest}). Classifier next from npm baseline is ${plan.next}.`,
    )
    if (pkgVersion !== plan.next) {
      warnings.push(
        `Refusing to keep package.json ${pkgVersion}: classifier wants ${plan.next} (${plan.kind}).`,
      )
    }
  }

  return {
    name: pkg.name,
    packageVersion: pkgVersion,
    npmLatest,
    npmVersions,
    gitTags: [...tags].sort(cmpVersion),
    githubReleases: [...ghTags].sort(cmpVersion),
    baseline: current,
    since: since || '(repo root)',
    commits,
    unreleased,
    plan,
    alreadyBumped,
    repoUrl,
    warnings,
    changelog,
    pkg,
  }
}

function printPlan(facts: Facts): string {
  const { plan } = facts
  const lines = [
    `${facts.name}`,
    `  package.json : ${facts.packageVersion}`,
    `  npm latest   : ${facts.npmLatest ?? '(unpublished)'}`,
    `  git tags     : ${facts.gitTags.map((v) => 'v' + v).join(', ') || '(none)'}`,
    `  gh releases  : ${facts.githubReleases.map((v) => 'v' + v).join(', ') || '(none)'}`,
    `  baseline     : ${facts.baseline}  (npm, not GitHub)`,
    `  commits since ${facts.since}: ${facts.commits.length}`,
    '',
    `  bump         : ${plan.kind}`,
    `  next         : ${plan.next}`,
    `  breaking     : ${plan.breaking ? 'yes' : 'no'}`,
    '  reasons:',
    ...(plan.reasons.length ? plan.reasons.map((r) => `    · ${r}`) : ['    · (none)']),
  ]
  if (facts.warnings.length) {
    lines.push('', '  warnings:')
    for (const w of facts.warnings) lines.push(`    ! ${w}`)
  }
  if (plan.kind === 'none') {
    lines.push('', '  nothing to release.')
  } else {
    lines.push(
      '',
      '  next steps:',
      `    pnpm exec tsx scripts/release.ts --apply`,
      `    pnpm test && pnpm typecheck`,
      `    git commit / tag v${plan.next} / push`,
      `    pnpm exec tsx scripts/release.ts --ship`,
      `    human: npx npm@11.19.1 stage approve <id>`,
    )
  }
  return lines.join('\n')
}

function apply(facts: Facts): { version: string; date: string } {
  const { plan } = facts
  if (plan.kind === 'none') {
    throw new Error('nothing to apply (kind=none)')
  }
  if (facts.packageVersion === plan.next) {
    throw new Error(`package.json already at ${plan.next}. Nothing to apply.`)
  }
  if (facts.alreadyBumped && facts.packageVersion !== plan.next) {
    throw new Error(
      `package.json is ${facts.packageVersion} but classifier wants ${plan.next}. Fix the version by hand or revert the bump.`,
    )
  }
  if (facts.npmLatest && facts.npmLatest === plan.next) {
    throw new Error(`${plan.next} is already on npm. Bump would republish.`)
  }

  const date = todayISO()
  const changelog = rewriteChangelog(facts.changelog, {
    next: plan.next,
    date,
    repoUrl: facts.repoUrl,
  })
  writeFileSync(CHANGELOG_PATH, changelog)

  const pkg = { ...facts.pkg, version: plan.next }
  writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n')

  return { version: plan.next, date }
}

function assertCleanTree(): void {
  const status = sh('git', ['status', '--porcelain'])
  if (status) {
    throw new Error(`working tree not clean:\n${status}`)
  }
}

function ship(facts: Facts): { tag: string; notes: string } {
  const version = parseVersion(facts.packageVersion).raw
  if (facts.npmLatest && facts.npmLatest === version) {
    throw new Error(
      `${version} is already on npm. Creating a GitHub Release would re-stage it. Ship a new version instead.`,
    )
  }
  if (facts.githubReleases.includes(version)) {
    throw new Error(`GitHub release v${version} already exists.`)
  }
  const notes = extractReleaseNotes(facts.changelog, version)
  if (!notes.trim()) {
    throw new Error(`CHANGELOG.md has no ## [${version}] body. Run --apply first.`)
  }

  assertCleanTree()

  const tag = `v${version}`
  const existingTag = sh('git', ['tag', '-l', tag], { allowFail: true })
  if (!existingTag) {
    sh('git', ['tag', '-a', tag, '-m', `Version ${version}`])
  }

  const branch = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD'])
  sh('git', ['push', 'origin', branch])
  sh('git', ['push', 'origin', tag])

  sh('gh', ['release', 'create', tag, '--title', tag, '--notes', notes])

  return { tag, notes }
}

function main(): void {
  if (args.has('-h') || args.has('--help')) {
    const src = readFileSync(fileURLToPath(import.meta.url), 'utf8')
    const block = src.split('*/')[0]?.split('/**')[1]?.trim() ?? ''
    process.stdout.write(block + '\n')
    return
  }

  const facts = collect()

  if (WANT_NOTES) {
    const v = facts.packageVersion
    const notes = extractReleaseNotes(facts.changelog, v)
    if (!notes) {
      process.stderr.write(`no notes for ${v} — Unreleased not applied yet?\n`)
      process.exit(1)
    }
    process.stdout.write(notes + '\n')
    return
  }

  if (WANT_APPLY) {
    if (DRY) {
      process.stdout.write(`dry-run: would bump ${facts.packageVersion} → ${facts.plan.next}\n`)
      return
    }
    const applied = apply(facts)
    process.stderr.write(`applied ${applied.version} (${applied.date})\n`)
    if (WANT_JSON) process.stdout.write(JSON.stringify({ ...facts.plan, applied }, null, 2) + '\n')
    else {
      process.stdout.write(
        [
          `package.json → ${applied.version}`,
          `CHANGELOG.md → ## [${applied.version}] - ${applied.date}`,
          `next: commit, then pnpm exec tsx scripts/release.ts --ship`,
        ].join('\n') + '\n',
      )
    }
    return
  }

  if (WANT_SHIP) {
    if (DRY) {
      process.stdout.write(`dry-run: would tag+release v${facts.packageVersion}\n`)
      return
    }
    const result = ship(facts)
    process.stdout.write(`shipped ${result.tag}\n${facts.repoUrl}/releases/tag/${result.tag}\n`)
    process.stdout.write(
      `\nNext (human, 2FA):\n  npx npm@11.19.1 stage list ${facts.name}\n  npx npm@11.19.1 stage approve <stage-id>\n`,
    )
    return
  }

  if (WANT_JSON) process.stdout.write(JSON.stringify(facts.plan, null, 2) + '\n')
  else process.stdout.write(printPlan(facts) + '\n')

  if (facts.plan.kind === 'none') process.exit(2)
}

main()
