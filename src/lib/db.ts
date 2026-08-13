import { supabase } from './supabase'
import type { Size, PlantCode, PackingOrderTrans, LoginRow } from '@/types'
import type { TagElement } from '@/components/tagbuilder/types'
import { sanitizeTemplateElements } from '@/components/tagbuilder/sanitize'

export interface TagTemplateRow {
  id: number
  name: string
  elements: TagElement[]
  canvas_width: number
  canvas_height: number
  updated_by: string | null
  updated_at: string
}

// ── Sizes ──
export async function fetchSizes() {
  const { data, error } = await supabase
    .from('sizes')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? []) as Size[]
}

export async function createSize(payload: Partial<Size>) {
  const { error } = await supabase.from('sizes').insert([payload])
  if (error) throw error
}

export async function updateSize(id: number, payload: Partial<Size>) {
  const { error } = await supabase.from('sizes').update(payload).eq('id', id)
  if (error) throw error
}

export async function deleteSize(id: number) {
  const { error } = await supabase.from('sizes').delete().eq('id', id)
  if (error) throw error
}

// ── Plant Codes ──
export async function fetchPlantCodes() {
  const { data, error } = await supabase
    .from('plantcode')
    .select('*')
    .order('plant_code', { ascending: true })
  if (error) throw error
  return (data ?? []) as PlantCode[]
}

export async function createPlantCode(payload: Partial<PlantCode>) {
  const { error } = await supabase.from('plantcode').insert([payload])
  if (error) throw error
}

export async function updatePlantCode(id: number, payload: Partial<PlantCode>) {
  const { error } = await supabase.from('plantcode').update(payload).eq('id', id)
  if (error) throw error
}

export async function deletePlantCode(id: number) {
  const { error } = await supabase.from('plantcode').delete().eq('id', id)
  if (error) throw error
}

// ── Packing Order Trans ──
export async function fetchPackingTrans() {
  const { data, error } = await supabase
    .from('packingordertrans')
    .select('job_num, part, cartonlot, startpallet, endpallet, carton_number')
  if (error) throw error
  return (data ?? []) as Pick<PackingOrderTrans, 'job_num' | 'part' | 'cartonlot' | 'startpallet' | 'endpallet' | 'carton_number'>[]
}

export async function fetchPackingTransByJob(jobNum: string, part: string) {
  const { data, error } = await supabase
    .from('packingordertrans')
    .select('cartonlot, startpallet, carton_number')
    .eq('job_num', jobNum)
    .eq('part', part)
    .order('id', { ascending: true })
    .limit(1)
  if (error) throw error
  return (data ?? []) as Pick<PackingOrderTrans, 'cartonlot' | 'startpallet' | 'carton_number'>[]
}

export async function insertPackingTrans(payload: Partial<PackingOrderTrans>) {
  const { error } = await supabase.from('packingordertrans').insert(payload)
  if (error) throw error
}

export async function updatePackingTrans(
  jobNum: string,
  part: string,
  payload: Partial<PackingOrderTrans>,
) {
  const { error } = await supabase
    .from('packingordertrans')
    .update(payload)
    .eq('job_num', jobNum)
    .eq('part', part)
  if (error) throw error
}

// ── Login Users (packinglogin) ──
export async function fetchLoginUsers() {
  const { data, error } = await supabase
    .from('packinglogin')
    .select('*')
    .order('username', { ascending: true })
  if (error) throw error
  return (data ?? []) as LoginRow[]
}

export async function createLoginUser(payload: Partial<LoginRow>) {
  const { error } = await supabase.from('packinglogin').insert([payload])
  if (error) throw error
}

export async function updateLoginUser(id: number, payload: Partial<LoginRow>) {
  const { error } = await supabase.from('packinglogin').update(payload).eq('id', id)
  if (error) throw error
}

export async function deleteLoginUser(id: number) {
  const { error } = await supabase.from('packinglogin').delete().eq('id', id)
  if (error) throw error
}

// ── Lookups ──
export async function fetchSizeLookup() {
  const { data, error } = await supabase
    .from('sizes')
    .select('size_name, size_code')
  if (error) throw error
  return data ?? []
}

// ── Tag Template (single-row, used by PDF generation) ──
export async function fetchTagTemplate(): Promise<TagTemplateRow | null> {
  const { data, error } = await supabase
    .from('tag_template')
    .select('*')
    .eq('id', 1)
    .maybeSingle()
  if (error) throw error
  const row = (data as TagTemplateRow | null) ?? null
  if (!row) return null
  return { ...row, elements: sanitizeTemplateElements(row.elements) }
}

export async function saveTagTemplate(
  elements: TagElement[],
  canvasWidth: number,
  canvasHeight: number,
  updatedBy?: string,
): Promise<TagTemplateRow> {
  const cw = Math.round(canvasWidth)
  const ch = Math.round(canvasHeight)
  const row: TagTemplateRow = {
    id: 1,
    name: 'default',
    elements,
    canvas_width: cw,
    canvas_height: ch,
    updated_by: updatedBy ?? null,
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase
    .from('tag_template')
    .upsert({
      id: 1,
      name: 'default',
      elements: elements as unknown as Record<string, unknown>,
      canvas_width: cw,
      canvas_height: ch,
      updated_by: row.updated_by,
      updated_at: row.updated_at,
    })
  if (error) throw error
  return row
}

// ── Packing Sheet Template (single-row, used by generatePackingSheetPdf) ──
export async function fetchPackingSheetTemplate(): Promise<TagTemplateRow | null> {
  const { data, error } = await supabase
    .from('packing_sheet_template')
    .select('*')
    .eq('id', 1)
    .maybeSingle()
  if (error) throw error
  const row = (data as TagTemplateRow | null) ?? null
  if (!row) return null
  return { ...row, elements: sanitizeTemplateElements(row.elements) }
}

export async function savePackingSheetTemplate(
  elements: TagElement[],
  canvasWidth: number,
  canvasHeight: number,
  updatedBy?: string,
): Promise<TagTemplateRow> {
  const cw = Math.round(canvasWidth)
  const ch = Math.round(canvasHeight)
  const row: TagTemplateRow = {
    id: 1,
    name: 'default',
    elements,
    canvas_width: cw,
    canvas_height: ch,
    updated_by: updatedBy ?? null,
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase
    .from('packing_sheet_template')
    .upsert({
      id: 1,
      name: 'default',
      elements: elements as unknown as Record<string, unknown>,
      canvas_width: cw,
      canvas_height: ch,
      updated_by: row.updated_by,
      updated_at: row.updated_at,
    })
  if (error) throw error
  return row
}
