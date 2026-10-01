import { UA, YT_ID, corsHeaders, workerResponse } from './_shared'

/**
 * Same contract as the Vite demo middleware: GET ?id=VIDEO_ID → watch-page HTML
 * so the viewer can read lengthSeconds for `{duration:}` after a Cifra Club import.
 */
export async function handleYoutubeDurationRequest(request: Request): Promise<Response> {
  const origin = request.headers.get('Origin')
  if (request.method === 'OPTIONS') {
    return workerResponse(null, { status: 204, headers: corsHeaders(origin) })
  }
  if (request.method !== 'GET') {
    return workerResponse(null, { status: 405, headers: corsHeaders(origin) })
  }
  const id = new URL(request.url).searchParams.get('id') ?? ''
  if (!YT_ID.test(id)) {
    return workerResponse(null, { status: 400, headers: corsHeaders(origin) })
  }
  try {
    const upstream = await fetch(`https://www.youtube.com/watch?v=${id}`, {
      headers: { 'user-agent': UA },
    })
    const html = await upstream.text()
    return workerResponse(html, {
      status: upstream.ok ? 200 : 502,
      headers: {
        ...corsHeaders(origin),
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch {
    return workerResponse(null, { status: 502, headers: corsHeaders(origin) })
  }
}
