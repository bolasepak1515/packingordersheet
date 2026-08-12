// ── Supabase tables ──
export interface Size {
  id: number
  size_name: string
  size_code: string | null
  sort_order: number
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PlantCode {
  id: number
  plant_code: string
  plant_name: string | null
  company: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  running_pallet: string | null
}

export interface PackingOrderTrans {
  id: number
  job_num: string
  part: string
  cartonlot: string
  startpallet: number | null
  endpallet: number | null
  carton_number: string | null
  created_at: string
  updated_at: string
}

// ── Epicor OData ──
export interface JobOrder {
  OrderHed_Company: string
  OrderHed_OrderDate: string | null
  OrderHed_PONum: string
  OrderHed_OrderNum: number
  OrderDtl_OrderLine: number
  OrderDtl_PartNum: string
  OrderDtl_LineDesc: string
  OrderDtl_FS_LotNumber_c: string | null
  OrderDtl_FS_AQLNew_c: string | null
  OrderDtl_FS_Brand_c: string | null
  JobHead_Company: string
  JobHead_Plant: string
  JobHead_JobNum: string
  OrderDtl_IUM: string
  OrderDtl_OrderQty: number
  JobHead_ProdQty: number
  JobHead_IUM: string
  OrderDtl_FS_ContainerSize_c: string | null
  OrderDtl_NeedByDate: string | null
  OrderDtl_FS_PcsPerBox_c: number | null
  OrderDtl_FS_BoxPerCarton_c: number | null
  Calculated_Total_CTN: number | null
  Calculated_PlantPacking: string | null
}

// ── Epicor OData (Naz_PackingOrderSheetMTL) ──
export interface PackingMaterial {
  JobHead_Plant: string
  Calculated_List_Material: string | null
}

// ── Auth ──
export interface LoginRow {
  id: number
  username: string
  role: string
  company: string
  companyname: string | null
  site: string
  password: string
  status: boolean
  last_login: string | null
}

export interface SessionUser {
  username: string
  role: string
  company: string
  companyname: string
  site: string
}

// ── Derived / helpers ──
export interface CartonRange {
  start: number
  end: number
}

export interface PalletInfo {
  startpallet: number
  endpallet: number
}

export interface ParsedLineDesc {
  descName: string
  qtyInner: string
  qtyCarton: string
}

export interface FlashMessage {
  text: string
  type: 'success' | 'error' | 'warning'
}
