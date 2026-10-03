/** Seal on a network action that cannot run without a connection. */
export const OFFLINE_LABEL = 'Sem internet'

/** Toast when Sugerir needs the host POST and the device is offline. */
export const OFFLINE_SUGGEST_TOAST =
  'Sem internet. A sugestão continua na Minha versão; envie quando voltar.'

/** Hint under Cifra Club when the page cannot be fetched. */
export const OFFLINE_CIFRACLUB_HINT = 'Use Arquivo ou Texto.'

/**
 * Host `online` wins. Otherwise the browser flag. Missing both → treat as
 * online so a kiosk without `navigator.onLine` does not lock the chrome.
 */
export function resolveOnline(opts: { host?: boolean; navigatorOnline?: boolean } = {}): boolean {
  if (typeof opts.host === 'boolean') return opts.host
  if (typeof opts.navigatorOnline === 'boolean') return opts.navigatorOnline
  return true
}
