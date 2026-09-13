import type { PagesFunction } from '@cloudflare/workers-types'
import { UA, cifraOk, corsHeaders } from './_shared'

/**
 * Same contract as the Vite demo middleware: GET ?url=… → HTML from Cifra Club.
 * Browser cannot fetch cifraclub.com.br itself (CORS); this is the host backend.
 */
export const onRequestGet: PagesFunction = async (context) => {
  const origin = context.request.headers.get('Origin')
  const target = new URL(context.request.url).searchParams.get('url') ?? ''
  if (!cifraOk(target)) {
    return new Response(null, { status: 400, headers: corsHeaders(origin) })
  }
  try {
    const upstream = await fetch(target, { headers: { 'user-agent': UA } })
    const html = await upstream.text()
    return new Response(html, {
      status: upstream.ok ? 200 : 502,
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
