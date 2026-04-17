"use client"

import { useState } from "react"
import { useAppStore } from "@/lib/store"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Building2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Rocket,
} from "lucide-react"
import { api } from "@/lib/api"

const STEPS = [
  { id: "welcome", title: "Bienvenido a ContaFlow", icon: Rocket },
  { id: "company", title: "Datos de tu Empresa", icon: Building2 },
  { id: "fiscal", title: "Datos Fiscales", icon: CheckCircle2 },
]

const IVA_CONDITIONS = [
  { value: "responsable_inscripto", label: "Responsable Inscripto" },
  { value: "responsable_monotributo", label: "Monotributista" },
  { value: "exento", label: "Exento" },
  { value: "no_responsable", label: "No Responsable" },
  { value: "consumidor_final", label: "Consumidor Final" },
]

export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const company = useAppStore((s) => s.user?.companyId)
  const login = useAppStore((s) => s.login)
  const user = useAppStore((s) => s.user)
  const logout = useAppStore((s) => s.logout)

  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [companyName, setCompanyName] = useState("")
  const [cuit, setCuit] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [ivaCondition, setIvaCondition] = useState("")
  const [address, setAddress] = useState("")

  const currentStep = STEPS[step]

  async function finishOnboarding() {
    setLoading(true)
    try {
      const res: any = await api.put("/api/company/onboard", {
        companyId: company,
        name: companyName,
        cuit: cuit || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        ivaCondition: ivaCondition || null,
      })

      if (res.company) {
        login(user!, res.company)
      }

      localStorage.setItem("erp_onboarded", "true")
      toast.success("Configuracion completada. Bienvenido a ContaFlow!")
      onComplete()
    } catch (error) {
      toast.error("Error al guardar. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  function skipOnboarding() {
    localStorage.setItem("erp_onboarded", "true")
    toast.info("Podras completar la configuracion desde Ajustes.")
  }

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">CF</span>
            </div>
            <span className="font-semibold text-slate-800">ContaFlow ERP</span>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map(function (s, i) {
            var StepIcon = s.icon
            return (
              <div key={s.id} className="flex items-center gap-2">
                <div className={["flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium", i <= step ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"].join(" ")}>
                  {i < step ? <CheckCircle2 className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={["w-12 h-0.5", i < step ? "bg-blue-600" : "bg-slate-200"].join(" ")} />
                )}
              </div>
            )
          })}
        </div>

        {/* Step Content */}
        <Card className="shadow-xl border-slate-200">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">{currentStep.title}</CardTitle>
            <CardDescription>
              {step === 0 && "Configura tu empresa en 3 simples pasos"}
              {step === 1 && "Contanos sobre tu negocio"}
              {step === 2 && "Datos para facturacion electronica"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 0 && (
              <div className="text-center space-y-4">
                <p className="text-slate-600 text-sm leading-relaxed">
                  ContaFlow te ayuda a gestionar la contabilidad de tu empresa
                  de forma simple y profesional. Vamos a configurar los datos
                  basicos para empezar a trabajar.
                </p>
                <div className="flex justify-center gap-8 text-center">
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-blue-600">3</div>
                    <div className="text-xs text-slate-500">Pasos</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-emerald-600">2m</div>
                    <div className="text-xs text-slate-500">Duracion</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-purple-600">100%</div>
                    <div className="text-xs text-slate-500">Gratuito</div>
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nombre de la empresa *</Label>
                  <Input id="companyName" placeholder="Mi Empresa S.R.L." value={companyName} onChange={function (e) { setCompanyName(e.target.value) }} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="contacto@empresa.com" value={email} onChange={function (e) { setEmail(e.target.value) }} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefono</Label>
                    <Input id="phone" placeholder="11 4567-8900" value={phone} onChange={function (e) { setPhone(e.target.value) }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Direccion</Label>
                  <Input id="address" placeholder="Av. Corrientes 1234, CABA" value={address} onChange={function (e) { setAddress(e.target.value) }} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cuit">CUIT</Label>
                  <Input id="cuit" placeholder="20-12345678-9" value={cuit} onChange={function (e) { setCuit(e.target.value) }} />
                  <p className="text-xs text-slate-400">Formato: XX-XXXXXXXX-X (opcional)</p>
                </div>
                <div className="space-y-2">
                  <Label>Condicion frente al IVA</Label>
                  <Select value={ivaCondition} onValueChange={setIvaCondition}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una opcion" />
                    </SelectTrigger>
                    <SelectContent className="z-[200]">
                      {IVA_CONDITIONS.map(function (c) {
                        return (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
                  Estos datos son necesarios para la facturacion electronica con AFIP.
                  Podras modificarlos en cualquier momento desde Ajustes.
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <div>
                {step > 0 && (
                  <Button variant="ghost" size="sm" onClick={function () { setStep(step - 1) }}>
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Atras
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                {step < STEPS.length - 1 && (
                  <Button variant="ghost" size="sm" onClick={skipOnboarding}>
                    Omitir
                  </Button>
                )}
                {step < STEPS.length - 1 ? (
                  <Button disabled={step === 1 && !companyName} onClick={function () { setStep(step + 1) }}>
                    Siguiente
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button disabled={loading} onClick={finishOnboarding}>
                    {loading ? "Guardando..." : "Comenzar a usar ContaFlow"}
                    <Rocket className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
