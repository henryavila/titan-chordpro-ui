import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue'
import { resolveOnline } from '@henryavila/titan-chordpro-ui'

function navOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine !== false
}

/**
 * Host `online` wins. Otherwise `navigator.onLine`, kept in sync with the
 * browser's online/offline events.
 */
export function useOnline(host: Ref<boolean | undefined>) {
  const nav = ref(navOnline())
  function on() {
    nav.value = true
  }
  function off() {
    nav.value = false
  }
  onMounted(() => {
    nav.value = navOnline()
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
  })
  onUnmounted(() => {
    window.removeEventListener('online', on)
    window.removeEventListener('offline', off)
  })
  return computed(() => resolveOnline({ host: host.value, navigatorOnline: nav.value }))
}
