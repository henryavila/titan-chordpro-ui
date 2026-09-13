import type { PagesFunction } from '@cloudflare/workers-types'
import { UA, YT_ID, corsHeaders } from './_shared'

/**
 * Same contract as the Vite demo middleware: GET ?id=VIDEO_ID → watch-page HTML
 * so the viewer can read lengthSeconds for `{duration:}` after a Cifra Club import.
 */
export const onRequestGet: PagesFunction = async (context) => {
  const origin = context.request.headers.get('Origin')
  const id = new URL(context.request.url).searchParams.get('id') ?? ''
  if (!YT_ID.test(id)) {
    return new Response(null, { status: 400, headers: corsHeaders(origin) })
  }
  try {
    const upstream = await fetch(`https://www.youtube.com/watch?v=${id}`, {
      headers: { 'user-agent': UA },
    })
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
