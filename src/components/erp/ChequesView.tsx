'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  CreditCard,
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FileText,
  Banknote,
  Eye,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useAppStore } from '@/lib/store'
import { api } from '@/lib/api'
import { usePermission } from '@/hooks/use-permission'
import { formatCurrency, formatDate } from '@/lib/formatters'

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface Cheque {
  id: string
  number: string
  bank: string
  branch: string | null
  accountType: string
  chequeType: string
  status: string
  amount: number
  currency: string
  issueDate: string
  paymentDate: string | null
  depositDate: string | null
  clearanceDate: string | null
  rejectionReason: string | null
  endorsee: string | null
  issuerName: string | null
  issuerCuit: string | null
  notes: string | null
  clientId: string | null
  providerId: string | null
  bankAccountId: string | null
  client?: { id: string; name: string } | null
  provider?: { id: string; name: string } | null
  bankAccount?: { id: string; name: string; bank: string } | null
  company?: { id: string; name: string } | null
}

interface ClientOption { id: string; name: string }
interface ProviderOption { id: string; name: string }
interface BankAccountOption { id: string; name: string; bank: string | null }

// ═══════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  en_cartera: { label: 'En Cartera', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  depositado: { label: 'Depositado', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: ArrowDownCircle },
  cobrado: { label: 'Cobrado', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
  rechazado: { label: 'Rechazado', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
  emitido: { label: 'Emitido', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: ArrowUpCircle },
  endosado: { label: 'Endosado', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: RefreshCw },
  anulado: { label: 'Anulado', color: 'bg-slate-100 text-slate-800 border-slate-200', icon: XCircle },
}

const emptyForm = {
  number: '',
  bank: '',
  branch: '',
  accountType: 'cta_corriente',
  chequeType: 'tercero',
  amount: '',
  currency: 'ARS',
  issueDate: new Date().toISOString().split('T')[0],
  paymentDate: '',
  issuerName: '',
  issuerCuit: '',
  clientId: '',
  providerId: '',
  bankAccountId: '',
  notes: '',
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function ChequesView() {
  const companyId = useAppStore((s) => s.user?.companyId)
  const { canCreate, canEdit, canDelete } = usePermission()
  const queryClient = useQueryClient()

  // ── State ──────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')

  // Dialog state
  const [showDialog, setShowDialog] = useState(false)
  const [editingCheque, setEditingCheque] = useState<Cheque | null>(null)
  const [deletingCheque, setDeletingCheque] = useState<Cheque | null>(null)
  const [form, setForm] = useState(emptyForm)

  // Detail sheet state
  const [selectedCheque, setSelectedCheque] = useState<Cheque | null>(null)

  // Action dialogs state
  const [actionDialog, setActionDialog] = useState<{
    type: 'deposit' | 'clear' | 'reject' | 'endorse' | 'cancel'
    cheque: Cheque
  } | null>(null)
  const [actionFormField, setActionFormField] = useState('') // For deposit bankAccountId, reject reason, endorse name

  // ── Queries ────────────────────────────────────────────────────

  const { data, isLoading } = useQuery<{ cheques: Cheque[]; pagination: { total: number } }>({
    queryKey: ['cheques', companyId, search, statusFilter, typeFilter],
    queryFn: () =>
      api.get('/api/cheques', {
        companyId: companyId!,
        search: search || undefined,
        status: statusFilter || undefined,
        chequeType: typeFilter || undefined,
        limit: 100,
      }),
    enabled: !!companyId,
  })

  // Related entities for dialogs
  const { data: clientsData } = useQuery<{ clients: ClientOption[] }>({
    queryKey: ['clients-list', companyId],
    queryFn: () => api.get('/api/clients', { companyId: companyId!, limit: 100 }),
    enabled: !!companyId && showDialog,
  })

  const { data: providersData } = useQuery<{ providers: ProviderOption[] }>({
    queryKey: ['providers-list', companyId],
    queryFn: () => api.get('/api/providers', { companyId: companyId!, limit: 100 }),
    enabled: !!companyId && showDialog,
  })

  const { data: bankAccountsData } = useQuery<{ bankAccounts: BankAccountOption[] }>({
    queryKey: ['bank-accounts-list', companyId],
    queryFn: () => api.get('/api/bank-accounts', { companyId: companyId!, limit: 50 }),
    enabled: !!companyId && (showDialog || !!actionDialog),
  })

  const cheques = data?.cheques || []

  // ── Stats ──────────────────────────────────────────────────────

  const totalEnCartera = cheques
    .filter((c) => c.status === 'en_cartera')
    .reduce((sum, c) => sum + c.amount, 0)

  const totalDepositados = cheques
    .filter((c) => c.status === 'depositado')
    .reduce((sum, c) => sum + c.amount, 0)

  const totalCobrados = cheques
    .filter((c) => c.status === 'cobrado')
    .reduce((sum, c) => sum + c.amount, 0)

  const totalRechazados = cheques
    .filter((c) => c.status === 'rechazado')
    .reduce((sum, c) => sum + c.amount, 0)

  // ── Mutations ─────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: typeof emptyForm) =>
      api.post('/api/cheques', {
        number: data.number,
        bank: data.bank,
        branch: data.branch || null,
        accountType: data.accountType,
        chequeType: data.chequeType,
        amount: parseFloat(data.amount) || 0,
        currency: data.currency || 'ARS',
        issueDate: data.issueDate,
        paymentDate: data.paymentDate || null,
        issuerName: data.issuerName || null,
        issuerCuit: data.issuerCuit || null,
        notes: data.notes || null,
        clientId: data.chequeType === 'tercero' ? (data.clientId || null) : null,
        providerId: data.chequeType === 'propio' ? (data.providerId || null) : null,
        bankAccountId: data.bankAccountId || null,
        companyId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cheques'] })
      toast.success('Cheque creado correctamente')
      closeDialog()
    },
    onError: (error: Error) => toast.error('Error al crear cheque', { description: error.message }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof emptyForm }) =>
      api.put(`/api/cheques/${id}`, {
        number: data.number,
        bank: data.bank,
        branch: data.branch || null,
        accountType: data.accountType,
        paymentDate: data.paymentDate || null,
        issuerName: data.issuerName || null,
        issuerCuit: data.issuerCuit || null,
        notes: data.notes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cheques'] })
      toast.success('Cheque actualizado correctamente')
      closeDialog()
    },
    onError: (error: Error) => toast.error('Error al actualizar cheque', { description: error.message }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/api/cheques/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cheques'] })
      toast.success('Cheque eliminado correctamente')
      setDeletingCheque(null)
      setSelectedCheque(null)
    },
    onError: (error: Error) => toast.error('Error al eliminar cheque', { description: error.message }),
  })

  // Action mutations
  const depositMutation = useMutation({
    mutationFn: ({ id, bankAccountId }: { id: string; bankAccountId: string }) =>
      api.post(`/api/cheques/${id}/deposit`, { bankAccountId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cheques'] })
      toast.success('Cheque depositado correctamente')
      closeActionDialog()
    },
    onError: (error: Error) => toast.error('Error al depositar cheque', { description: error.message }),
  })

  const clearMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/cheques/${id}/clear`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cheques'] })
      toast.success('Cheque acreditado correctamente')
      closeActionDialog()
    },
    onError: (error: Error) => toast.error('Error al acreditar cheque', { description: error.message }),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, rejectionReason }: { id: string; rejectionReason: string }) =>
      api.post(`/api/cheques/${id}/reject`, { rejectionReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cheques'] })
      toast.success('Cheque rechazado')
      closeActionDialog()
    },
    onError: (error: Error) => toast.error('Error al rechazar cheque', { description: error.message }),
  })

  const endorseMutation = useMutation({
    mutationFn: ({ id, endorsee }: { id: string; endorsee: string }) =>
      api.post(`/api/cheques/${id}/endorse`, { endorsee }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cheques'] })
      toast.success('Cheque endosado correctamente')
      closeActionDialog()
    },
    onError: (error: Error) => toast.error('Error al endosar cheque', { description: error.message }),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/cheques/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cheques'] })
      toast.success('Cheque anulado correctamente')
      closeActionDialog()
    },
    onError: (error: Error) => toast.error('Error al anular cheque', { description: error.message }),
  })

  // ── Form handlers ──────────────────────────────────────────────

  const resetForm = () => {
    setForm({ ...emptyForm, issueDate: new Date().toISOString().split('T')[0] })
  }

  const closeDialog = () => {
    setShowDialog(false)
    setEditingCheque(null)
    resetForm()
  }

  const openCreate = () => {
    resetForm()
    setShowDialog(true)
  }

  const openEdit = (cheque: Cheque) => {
    setEditingCheque(cheque)
    setForm({
      number: cheque.number,
      bank: cheque.bank,
      branch: cheque.branch || '',
      accountType: cheque.accountType,
      chequeType: cheque.chequeType,
      amount: String(cheque.amount),
      currency: cheque.currency,
      issueDate: cheque.issueDate ? cheque.issueDate.split('T')[0] : '',
      paymentDate: cheque.paymentDate ? cheque.paymentDate.split('T')[0] : '',
      issuerName: cheque.issuerName || '',
      issuerCuit: cheque.issuerCuit || '',
      clientId: cheque.clientId || '',
      providerId: cheque.providerId || '',
      bankAccountId: cheque.bankAccountId || '',
      notes: cheque.notes || '',
    })
    setShowDialog(true)
  }

  const openActionDialog = (type: 'deposit' | 'clear' | 'reject' | 'endorse' | 'cancel', cheque: Cheque) => {
    setActionDialog({ type, cheque })
    setActionFormField('')
  }

  const closeActionDialog = () => {
    setActionDialog(null)
    setActionFormField('')
  }

  const handleChequeTypeChange = (newType: string) => {
    setForm({
      ...form,
      chequeType: newType,
      clientId: '',
      providerId: '',
    })
  }

  const handleSave = () => {
    if (!form.number.trim()) {
      toast.error('El numero de cheque es obligatorio')
      return
    }
    if (!form.bank.trim()) {
      toast.error('El banco es obligatorio')
      return
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error('El monto debe ser mayor a 0')
      return
    }
    if (!form.issueDate) {
      toast.error('La fecha de emision es obligatoria')
      return
    }

    if (editingCheque) {
      updateMutation.mutate({ id: editingCheque.id, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const handleActionConfirm = () => {
    if (!actionDialog) return
    const { type, cheque } = actionDialog

    switch (type) {
      case 'deposit':
        if (!actionFormField) {
          toast.error('Selecciona una cuenta bancaria para depositar')
          return
        }
        depositMutation.mutate({ id: cheque.id, bankAccountId: actionFormField })
        break
      case 'clear':
        clearMutation.mutate(cheque.id)
        break
      case 'reject':
        if (!actionFormField.trim()) {
          toast.error('Indica el motivo del rechazo')
          return
        }
        rejectMutation.mutate({ id: cheque.id, rejectionReason: actionFormField })
        break
      case 'endorse':
        if (!actionFormField.trim()) {
          toast.error('Indica el nombre del endosatario')
          return
        }
        endorseMutation.mutate({ id: cheque.id, endorsee: actionFormField })
        break
      case 'cancel':
        cancelMutation.mutate(cheque.id)
        break
    }
  }

  // Available actions per status
  const getAvailableActions = (cheque: Cheque) => {
    const actions: { type: 'deposit' | 'clear' | 'reject' | 'endorse' | 'cancel'; label: string; icon: typeof Clock; variant: 'default' | 'destructive' }[] = []

    if (cheque.status === 'en_cartera') {
      actions.push({ type: 'deposit', label: 'Depositar', icon: ArrowDownCircle, variant: 'default' })
      actions.push({ type: 'endorse', label: 'Endosar', icon: RefreshCw, variant: 'default' })
    }
    if (cheque.status === 'depositado') {
      actions.push({ type: 'clear', label: 'Acreditar', icon: CheckCircle2, variant: 'default' })
      actions.push({ type: 'reject', label: 'Rechazar', icon: XCircle, variant: 'destructive' })
    }
    if (cheque.status === 'emitido') {
      actions.push({ type: 'cancel', label: 'Anular', icon: XCircle, variant: 'destructive' })
    }

    return actions
  }

  const isActionPending = depositMutation.isPending || clearMutation.isPending || rejectMutation.isPending || endorseMutation.isPending || cancelMutation.isPending

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ── Stats Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">En Cartera</p>
                <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totalEnCartera)}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {cheques.filter((c) => c.status === 'en_cartera').length} cheques
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-yellow-50 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Depositados</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalDepositados)}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {cheques.filter((c) => c.status === 'depositado').length} cheques
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <ArrowDownCircle className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Cobrados</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalCobrados)}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {cheques.filter((c) => c.status === 'cobrado').length} cheques
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Rechazados</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalRechazados)}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {cheques.filter((c) => c.status === 'rechazado').length} cheques
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-red-50 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Header: Search + Filters + Create ────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por numero, banco, emisor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canCreate('cheques') && (
            <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cheque
            </Button>
          )}
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="en_cartera">En Cartera</SelectItem>
            <SelectItem value="depositado">Depositado</SelectItem>
            <SelectItem value="cobrado">Cobrado</SelectItem>
            <SelectItem value="rechazado">Rechazado</SelectItem>
            <SelectItem value="emitido">Emitido</SelectItem>
            <SelectItem value="endosado">Endosado</SelectItem>
            <SelectItem value="anulado">Anulado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter || 'all'} onValueChange={(v) => setTypeFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="tercero">Tercero</SelectItem>
            <SelectItem value="propio">Propio</SelectItem>
          </SelectContent>
        </Select>
        {(statusFilter || typeFilter) && (
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-500 hover:text-slate-700"
            onClick={() => {
              setStatusFilter('')
              setTypeFilter('')
            }}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* ── Table ────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Nro</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Banco</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Emisor</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Monto</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Emision</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Vencimiento</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider w-28">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : cheques.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400 text-sm">
                      No se encontraron cheques
                    </td>
                  </tr>
                ) : (
                  cheques.map((cheque) => {
                    const status = statusConfig[cheque.status] || statusConfig.en_cartera
                    const actions = getAvailableActions(cheque)
                    return (
                      <tr key={cheque.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                        <td className="px-4 py-3 text-sm font-mono font-medium text-slate-700">{cheque.number}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {cheque.bank}
                          {cheque.branch ? <span className="text-slate-400"> - {cheque.branch}</span> : null}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Badge
                            variant="outline"
                            className={
                              cheque.chequeType === 'propio'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }
                          >
                            {cheque.chequeType === 'propio' ? 'Propio' : 'Tercero'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div>
                            <p className="font-medium text-slate-700">{cheque.issuerName || '-'}</p>
                            <p className="text-xs text-slate-400">{cheque.issuerCuit || ''}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-slate-900">
                          {formatCurrency(cheque.amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">{formatDate(cheque.issueDate)}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{cheque.paymentDate ? formatDate(cheque.paymentDate) : '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className={`text-xs ${status.color}`}>
                            {status.label}
                          </Badge>
                        </td>
                        <td className="px-2 py-3 min-w-[160px]">
                          <div className="flex items-center justify-center gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setSelectedCheque(cheque)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {canEdit('cheques') && (cheque.status === 'en_cartera' || cheque.status === 'emitido') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openEdit(cheque)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {actions.length > 0 && (
                              <div className="relative group/action">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                                  <CreditCard className="h-3.5 w-3.5" />
                                </Button>
                                {/* Dropdown actions */}
                                <div className="absolute right-0 bottom-full z-[9999] w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1 hidden group-hover/action:block">
                                  {actions.map((action) => (
                                    <button
                                      key={action.type}
                                      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-50 transition-colors ${
                                        action.variant === 'destructive' ? 'text-red-600 hover:bg-red-50' : 'text-slate-700'
                                      }`}
                                      onClick={() => openActionDialog(action.type, cheque)}
                                    >
                                      <action.icon className="h-3.5 w-3.5" />
                                      {action.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {canDelete('cheques') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setDeletingCheque(cheque)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          {!isLoading && cheques.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
              <p className="text-sm text-slate-500">
                {cheques.length} cheque{cheques.length !== 1 ? 's' : ''}
              </p>
              <p className="text-sm font-semibold text-slate-700">
                Total: {formatCurrency(cheques.reduce((sum, c) => sum + c.amount, 0))}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* CREATE / EDIT DIALOG                                      */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Dialog open={showDialog} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCheque ? 'Editar Cheque' : 'Nuevo Cheque'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Cheque Type */}
            {!editingCheque && (
              <div className="space-y-2">
                <Label>Tipo de cheque *</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={form.chequeType === 'tercero' ? 'default' : 'outline'}
                    className={
                      form.chequeType === 'tercero'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'border-blue-200 text-blue-700 hover:bg-blue-50'
                    }
                    onClick={() => handleChequeTypeChange('tercero')}
                  >
                    <ArrowDownCircle className="mr-2 h-4 w-4" />
                    Recibido (tercero)
                  </Button>
                  <Button
                    type="button"
                    variant={form.chequeType === 'propio' ? 'default' : 'outline'}
                    className={
                      form.chequeType === 'propio'
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'border-purple-200 text-purple-700 hover:bg-purple-50'
                    }
                    onClick={() => handleChequeTypeChange('propio')}
                  >
                    <ArrowUpCircle className="mr-2 h-4 w-4" />
                    Emitido (propio)
                  </Button>
                </div>
              </div>
            )}

            {/* Number & Bank */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Numero de cheque *</Label>
                <Input
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                  placeholder="00012345"
                />
              </div>
              <div className="space-y-2">
                <Label>Banco *</Label>
                <Input
                  value={form.bank}
                  onChange={(e) => setForm({ ...form, bank: e.target.value })}
                  placeholder="Banco Nacion"
                />
              </div>
            </div>

            {/* Branch & Account Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sucursal</Label>
                <Input
                  value={form.branch}
                  onChange={(e) => setForm({ ...form, branch: e.target.value })}
                  placeholder="Sucursal Microcentro"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de cuenta</Label>
                <Select value={form.accountType} onValueChange={(v) => setForm({ ...form, accountType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cta_corriente">Cuenta Corriente</SelectItem>
                    <SelectItem value="caja_ahorro">Caja de Ahorro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Amount & Currency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARS">Pesos (ARS)</SelectItem>
                    <SelectItem value="USD">Dolares (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha de emision *</Label>
                <Input
                  type="date"
                  value={form.issueDate}
                  onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha de vencimiento (pago)</Label>
                <Input
                  type="date"
                  value={form.paymentDate}
                  onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                />
              </div>
            </div>

            {/* Issuer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre del emisor</Label>
                <Input
                  value={form.issuerName}
                  onChange={(e) => setForm({ ...form, issuerName: e.target.value })}
                  placeholder="Razon Social"
                />
              </div>
              <div className="space-y-2">
                <Label>CUIT del emisor</Label>
                <Input
                  value={form.issuerCuit}
                  onChange={(e) => setForm({ ...form, issuerCuit: e.target.value })}
                  placeholder="30-12345678-9"
                />
              </div>
            </div>

            {/* Client/Provider select */}
            {!editingCheque && form.chequeType === 'tercero' && (
              <div className="space-y-2">
                <Label>Cliente asociado</Label>
                <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientsData?.clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!editingCheque && form.chequeType === 'propio' && (
              <div className="space-y-2">
                <Label>Proveedor asociado</Label>
                <Select value={form.providerId} onValueChange={(v) => setForm({ ...form, providerId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proveedor (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {providersData?.providers?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Bank Account */}
            <div className="space-y-2">
              <Label>Cuenta bancaria</Label>
              <Select value={form.bankAccountId} onValueChange={(v) => setForm({ ...form, bankAccountId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cuenta bancaria (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccountsData?.bankAccounts?.map((ba) => (
                    <SelectItem key={ba.id} value={ba.id}>
                      {ba.name} {ba.bank ? `(${ba.bank})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notas</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Observaciones adicionales..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* DETAIL SHEET                                               */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Sheet open={!!selectedCheque} onOpenChange={(open) => !open && setSelectedCheque(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedCheque && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-emerald-600" />
                  Cheque {selectedCheque.number}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Status badge */}
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={`text-sm px-3 py-1 ${statusConfig[selectedCheque.status]?.color || ''}`}
                  >
                    {statusConfig[selectedCheque.status]?.label || selectedCheque.status}
                  </Badge>
                  <Badge variant="outline" className={
                    selectedCheque.chequeType === 'propio'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }>
                    {selectedCheque.chequeType === 'propio' ? 'Propio' : 'Tercero'}
                  </Badge>
                </div>

                {/* Amount */}
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-emerald-600 mb-1">Monto</p>
                  <p className="text-3xl font-bold text-emerald-700">
                    {formatCurrency(selectedCheque.amount)}
                  </p>
                  <p className="text-xs text-emerald-500 mt-1">{selectedCheque.currency}</p>
                </div>

                {/* Bank info */}
                <div>
                  <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Datos del cheque</h4>
                  <div className="space-y-3">
                    <DetailRow label="Banco" value={`${selectedCheque.bank}${selectedCheque.branch ? ` - ${selectedCheque.branch}` : ''}`} />
                    <DetailRow label="Tipo de cuenta" value={selectedCheque.accountType === 'cta_corriente' ? 'Cuenta Corriente' : 'Caja de Ahorro'} />
                    <DetailRow label="Emisor" value={selectedCheque.issuerName} />
                    <DetailRow label="CUIT emisor" value={selectedCheque.issuerCuit} />
                    {selectedCheque.client && <DetailRow label="Cliente" value={selectedCheque.client.name} />}
                    {selectedCheque.provider && <DetailRow label="Proveedor" value={selectedCheque.provider.name} />}
                    {selectedCheque.bankAccount && <DetailRow label="Cuenta bancaria" value={`${selectedCheque.bankAccount.name} (${selectedCheque.bankAccount.bank})`} />}
                  </div>
                </div>

                <Separator />

                {/* Dates */}
                <div>
                  <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Fechas</h4>
                  <div className="space-y-3">
                    <DetailRow label="Emision" value={formatDate(selectedCheque.issueDate)} />
                    <DetailRow label="Vencimiento" value={selectedCheque.paymentDate ? formatDate(selectedCheque.paymentDate) : null} />
                    {selectedCheque.depositDate && <DetailRow label="Deposito" value={formatDate(selectedCheque.depositDate)} />}
                    {selectedCheque.clearanceDate && <DetailRow label="Acreditacion" value={formatDate(selectedCheque.clearanceDate)} />}
                  </div>
                </div>

                {/* Status timeline */}
                {(selectedCheque.status === 'rechazado' && selectedCheque.rejectionReason) && (
                  <>
                    <Separator />
                    <div className="bg-red-50 rounded-xl p-4">
                      <p className="text-xs font-medium text-red-400 uppercase tracking-wider mb-1">Motivo de rechazo</p>
                      <p className="text-sm text-red-700">{selectedCheque.rejectionReason}</p>
                    </div>
                  </>
                )}

                {(selectedCheque.status === 'endosado' && selectedCheque.endorsee) && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Endoso</h4>
                      <DetailRow label="Endosatario" value={selectedCheque.endorsee} />
                    </div>
                  </>
                )}

                {selectedCheque.notes && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Notas</h4>
                      <p className="text-sm text-slate-600">{selectedCheque.notes}</p>
                    </div>
                  </>
                )}

                {/* Action buttons in detail */}
                {getAvailableActions(selectedCheque).length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Acciones disponibles</h4>
                      <div className="flex flex-wrap gap-2">
                        {getAvailableActions(selectedCheque).map((action) => (
                          <Button
                            key={action.type}
                            variant={action.variant === 'destructive' ? 'destructive' : 'outline'}
                            size="sm"
                            onClick={() => openActionDialog(action.type, selectedCheque)}
                          >
                            <action.icon className="mr-2 h-4 w-4" />
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Edit & Delete buttons */}
                {(canEdit('cheques') && (selectedCheque.status === 'en_cartera' || selectedCheque.status === 'emitido')) && (
                  <>
                    <Separator />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          openEdit(selectedCheque)
                          setSelectedCheque(null)
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      {canDelete('cheques') && (
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={() => {
                            setDeletingCheque(selectedCheque)
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ACTION DIALOG (deposit / clear / reject / endorse / cancel) */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Dialog open={!!actionDialog} onOpenChange={(open) => !open && closeActionDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.type === 'deposit' && 'Depositar Cheque'}
              {actionDialog?.type === 'clear' && 'Acreditar Cheque'}
              {actionDialog?.type === 'reject' && 'Rechazar Cheque'}
              {actionDialog?.type === 'endorse' && 'Endosar Cheque'}
              {actionDialog?.type === 'cancel' && 'Anular Cheque'}
            </DialogTitle>
          </DialogHeader>

          {actionDialog && (
            <>
              {/* Info about the cheque */}
              <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                <p className="text-sm font-medium text-slate-700">
                  {actionDialog.cheque.number} - {actionDialog.cheque.bank}
                </p>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(actionDialog.cheque.amount)}</p>
              </div>

              {/* Dynamic form field based on action */}
              {actionDialog.type === 'deposit' && (
                <div className="space-y-2">
                  <Label>Cuenta bancaria de deposito *</Label>
                  <Select value={actionFormField} onValueChange={setActionFormField}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cuenta bancaria" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccountsData?.bankAccounts?.map((ba) => (
                        <SelectItem key={ba.id} value={ba.id}>
                          {ba.name} {ba.bank ? `(${ba.bank})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {actionDialog.type === 'reject' && (
                <div className="space-y-2">
                  <Label>Motivo del rechazo *</Label>
                  <Input
                    value={actionFormField}
                    onChange={(e) => setActionFormField(e.target.value)}
                    placeholder="Ej: Fondos insuficientes"
                  />
                </div>
              )}

              {actionDialog.type === 'endorse' && (
                <div className="space-y-2">
                  <Label>Nombre del endosatario *</Label>
                  <Input
                    value={actionFormField}
                    onChange={(e) => setActionFormField(e.target.value)}
                    placeholder="Razon social o nombre"
                  />
                </div>
              )}

              {actionDialog.type === 'clear' && (
                <p className="text-sm text-slate-600">
                  Se registrara la acreditacion del cheque en su cuenta. Esta accion no se puede deshacer.
                </p>
              )}

              {actionDialog.type === 'cancel' && (
                <p className="text-sm text-red-600">
                  Se anulara el cheque emitido. Esta accion no se puede deshacer y el cheque quedara marcado como anulado permanentemente.
                </p>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={closeActionDialog}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleActionConfirm}
                  disabled={isActionPending}
                  className={
                    actionDialog.type === 'reject' || actionDialog.type === 'cancel'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }
                >
                  {isActionPending
                    ? 'Procesando...'
                    : actionDialog.type === 'deposit' && 'Depositar'
                    || actionDialog.type === 'clear' && 'Acreditar'
                    || actionDialog.type === 'reject' && 'Rechazar'
                    || actionDialog.type === 'endorse' && 'Endosar'
                    || actionDialog.type === 'cancel' && 'Anular'
                  }
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* DELETE CONFIRMATION                                        */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <AlertDialog open={!!deletingCheque} onOpenChange={(open) => !open && setDeletingCheque(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Cheque</AlertDialogTitle>
            <AlertDialogDescription>
              Estas seguro de que deseas eliminar el cheque{' '}
              <span className="font-semibold">{deletingCheque?.number}</span> de{' '}
              <span className="font-semibold">{deletingCheque?.bank}</span> por{' '}
              <span className="font-semibold">{deletingCheque ? formatCurrency(deletingCheque.amount) : ''}</span>?
              <br />
              <br />
              Solo se pueden eliminar cheques en estado &quot;En Cartera&quot;, &quot;Emitido&quot; o &quot;Anulado&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCheque && deleteMutation.mutate(deletingCheque.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-slate-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-800 text-right">{value || '-'}</span>
    </div>
  )
}
