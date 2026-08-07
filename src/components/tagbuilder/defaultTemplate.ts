import type { TagElement } from './types'

let _id = 0
function id() { return `el_${++_id}` }

const W = 300
const M = 11
const X = M
const R = W - M
const C = W / 2
const LBL = 11
const VAL = 15
const BC_H = 28
const BC_T = 14
const HR = 1
const HR2 = 2

function hr(top: number): TagElement {
  return { id: id(), type: 'line', x: X, y: top, width: W - X * 2, height: HR2, rotation: 0, lineOrientation: 'horizontal', lineThickness: HR2, lineColor: '#000', opacity: 1 }
}
function hrThin(top: number): TagElement {
  return { id: id(), type: 'line', x: X, y: top, width: W - X * 2, height: HR, rotation: 0, lineOrientation: 'horizontal', lineThickness: HR, lineColor: '#000000', opacity: 1 }
}
function lbl(top: number, text: string, w = 120): TagElement {
  return { id: id(), type: 'text', x: X, y: top, width: w, height: 14, rotation: 0, text, fontSize: LBL, fontFamily: 'Arial', fontWeight: 'bold', textAlign: 'left', color: '#000000', opacity: 1 }
}
function val(top: number, text: string, w = 250): TagElement {
  return { id: id(), type: 'text', x: X, y: top, width: w, height: 20, rotation: 0, text, fontSize: VAL, fontFamily: 'Arial', textAlign: 'left', color: '#000000', opacity: 1 }
}
function barcodeL(top: number, content: string, bw = 180): TagElement {
  return { id: id(), type: 'barcode', x: X, y: top, width: bw, height: BC_H, rotation: 0, barcodeContent: content, barcodeFormat: 'CODE128', opacity: 1 }
}
function barcodeC(top: number, content: string): TagElement {
  return { id: id(), type: 'barcode', x: X + 40, y: top, width: W - X * 2 - 80, height: BC_H, rotation: 0, barcodeContent: content, barcodeFormat: 'CODE128', opacity: 1 }
}
function barcodeText(top: number, text: string): TagElement {
  return { id: id(), type: 'text', x: X, y: top, width: W - X * 2, height: 20, rotation: 0, text, fontSize: BC_T, fontFamily: 'Arial', fontWeight: 'bold', textAlign: 'center', color: '#000000', opacity: 1 }
}

