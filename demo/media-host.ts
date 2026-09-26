import { AUDIO_ART_MEDIA_PX, setRehearsalAudio } from '@henryavila/titan-chordpro-ui'

/** Page name of this host — the lock screen must show the song, not this. */
export const MEDIA_DEMO_PAGE_TITLE = 'Demo consumer · titan-chordpro-ui'

export const MEDIA_DEMO_SONG_ID = '100-nasce-em-mim'

/**
 * Complete consumer write: both rehearsal tracks + optional square 1024 cover.
 * Titan reads this from `source`; there is no `audioUrl` prop.
 * `includeArt: false` leaves the chart without `{x_audio_art:}` so the host
 * `defaultAudioArt` (or the packaged art) is used.
 */
export function rehearsalChart(opts: {
  chart: string
  sung: string
  playback: string
  artUrl: string
  includeArt?: boolean
}): string {
  return setRehearsalAudio(opts.chart, {
    sung: opts.sung,
    playback: opts.playback,
    ...(opts.includeArt === false
      ? {}
      : {
          art: {
            url: opts.artUrl,
            width: AUDIO_ART_MEDIA_PX,
            height: AUDIO_ART_MEDIA_PX,
          },
        }),
  })
}
