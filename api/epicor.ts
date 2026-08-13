// Vercel serverless proxy for the Epicor Kinetic BAQ OData services.
//
// React ──► /api/epicor?baq=…&$orderby=…&$filter=… ──► this function ──► Epicor OData ──► BAQ ──► JSON ──► React
//
// Why a proxy:
//  - Epicor credentials live server-side (EPICOR_AUTH / EPICOR_API_KEY), never in the browser bundle.
//  - Epicor's Naz_PackingOrderSheetSummary BAQ takes ~32s to compute (its own
//    results cache is disabled in Epicor), so the CDN caches the JSON for 10
//    minutes. After the first sync, subsequent Sync Data requests are served
//    from the CDN in ~1s; only the first sync after a 10-minute gap pays the
//    full Epicor compute time. The app's IndexedDB cache makes F5 instant too.
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
//
// Runs on the Node.js runtime (NOT Edge): Vercel Edge functions are hard-capped
// at 25s and ignore maxDuration, but Epicor's Naz_PackingOrderSheetSummary BAQ
// takes ~32s. The 300s budget is set in vercel.json's `functions` block, which
// only applies to Node.js serverless functions. Named method exports (GET /
// OPTIONS) are used because the Node runtime treats a default export as the
// classic (req, res) signature and would ignore the returned Response.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS })
}

export async function GET(req: Request): Promise<Response> {
  const base = process.env.EPICOR_API_BASE ?? ''
  const auth = process.env.EPICOR_AUTH ?? ''
  const apiKey = process.env.EPICOR_API_KEY ?? ''
  if (!base || !auth || !apiKey) {
    return new Response(
      'Missing EPICOR_API_BASE / EPICOR_AUTH / EPICOR_API_KEY environment variables on Vercel.',
      { status: 500, headers: CORS },
    )
  }

  const url = new URL(req.url, 'http://localhost')
  const baq = url.searchParams.get('baq') ?? ''
  if (!/^Naz_[A-Za-z0-9_]+\/Data$/.test(baq)) {
    return new Response('Invalid baq parameter', { status: 400, headers: CORS })
  }

  // Strip only the `baq` param and pass the remaining raw query through
  // byte-for-byte. Round-tripping through URLSearchParams would re-encode the
  // `$orderby`/`$filter` operators (%24…) and spaces as `+`, which Epicor's BAQ
  // endpoint can reject. Keeping the browser's exact encoding (%20, literal $)
  // is the safest thing to send upstream.
  const upstream = new URL(base + baq)
  upstream.search = url.search.replace(/(^|&)baq=[^&]*/, '').replace(/^&+/, '')

  let upstreamRes: Response
  try {
    upstreamRes = await fetch(upstream.toString(), {
      headers: {
        Authorization: `Basic ${Buffer.from(auth).toString('base64')}`,
        'X-API-Key': apiKey,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })
  } catch (err) {
    console.error('[epicor] upstream request failed:', err)
    return new Response(`Epicor unreachable: ${(err as Error).message}`, {
      status: 502,
      headers: CORS,
    })
  }

  const body = await upstreamRes.text()
  if (!upstreamRes.ok) {
    console.error(`[epicor] upstream ${upstreamRes.status} for ${baq}: ${body.slice(0, 500)}`)
  }
  // CDN-cache the computed BAQ for 10 minutes. Order-sheet data changes rarely,
  // so Sync Data stays ~1s instead of waiting ~35s for Epicor to recompute.
  return new Response(body, {
    status: upstreamRes.status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=1800',
      'CDN-Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800',
      ...CORS,
    },
  })
}
