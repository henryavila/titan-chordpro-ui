import { describe, expect, it } from 'vitest'
import { durationFromYoutubeHtml, formatDurationFromSec } from '../../src/core/timeline'

describe('YouTube duration from watch HTML', () => {
  it('reads lengthSeconds', () => {
    expect(durationFromYoutubeHtml('{"lengthSeconds":"477"}')).toBe('07:57')
    expect(formatDurationFromSec(477)).toBe('07:57')
  })

  it('reads ISO-8601 itemprop duration', () => {
    expect(
      durationFromYoutubeHtml('<meta itemprop="duration" content="PT7M57S">'),
    ).toBe('07:57')
  })

  it('rejects clips that are too short for a song duration', () => {
    expect(durationFromYoutubeHtml('"lengthSeconds":"10"')).toBeNull()
  })
})
