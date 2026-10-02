import { computed, type Ref } from 'vue'

export type ChromeBp = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

/**
 * Width, fullscreen and the phone dock decide every chrome measure.
 * The page pad does not shrink in zen — only the chrome opacity does.
 */
export function useChromeLayout(opts: {
  width: Ref<number>
  fs: Ref<boolean>
  scrolling: Ref<boolean>
  /** Phone dock bottom, measured. The last row must clear it. */
  visibleDockBottom: Ref<number>
  headH: Ref<number>
}) {
  const phone = computed(() => opts.width.value < 640)
  const compact = computed(() => phone.value)
  const bp = computed((): ChromeBp => {
    const w = opts.width.value
    return w < 400 ? 'xs' : w < 640 ? 'sm' : w < 900 ? 'md' : w < 1280 ? 'lg' : 'xl'
  })
  const pageMax = computed(() =>
    opts.fs.value
      ? ({ xs: '100%', sm: '100%', md: '100%', lg: '1040px', xl: '1180px' } as const)[bp.value]
      : ({ xs: '100%', sm: '100%', md: '760px', lg: '880px', xl: '980px' } as const)[bp.value],
  )
  const padX = computed(() =>
    opts.fs.value
      ? ({ xs: '8px', sm: '10px', md: '14px', lg: '18px', xl: '24px' } as const)[bp.value]
      : ({ xs: '14px', sm: '16px', md: '22px', lg: '28px', xl: '40px' } as const)[bp.value],
  )
  /** Floating chrome inset above the chart (head + edit). */
  const chromePad = computed(() =>
    opts.fs.value
      ? ({ xs: '4px 6px 0', sm: '5px 8px 0', md: '6px 12px 0', lg: '7px 14px 0', xl: '8px 18px 0' } as const)[bp.value]
      : ({ xs: '8px 10px 0', sm: '10px 12px 0', md: '12px 16px 0', lg: '14px 20px 0', xl: '16px 26px 0' } as const)[
          bp.value
        ],
  )
  const chromeTop = computed(
    () =>
      (opts.fs.value
        ? ({ xs: 4, sm: 5, md: 6, lg: 7, xl: 8 } as const)
        : ({ xs: 8, sm: 10, md: 12, lg: 14, xl: 16 } as const))[bp.value],
  )
  const padBottom = computed(() => {
    const base = opts.fs.value
      ? ({ xs: 104, sm: 106, md: 104, lg: 106, xl: 110 } as const)[bp.value]
      : ({ xs: 124, sm: 128, md: 128, lg: 132, xl: 140 } as const)[bp.value]
    // The dock grows when auto-scroll starts: the last line must not hide under it.
    const reserve = base + (phone.value ? (opts.scrolling.value ? 54 : 10) : 0)
    return `${phone.value ? Math.max(reserve, opts.visibleDockBottom.value + 56) : reserve}px`
  })
  /** Flush-left overlay on a full-width frame (2px, not 12). */
  const countLeft = computed(() =>
    pageMax.value === '100%' ? '2px' : `max(12px, calc((100% - ${pageMax.value}) / 2 - 28px))`,
  )
  /** Below the padded title strip, not the head height alone. */
  const countTop = computed(
    () => `${chromeTop.value + Math.max(40, opts.headH.value || 56) + 8}px`,
  )
  /**
   * At 320px six 44px controls overflow. 40px is the smaller concession
   * so the last button stays on screen.
   */
  const dockCtrlH = computed(() => (opts.width.value < 360 ? '40px' : bp.value === 'xs' ? '44px' : '48px'))
  const dockIconSize = computed(() => dockCtrlH.value)
  const dockTypeW = computed(() => (opts.width.value < 360 ? '34px' : bp.value === 'xs' ? '38px' : '42px'))
  /** The word "Rolar" stays from 360px up. Below that the row cannot hold it. */
  const dockPlayLabeled = computed(() => opts.width.value >= 360)

  return {
    phone,
    compact,
    bp,
    pageMax,
    padX,
    chromePad,
    chromeTop,
    padBottom,
    countLeft,
    countTop,
    dockCtrlH,
    dockIconSize,
    dockTypeW,
    dockPlayLabeled,
  }
}
