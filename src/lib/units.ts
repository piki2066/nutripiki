import type { Units } from '@/db/types'

export const KG_TO_LB = 2.20462
export const CM_TO_IN = 0.393701
export const ML_TO_FLOZ = 0.033814

export function kgToDisplay(kg: number, units: Units): number {
  return units === 'imperial' ? kg * KG_TO_LB : kg
}
export function displayToKg(v: number, units: Units): number {
  return units === 'imperial' ? v / KG_TO_LB : v
}
export function weightUnit(units: Units): string {
  return units === 'imperial' ? 'lb' : 'kg'
}

export function cmToDisplay(cm: number, units: Units): number {
  return units === 'imperial' ? cm * CM_TO_IN : cm
}
export function displayToCm(v: number, units: Units): number {
  return units === 'imperial' ? v / CM_TO_IN : v
}
export function lengthUnit(units: Units): string {
  return units === 'imperial' ? 'in' : 'cm'
}

/** Altura imperial: cm -> { ft, in }. */
export function cmToFtIn(cm: number): { ft: number; in: number } {
  const totalIn = cm * CM_TO_IN
  const ft = Math.floor(totalIn / 12)
  const inch = Math.round(totalIn - ft * 12)
  return { ft, in: inch }
}
export function ftInToCm(ft: number, inch: number): number {
  return (ft * 12 + inch) / CM_TO_IN
}

export function mlToDisplay(ml: number, units: Units): number {
  return units === 'imperial' ? ml * ML_TO_FLOZ : ml
}
export function volumeUnit(units: Units): string {
  return units === 'imperial' ? 'fl oz' : 'ml'
}
