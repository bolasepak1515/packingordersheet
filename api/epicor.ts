// Vercel edge proxy for the Epicor Kinetic BAQ OData services.
//
// React ──► /api/epicor?baq=…&$orderby=…&$filter=… ──► this function ──► Epicor OData ──► BAQ ──► JSON ──► React
//
// Why a proxy:
//  - Epicor credentials live server-side (EPICOR_AUTH / EPICOR_API_KEY), never in the browser bundle.
//  - The response is always Cache-Control: no-store, so every page load and every
//    "Sync Data" gets the LATEST BAQ result. The BAQ's own results cache is
//    disabled in Epicor (Naz_PackingOrderSheetSummary) — this app does no
//    client-side cache-busting; the proxy just passes the request through.
//
// Required Vercel environment variables:
//  - EPICOR_API_BASE  e.g. https://supermax-pilot.epicorsaas.com/server/api/v2/odata/SGM/BaqSvc/
//  - EPICOR_AUTH      e.g. manager:!Supermax1234
//  - EPICOR_API_KEY   the Epicor OData API key
//
// The `baq` query parameter is validated against a whitelist shape (Naz_*/Data)
// so this function can only ever call the two known BAQ feeds (the Job Order
// Summary and the Packing Material MTL lookup), not arbitrary URLs — no
// open-proxy / SSRF. Remaining query params ($orderby/$filter/$select) are
// forwarded as-is.

export const config = { runtime: 'edge' }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS })
  }

  const base = process.env.EPICOR_API_BASE ?? ''
  const auth = process.env.EPICOR_AUTH ?? ''
  const apiKey = process.env.EPICOR_API_KEY ?? ''
  if (!base || !auth || !apiKey) {
    return new Response(
      'Missing EPICOR_API_BASE / EPICOR_AUTH / EPICOR_API_KEY environment variables on Vercel.',
      { status: 500, headers: CORS },
    )
  }

  const url = new URL(req.url)
  const baq = url.searchParams.get('baq') ?? ''
  if (!/^Naz_[A-Za-z0-9_]+\/Data$/.test(baq)) {
    return new Response('Invalid baq parameter', { status: 400, headers: CORS })
  }

  url.searchParams.delete('baq')
  const upstream = new URL(base + baq)
  upstream.search = url.searchParams.toString()

  const upstreamRes = await fetch(upstream.toString(), {
    headers: {
      Authorization: `Basic ${btoa(auth)}`,
      'X-API-Key': apiKey,
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  // Compress the (potentially multi-MB) BAQ JSON with gzip when the client
  // advertises support. Browsers always do, so the Job Order summary goes over
  // the wire at a fraction of its size; requests without Accept-Encoding get
  // the plain body untouched.
  const supportsGzip = /\bgzip\b/.test(req.headers.get('accept-encoding') ?? '')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    ...CORS,
  }
  let body: BodyInit | null
  if (supportsGzip && upstreamRes.body) {
    headers['Content-Encoding'] = 'gzip'
    headers['Vary'] = 'Accept-Encoding'
    body = upstreamRes.body.pipeThrough(new CompressionStream('gzip'))
  } else {
    body = upstreamRes.body
  }

  return new Response(body, {
    status: upstreamRes.status,
    statusText: upstreamRes.statusText,
    headers,
  })
}
