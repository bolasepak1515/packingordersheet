import type { JobOrder } from '@/types'

const AUTH = btoa(import.meta.env.VITE_AUTH)
const HEADERS = {
  Authorization: `Basic ${AUTH}`,
  'X-API-Key': import.meta.env.VITE_API_KEY,
}

const SELECT_FIELDS = [
  'OrderHed_Company', 'OrderHed_OrderDate', 'OrderHed_PONum',
  'OrderHed_OrderNum', 'OrderDtl_OrderLine', 'OrderDtl_PartNum',
  'OrderDtl_LineDesc', 'OrderDtl_OrderQty', 'OrderDtl_IUM',
  'OrderDtl_FS_LotNumber_c', 'OrderDtl_FS_AQLNew_c',
  'OrderDtl_FS_Brand_c', 'OrderDtl_FS_ContainerSize_c',
  'OrderDtl_NeedByDate', 'JobHead_Company', 'JobHead_Plant',
  'JobHead_JobNum', 'JobHead_ProdQty', 'JobHead_IUM',
  'OrderDtl_FS_PcsPerBox_c', 'OrderDtl_FS_BoxPerCarton_c',
  'Calculated_Total_CTN', 'Calculated_PlantPacking',
].join(',')

export interface FetchJobOrdersOptions {
  top?: number | null
  search?: string
  extraParams?: string
}

export async function fetchJobOrders(
  opts: FetchJobOrdersOptions = {},
): Promise<JobOrder[]> {
  const { top = null, search, extraParams } = opts
  const base = import.meta.env.VITE_API_URL
  const sep = base.includes('?') ? '&' : '?'
  const orderby = `$orderby=OrderHed_OrderNum desc,OrderDtl_OrderLine asc`

  const getPage = async (extra: Array<string | undefined>) => {
    const params = [`$select=${SELECT_FIELDS}`, orderby, ...extra.filter((x): x is string => !!x)]
    const res = await fetch(`${base}${sep}${params.join('&')}`, { headers: HEADERS })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    const json = await res.json()
    return json.value ?? []
  }

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
    return getPage([`$filter=${filters.join(' or ')}`, extraParams])
  }

  // Fetch everything: paginate server-side in batches so no rows are lost to
  // a single $top cap (which is what made the table stop at ~124 parents).
  if (top !== null && top > 0) {
    return getPage([`$top=${top}`, extraParams])
  }

  const BATCH = 1000
  const all: JobOrder[] = []
  let skip = 0
  for (;;) {
    const page = await getPage([`$top=${BATCH}`, `$skip=${skip}`, extraParams])
    all.push(...page)
    if (page.length < BATCH) break
    skip += BATCH
    if (skip > 200000) break
  }
  return all
}
