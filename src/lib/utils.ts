import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combina clases de Tailwind dinámicamente.
 * Usa clsx + tailwind-merge para evitar clases conflictivas.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normaliza un número de teléfono.
 * - Elimina espacios, guiones y caracteres no numéricos.
 * - Si empieza con 0 → lo transforma a formato internacional (+591 por defecto).
 * - Retorna null si no es válido.
 */
export function normalizePhone(phone: string, countryCode: string = "+591"): string | null {
  if (!phone) return null
  let cleaned = phone.replace(/\D/g, "")

  if (cleaned.length < 8) return null

  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1)
  }
  if (!cleaned.startsWith(countryCode.replace("+", ""))) {
    cleaned = `${countryCode.replace("+", "")}${cleaned}`
  }
  return `+${cleaned}`
}

/**
 * Calcula el total de un pedido sumando items.
 * Cada item debe tener { quantity, unit_price }.
 */
export function calculateTotalAmount<T extends { quantity: number; unit_price: number }>(
  items: T[]
): number {
  return items.reduce((acc, item) => acc + item.quantity * item.unit_price, 0)
}

/**
 * Parsea un rango de horario de texto a objeto { start, end }.
 * Ejemplo: "14-16" → { start: 14, end: 16 }.
 */
export function parseTimeRange(input: string): { start: number; end: number } | null {
  const match = input.match(/(\d{1,2})\D+(\d{1,2})/)
  if (!match) return null
  const start = parseInt(match[1], 10)
  const end = parseInt(match[2], 10)
  if (isNaN(start) || isNaN(end)) return null
  return { start, end }
}

/**
 * Capitaliza la primera letra de un string.
 */
export function capitalize(str: string): string {
  if (!str) return ""
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Valida si un string parece un correo válido.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}