import { handleCifraFetchRequest } from './__cifra_fetch'
import { handleYoutubeDurationRequest } from './__youtube_duration'

/**
 * Demo Worker: static assets from dist-demo, plus the import-proxy routes.
 * `run_worker_first` in wrangler.toml sends only these paths here.
 */
export default {
  async fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname
    if (path === '/__cifra_fetch') return handleCifraFetchRequest(request)
    if (path === '/__youtube_duration') return handleYoutubeDurationRequest(request)
    return new Response(null, { status: 404 })
  },
}
