import { parse, transpose } from './parse'
import { renderHtml } from './render-html'
import { resolveTheme } from './themes'
import type { ThemeId, ViewerAction, ViewerController, ViewerState } from './types'

function fileOffset(src: string): number {
  const n = Number(parse(src).meta.transpose)
  return Number.isFinite(n) && n !== 0 ? n : 0
}

export function createViewerController(opts: { source: string; theme?: ThemeId }): ViewerController {
  let source = opts.source
  let transposeSemitones = fileOffset(source)
  let capo = 0
  let theme: ThemeId = opts.theme ?? 'auto'
  let bias = 0
  let fit = false
  let mode: 'view' | 'edit' = 'view'
  const listeners = new Set<(state: ViewerState) => void>()

  const snapshot = (): ViewerState => {
    const parsed = parse(source)
    const view = transpose(parsed, mode === 'edit' ? 0 : transposeSemitones)
    const resolved = resolveTheme(theme)
    return {
      source,
      view,
      html: renderHtml(view, { theme: resolved }),
      theme,
      resolvedTheme: resolved,
      transposeSemitones: mode === 'edit' ? 0 : transposeSemitones,
      capo,
      bias,
      fit: mode === 'edit' ? false : fit,
      mode,
      displayKey: view.displayKey,
    }
  }

  let state = snapshot()

  const emit = () => {
    state = snapshot()
    for (const fn of listeners) fn(state)
  }

  return {
    getState: () => state,
    subscribe: (fn) => {
      listeners.add(fn)
      fn(state)
      return () => listeners.delete(fn)
    },
    dispatch: (action: ViewerAction) => {
      switch (action.type) {
        case 'transpose':
          transposeSemitones = Math.max(-11, Math.min(11, transposeSemitones + action.delta))
          break
        case 'setTranspose':
          transposeSemitones = Math.max(-11, Math.min(11, action.semitones))
          break
        case 'resetTranspose':
          transposeSemitones = 0
          capo = 0
          break
        case 'setCapo':
          capo = Math.max(0, Math.min(9, action.capo))
          break
        case 'setTheme':
          theme = action.theme
          break
        case 'setBias':
          bias = Math.max(-3, Math.min(5, action.bias))
          break
        case 'setFit':
          fit = action.fit
          break
        case 'setSource':
          source = action.source
          transposeSemitones = fileOffset(source)
          capo = 0
          break
        case 'setMode':
          mode = action.mode
          if (mode === 'edit') {
            transposeSemitones = 0
            fit = false
          }
          break
        default:
          break
      }
      emit()
    },
  }
}
