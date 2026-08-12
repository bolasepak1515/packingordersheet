import type { JobOrder, PackingMaterial } from '@/types'

const AUTH = btoa(import.meta.env.VITE_AUTH)
const HEADERS = {
  Authorization: `Basic ${AUTH}`,
  'X-API-Key': import.meta.env.VITE_API_KEY,
}

// Production goes through the Vercel edge proxy (api/epicor.ts) which keeps the
// Epicor credentials server-side and answers with Cache-Control: no-store, so
// Sync Data always fetches the latest BAQ result. Local dev calls Epicor
// directly over CORS so no extra setup is needed there.
const USE_PROXY = import.meta.env.PROD

/** Extract the "Naz_<BaqName>/Data" path segment from a full Epicor feed URL. */
function baqPath(feedUrl: string): string {
  return new URL(feedUrl).pathname.split('/').filter(Boolean).slice(-2).join('/')
}

function epicorUrl(feedUrl: string, params: string[]): string {
  const qs = params.join('&')
  if (USE_PROXY) {
    return `/api/epicor?baq=${encodeURIComponent(baqPath(feedUrl))}${qs ? `&${qs}` : ''}`
  }
  return `${feedUrl}${feedUrl.includes('?') ? '&' : '?'}${qs}`
}

async function odataGet(url: string): Promise<unknown[]> {
  const res = await fetch(url, {
    headers: HEADERS,
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  const json = await res.json()
  return json.value ?? []
}

const ORDERBY = 'OrderHed_OrderNum desc,OrderDtl_OrderLine asc'
const SUMMARY_URL = import.meta.env.VITE_API_URL

// Only the columns the app actually reads — drops the BAQ's unused columns so
// the full Job Order result downloads (and parses) far fewer bytes.
const JOB_FIELDS = [
  'OrderHed_Company',
  'OrderHed_OrderDate',
  'OrderHed_PONum',
  'OrderHed_OrderNum',
  'OrderDtl_OrderLine',
  'OrderDtl_PartNum',
  'OrderDtl_LineDesc',
  'OrderDtl_FS_LotNumber_c',
  'OrderDtl_FS_AQLNew_c',
  'OrderDtl_FS_Brand_c',
  'OrderDtl_IUM',
  'OrderDtl_OrderQty',
  'OrderDtl_FS_ContainerSize_c',
  'OrderDtl_NeedByDate',
  'OrderDtl_FS_PcsPerBox_c',
  'OrderDtl_FS_BoxPerCarton_c',
  'JobHead_Company',
  'JobHead_Plant',
  'JobHead_JobNum',
  'JobHead_ProdQty',
  'JobHead_IUM',
  'Calculated_Total_CTN',
  'Calculated_PlantPacking',
]

/**
 * Fetches the FULL Job Order Summary BAQ result in ONE request and returns all
 * rows. No paging, no $top/$skip, no streaming phases — the complete result set
 * (~1,578 rows, ~1.4MB JSON) arrives in a single response and is sorted and
 * filtered client-side. `search` optionally narrows the request with an OData
 * $filter. Freshness depends on the BAQ's results cache being disabled in
 * Epicor; this app adds no cache-busting on top.
 */
export async function fetchJobOrders(search?: string): Promise<JobOrder[]> {
  const params = [`$orderby=${ORDERBY}`, `$select=${JOB_FIELDS.join(',')}`]
  if (search && search.trim()) {
    const q = search.trim().replace(/'/g, "''")
    const isNum = /^\d+$/.test(q)
    const filters: string[] = [
      `contains(OrderHed_PONum, '${q}')`,
      `contains(OrderDtl_PartNum, '${q}')`,
      `contains(JobHead_JobNum, '${q}')`,
      `contains(OrderDtl_FS_LotNumber_c, '${q}')`,
      `contains(JobHead_Plant, '${q}')`,
      `contains(OrderHed_Company, '${q}')`,
      `contains(OrderDtl_LineDesc, '${q}')`,
    ]
    if (isNum) {
      filters.push(`OrderHed_OrderNum eq ${q}`)
    }
    params.push(`$filter=${filters.join(' or ')}`)
  }
  return odataGet(epicorUrl(SUMMARY_URL, params)) as Promise<JobOrder[]>
}

const MTL_FIELDS = 'JobHead_Plant,Calculated_List_Material'

// Fetches only the MTL records whose JobHead_Plant is required by the Job Order
// Summary data. Unique plants are turned into a single OData $filter (batched
// into a few requests when the filter would get too long) so the entire
// Naz_PackingOrderSheetMTL dataset is never downloaded.
export async function fetchPackingMaterials(plants: string[]): Promise<PackingMaterial[]> {
  const uniq = Array.from(new Set(plants.map((p) => p.trim()).filter(Boolean)))
  if (uniq.length === 0) return []

  const MTL_URL = import.meta.env.VITE_API_URL2
  const BATCH = 20

  // Fire all batched $filter requests in parallel so the MTL lookup finishes as
  // fast as the slowest batch instead of one-after-another.
  const groups: string[] = []
  for (let i = 0; i < uniq.length; i += BATCH) {
    const group = uniq.slice(i, i + BATCH)
    const filter = group
      .map((p) => `JobHead_Plant eq '${p.replace(/'/g, "''")}'`)
      .join(' or ')
    groups.push(epicorUrl(MTL_URL, [`$select=${MTL_FIELDS}`, `$filter=${filter}`]))
  }

  const settled = await Promise.all(groups.map((url) => odataGet(url)))
  return settled.flat() as PackingMaterial[]
}
