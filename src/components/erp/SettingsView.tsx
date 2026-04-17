'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Settings, Building2, Save, Loader2, Mail, Bell, Server, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/lib/store'
import { api } from '@/lib/api'
import { useTranslation } from '@/i18n'

interface CompanyData {
  id: string
  name: string
  cuit: string | null
  email: string | null
  phone: string | null
  address: string | null
  plan: string
  logo: string | null
}

interface NotificationPreferences {
  enabled: boolean
  invoiceCreated: boolean
  invoicePaid: boolean
  invoiceStatusChanged: boolean
  paymentReceived: boolean
  welcome: boolean
}

export function SettingsView() {
  const { t } = useTranslation()
  const companyId = useAppStore((s) => s.user?.companyId)

  const { data, isLoading } = useQuery<{ company: CompanyData }>({
    queryKey: ['settings', companyId],
    queryFn: () => api.get('/api/settings', { companyId: companyId! }),
    enabled: !!companyId,
  })

  const company = data?.company

  const defaultForm = {
    name: '',
    cuit: '',
    email: '',
    phone: '',
    address: '',
  }

  const defaultNotifications: NotificationPreferences = {
    enabled: true,
    invoiceCreated: true,
    invoicePaid: true,
    invoiceStatusChanged: false,
    paymentReceived: true,
    welcome: true,
  }

  const [prevCompany, setPrevCompany] = useState<CompanyData | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [notifications, setNotifications] = useState<NotificationPreferences>(defaultNotifications)

  // Sync form when company data loads
  if (company && company !== prevCompany) {
    setPrevCompany(company)
    setForm({
      name: company.name || '',
      cuit: company.cuit || '',
      email: company.email || '',
      phone: company.phone || '',
      address: company.address || '',
    })
  }

  const saveMutation = useMutation({
    mutationFn: (data: typeof form) => api.put('/api/settings', { ...data, companyId }),
    onSuccess: () => {
      toast.success(t('settings.saved'))
    },
    onError: (error: Error) => toast.error(t('common.error'), { description: error.message }),
  })

  const saveNotificationsMutation = useMutation({
    mutationFn: (prefs: NotificationPreferences) =>
      api.put('/api/settings/notifications', { ...prefs, companyId }),
    onSuccess: () => {
      toast.success(t('settings.saved'))
    },
    onError: (error: Error) => toast.error(t('common.error'), { description: error.message }),
  })

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error(t('settings.companyNameRequired'))
      return
    }
    saveMutation.mutate(form)
  }

  const handleSaveNotifications = () => {
    saveNotificationsMutation.mutate(notifications)
  }

  const handleNotificationToggle = (key: keyof NotificationPreferences) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
            <Settings className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{t('settings.title')}</h2>
            <p className="text-sm text-slate-500">{t('settings.subtitle')}</p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('common.saving')}
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {t('common.save')}
            </>
          )}
        </Button>
      </div>

      {/* Plan Badge */}
      {company?.plan && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-medium text-slate-700">{t('settings.currentPlan')}</span>
              </div>
              <span className="text-sm font-semibold text-emerald-700 capitalize">{company.plan}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Data */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4.5 w-4.5 text-slate-500" />
              {t('settings.company')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('settings.businessName')}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('settings.businessNamePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('settings.cuit')}</Label>
              <Input
                value={form.cuit}
                onChange={(e) => setForm({ ...form, cuit: e.target.value })}
                placeholder="30-12345678-9"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('settings.address')}</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Av. Corrientes 1234, CABA"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4.5 w-4.5 text-slate-500" />
              {t('settings.contactInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('settings.email')}</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="empresa@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('settings.phone')}</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+54 11 1234-5678"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Email Notifications Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4.5 w-4.5 text-slate-500" />
              {t('settings.notifications')}
            </CardTitle>
            <CardDescription>{t('settings.notificationsSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Master toggle */}
            <div className="flex items-center justify-between py-2 border-b">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">{t('settings.notificationsEnabled')}</Label>
                <p className="text-xs text-slate-500">{t('settings.notificationsEnabledDesc')}</p>
              </div>
              <Switch
                checked={notifications.enabled}
                onCheckedChange={(checked) => handleNotificationToggle('enabled')}
              />
            </div>

            {/* Individual notification toggles */}
            {[
              { key: 'invoiceCreated' as const, label: 'notifyInvoiceCreated', desc: 'notifyInvoiceCreatedDesc' },
              { key: 'invoicePaid' as const, label: 'notifyInvoicePaid', desc: 'notifyInvoicePaidDesc' },
              { key: 'invoiceStatusChanged' as const, label: 'notifyInvoiceStatusChanged', desc: 'notifyInvoiceStatusChangedDesc' },
              { key: 'paymentReceived' as const, label: 'notifyPaymentReceived', desc: 'notifyPaymentReceivedDesc' },
              { key: 'welcome' as const, label: 'notifyWelcome', desc: 'notifyWelcomeDesc' },
            ].map(({ key, label, desc }) => (
              <div
                key={key}
                className={`flex items-center justify-between py-2 ${
                  !notifications.enabled ? 'opacity-40 pointer-events-none' : ''
                }`}
              >
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">{t(`settings.${label}`)}</Label>
                  <p className="text-xs text-slate-500">{t(`settings.${desc}`)}</p>
                </div>
                <Switch
                  checked={notifications[key]}
                  onCheckedChange={() => handleNotificationToggle(key)}
                  disabled={!notifications.enabled}
                />
              </div>
            ))}

            <Button
              onClick={handleSaveNotifications}
              variant="outline"
              className="w-full mt-2"
              disabled={saveNotificationsMutation.isPending}
            >
              {saveNotificationsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t('common.save')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* SMTP Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-4.5 w-4.5 text-slate-500" />
              {t('settings.smtpConfig')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-slate-50 border p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-slate-500" />
                <span className="font-medium text-slate-700">{t('settings.smtpHost')}</span>
                <span className="ml-auto text-slate-500 font-mono text-xs bg-white px-2 py-1 rounded border">
                  {process.env.NEXT_PUBLIC_SMTP_HOST || 'mailpit'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Server className="h-4 w-4 text-slate-500" />
                <span className="font-medium text-slate-700">{t('settings.smtpPort')}</span>
                <span className="ml-auto text-slate-500 font-mono text-xs bg-white px-2 py-1 rounded border">
                  {process.env.NEXT_PUBLIC_SMTP_PORT || '1025'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="font-medium text-slate-700">{t('settings.smtpFromEmail')}</span>
                <span className="ml-auto text-slate-500 font-mono text-xs bg-white px-2 py-1 rounded border">
                  {process.env.NEXT_PUBLIC_SMTP_FROM_EMAIL || 'noreply@contaflow.com'}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t('settings.smtpNotConfigured')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
