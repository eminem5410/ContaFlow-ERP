import { describe, it, expect } from 'vitest'
import es from '@/i18n/locales/es.json'
import en from '@/i18n/locales/en.json'
import pt from '@/i18n/locales/pt.json'

describe('i18n', () => {
  describe('locale JSON files structure', () => {
    const expectedTopKeys = [
      'common', 'nav', 'auth', 'dashboard', 'accounts', 'journalEntries',
      'clients', 'providers', 'invoices', 'payments', 'bankAccounts',
      'audit', 'reports', 'users', 'roles', 'settings', 'languages',
    ]

    it('es.json has all expected top-level keys', () => {
      expectedTopKeys.forEach(key => expect(es).toHaveProperty(key))
    })

    it('en.json has all expected top-level keys', () => {
      expectedTopKeys.forEach(key => expect(en).toHaveProperty(key))
    })

    it('pt.json has all expected top-level keys', () => {
      expectedTopKeys.forEach(key => expect(pt).toHaveProperty(key))
    })

    it('all 3 locales have the same top-level keys', () => {
      const esKeys = Object.keys(es).sort()
      const enKeys = Object.keys(en).sort()
      const ptKeys = Object.keys(pt).sort()
      expect(esKeys).toEqual(enKeys)
      expect(esKeys).toEqual(ptKeys)
    })

    it('invoices.types has A, B, C, NC, ND in all locales', () => {
      const typeKeys = ['A', 'B', 'C', 'NC', 'ND']
      typeKeys.forEach(key => {
        expect(es.invoices.types[key]).toBeTruthy()
        expect(en.invoices.types[key]).toBeTruthy()
        expect(pt.invoices.types[key]).toBeTruthy()
      })
    })

    it('common section has all shared UI keys', () => {
      const commonKeys = ['save', 'cancel', 'delete', 'edit', 'search', 'export', 'exportPdf', 'exportExcel']
      commonKeys.forEach(key => {
        expect(es.common[key]).toBeTruthy()
        expect(en.common[key]).toBeTruthy()
        expect(pt.common[key]).toBeTruthy()
      })
    })

    it('es locale has Spanish translations', () => {
      expect(es.common.save).toBe('Guardar')
      expect(es.invoices.types.A).toBe('Factura A')
      expect(es.invoices.types.NC).toBe('Nota de Credito')
    })

    it('en locale has English translations', () => {
      expect(en.common.save).toBe('Save')
      expect(en.invoices.types.A).toBe('Invoice A')
      expect(en.invoices.types.NC).toBe('Credit Note')
    })

    it('pt locale has Portuguese translations', () => {
      expect(pt.common.save).toBe('Salvar')
      expect(pt.invoices.types.A).toBe('Fatura A')
      expect(pt.invoices.types.NC).toBe('Nota de Credito')
    })

    it('audit section has entities and actions in all locales', () => {
      expect(es.audit.entities.journal_entry).toBeTruthy()
      expect(en.audit.entities.journal_entry).toBeTruthy()
      expect(pt.audit.entities.journal_entry).toBeTruthy()
    })

    it('roles section has all permission-related keys', () => {
      const roleKeys = ['title', 'permissions', 'permissionMatrix', 'nameRequired']
      roleKeys.forEach(key => {
        expect(es.roles[key]).toBeTruthy()
        expect(en.roles[key]).toBeTruthy()
        expect(pt.roles[key]).toBeTruthy()
      })
    })
  })
})
