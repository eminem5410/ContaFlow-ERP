import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate, getAccountTypeColor, getAccountTypeLabel } from '@/lib/formatters'

describe('formatters', () => {
  describe('formatCurrency', () => {
    it('formats positive numbers as ARS currency', () => {
      const result = formatCurrency(150000)
      expect(result).toContain('150.000')
    })

    it('formats zero as currency', () => {
      const result = formatCurrency(0)
      expect(result).toContain('0')
    })

    it('formats large numbers with thousand separators', () => {
      const result = formatCurrency(12500000)
      expect(result).toContain('12.500.000')
    })

    it('rounds decimals to whole', () => {
      const result = formatCurrency(1500.99)
      expect(result).toContain('1.501')
    })
  })

  describe('formatDate', () => {
    it('formats a valid date string as dd/mm/yyyy', () => {
      const result = formatDate('2025-04-10')
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    })

    it('formats ISO datetime string', () => {
      const result = formatDate('2025-01-05T00:00:00')
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    })
  })

  describe('getAccountTypeColor', () => {
    it('returns emerald for activo', () => expect(getAccountTypeColor('activo')).toContain('emerald'))
    it('returns red for pasivo', () => expect(getAccountTypeColor('pasivo')).toContain('red'))
    it('returns violet for patrimonio', () => expect(getAccountTypeColor('patrimonio')).toContain('violet'))
    it('returns blue for ingreso', () => expect(getAccountTypeColor('ingreso')).toContain('blue'))
    it('returns orange for egreso', () => expect(getAccountTypeColor('egreso')).toContain('orange'))
    it('returns gray for unknown type', () => expect(getAccountTypeColor('unknown')).toContain('gray'))
  })

  describe('getAccountTypeLabel', () => {
    it('returns Activo for activo', () => expect(getAccountTypeLabel('activo')).toBe('Activo'))
    it('returns Pasivo for pasivo', () => expect(getAccountTypeLabel('pasivo')).toBe('Pasivo'))
    it('returns Patrimonio for patrimonio', () => expect(getAccountTypeLabel('patrimonio')).toBe('Patrimonio'))
    it('returns Ingreso for ingreso', () => expect(getAccountTypeLabel('ingreso')).toBe('Ingreso'))
    it('returns Egreso for egreso', () => expect(getAccountTypeLabel('egreso')).toBe('Egreso'))
    it('returns Costo de Venta for costoVenta', () => expect(getAccountTypeLabel('costoVenta')).toBe('Costo de Venta'))
    it('returns type itself for unknown', () => expect(getAccountTypeLabel('unknown')).toBe('unknown'))
  })
})
