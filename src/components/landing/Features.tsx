import {
  Receipt,
  BookOpen,
  BarChart3,
  Users,
  Globe,
  ShieldCheck,
} from "lucide-react"

const features = [
  {
    icon: Receipt,
    title: "Facturacion AFIP",
    description:
      "Emite facturas electronicas con certificado AFIP. Soporte para todos los tipos de comprobante: A, B, C, M, y notas de credito/debito.",
  },
  {
    icon: BookOpen,
    title: "Plan de Cuentas",
    description:
      "Define tu estructura contable con cuentas a multiples niveles. Importa desde plantillas predefinidas o personaliza segun tus necesidades.",
  },
  {
    icon: BarChart3,
    title: "Reportes Avanzados",
    description:
      "Genera balances, libros IVA, libro diario y mayor con un clic. Exporta a Excel o PDF con formato profesional.",
  },
  {
    icon: Users,
    title: "Multi-Empresa",
    description:
      "Gestiona varias empresas desde una sola cuenta. Cambia entre organizaciones sin cerrar sesion con nuestro selector inteligente.",
  },
  {
    icon: Globe,
    title: "Multi-Idioma",
    description:
      "Interfaz disponible en espanol, ingles y portugues. Cambia el idioma en cualquier momento desde tu configuracion personal.",
  },
  {
    icon: ShieldCheck,
    title: "Roles y Permisos",
    description:
      "Controla el acceso de cada usuario por modulo y accion. Define roles personalizados para contadores, administradores y colaboradores.",
  },
]

export default function Features() {
  return (
    <section id="features" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">
            Caracteristicas
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Todo lo que necesitas para gestionar{" "}
            <span className="text-emerald-600">tu contabilidad</span>
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            Funcionalidades disenadas especificamente para las necesidades
            contables y fiscales de PyMEs argentinas.
          </p>
        </div>

        {/* Feature cards */}
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="group relative rounded-2xl border border-slate-100 bg-white p-6 transition-all duration-200 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50"
              >
                {/* Icon */}
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-100">
                  <Icon className="h-6 w-6" />
                </div>

                <h3 className="text-lg font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
