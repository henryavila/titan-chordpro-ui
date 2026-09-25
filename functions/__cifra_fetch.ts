import type { PagesFunction } from '@cloudflare/workers-types'
import { loadCifraClubHtml } from '../src/core/cifraclub-api-html'
import { cifraOk, corsHeaders } from './_shared'

/**
 * Same contract as the Vite demo middleware: GET ?url=… → HTML for convert().
 * The public page is often 403; then the version API supplies the chart.
 */
export const onRequestGet: PagesFunction = async (context) => {
  const origin = context.request.headers.get('Origin')
  const target = new URL(context.request.url).searchParams.get('url') ?? ''
  if (!cifraOk(target)) {
    return new Response(null, { status: 400, headers: corsHeaders(origin) })
  }
  try {
    const html = await loadCifraClubHtml(target)
    if (!html) return new Response(null, { status: 502, headers: corsHeaders(origin) })
    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders(origin),
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch {
    return new Response(null, { status: 502, headers: corsHeaders(origin) })
  }
}

export const onRequestOptions: PagesFunction = async (context) =>
  new Response(null, { status: 204, headers: corsHeaders(context.request.headers.get('Origin')) })