export function getDefaultTemplate(): TagElement[] {
  _id = 0
  let t = 6
  const els: TagElement[] = []

  // ══ Header ══
  els.push(hr(t)); t += 5
  // Left: PALLET ID TAG + plant, Right: size+page
  els.push({ id: id(), type: 'text', x: X, y: t, width: 180, height: 24, rotation: 0, text: 'PALLET ID TAG', fontSize: 18, fontFamily: 'Arial', fontWeight: 'bold', textAlign: 'left', color: '#000000', opacity: 1 })
  els.push({ id: id(), type: 'text', x: R - 60, y: t - 2, width: 60, height: 38, rotation: 0, text: '{size}', fontSize: 36, fontFamily: 'Arial', fontWeight: 'bold', textAlign: 'right', color: '#000000', opacity: 1 })
  t += 24
  els.push({ id: id(), type: 'text', x: X, y: t, width: 150, height: 16, rotation: 0, text: '{plant}', fontSize: 13, fontFamily: 'Arial', textAlign: 'left', color: '#000000', opacity: 1 })
  t += 20
  els.push(hr(t)); t += 5

  // ══ Print date + Pg ══
  els.push({ id: id(), type: 'text', x: X, y: t, width: W - X * 2, height: 16, rotation: 0, text: 'Print Date : {date}     Pg {p}/{total}', fontSize: 11, fontFamily: 'Arial', textAlign: 'left', color: '#000000', opacity: 1 })
  t += 18
  els.push(hrThin(t)); t += 6

  // ══ Job Order ══
  els.push(lbl(t, 'Job Order')); t += 16
  els.push(barcodeL(t, '{jobNum}')); t += BC_H + 2
  els.push({ id: id(), type: 'text', x: X, y: t, width: 180, height: 18, rotation: 0, text: '{jobNum}', fontSize: BC_T, fontFamily: 'Arial', fontWeight: 'bold', textAlign: 'left', color: '#000000', opacity: 1 })
  t += 22

  // ══ Part Number ══
  els.push(lbl(t, 'Part Number')); t += 16
  els.push(val(t, '{partNum}')); t += 24

  // ══ AQL, BRAND, CONTAINER SIZE, NEED BY (stacked, matching PDF) ══
  els.push(lbl(t, 'AQL')); t += 16
  els.push(val(t, '{aql}')); t += 24
  els.push(lbl(t, 'BRAND')); t += 16
  els.push(val(t, '{brand}')); t += 24
  els.push(lbl(t, 'CONTAINER SIZE')); t += 16
  els.push(val(t, '{containerSize}')); t += 24
  els.push(lbl(t, 'NEED BY')); t += 16
  els.push(val(t, '{needBy}')); t += 24

  els.push(hrThin(t)); t += 6

  // ══ Qty / pallet ══
  els.push(lbl(t, 'Qty / pallet')); t += 16
  els.push(val(t, '{pageCartons} CTN | {pageQty} KPCS')); t += 24

  // ══ Qty / lot (optional) ══
  els.push(hrThin(t)); t += 6
  els.push(lbl(t, 'Qty / lot')); t += 16
  els.push({ id: id(), type: 'text', x: X, y: t, width: 120, height: 24, rotation: 0, text: '{lotQty} KPCS', fontSize: VAL, fontFamily: 'Arial', textAlign: 'left', color: '#000000', opacity: 1 })
  els.push({ id: id(), type: 'barcode', x: X + 140, y: t, width: 70, height: 24, rotation: 0, barcodeContent: '{lotQty}', barcodeFormat: 'CODE128', opacity: 1 })
  t += 28

  els.push(hrThin(t)); t += 6

  // ══ LOT NUMBER ══
  els.push(lbl(t, 'LOT NUMBER')); t += 16
  els.push(barcodeC(t, '{lotNo}')); t += BC_H + 4
  els.push(barcodeText(t, '{lotNo}')); t += 22

  els.push(hrThin(t)); t += 6

  // ══ CARTON NUMBER ══
  els.push(lbl(t, 'CARTON NUMBER')); t += 16
  els.push(barcodeC(t, '{cartonRange}')); t += BC_H + 4
  els.push(barcodeText(t, '{cartonRange}')); t += 22

  els.push(hrThin(t)); t += 6

  // ══ CUSTOMER LOT ══
  els.push(lbl(t, 'CUSTOMER LOT')); t += 16
  els.push(barcodeC(t, '{customerLot}')); t += BC_H + 4
  els.push(barcodeText(t, '{customerLotVal}')); t += 22

  els.push(hrThin(t)); t += 6

  // ══ CARTON LOT** ══
  els.push(lbl(t, 'CARTON LOT**')); t += 16
  els.push(barcodeC(t, '{intLot}')); t += BC_H + 4
  els.push(barcodeText(t, '{intLot}')); t += 22

  els.push(hrThin(t)); t += 6

  // ══ QR Code ══
  const qrSize = 113
  const qrX = C - qrSize / 2
  els.push({ id: id(), type: 'qrcode', x: qrX, y: t, width: qrSize, height: qrSize, rotation: 0, qrContent: '{jobInfo}', opacity: 1 })
  t += qrSize + 4
  els.push({ id: id(), type: 'text', x: X, y: t, width: W - X * 2, height: 16, rotation: 0, text: 'Job Information', fontSize: LBL, fontFamily: 'Arial', fontWeight: 'bold', textAlign: 'center', color: '#000000', opacity: 1 })
  t += 20

  return els
}
