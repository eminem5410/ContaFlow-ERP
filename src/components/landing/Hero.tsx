"use client"

import { ArrowRight, Play } from "lucide-react"

interface HeroProps {
  onLoginClick?: () => void
}

export default function Hero({ onLoginClick }: HeroProps) {
  return (
    <section className="relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 animate-gradient-x"
          style={{
            background:
              "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 25%, #f0fdf4 50%, #ccfbf1 75%, #ecfdf5 100%)",
            backgroundSize: "300% 300%",
          }}
        />
        {/* Decorative blobs */}
        <div className="absolute -top-24 right-0 h-96 w-96 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-teal-200/30 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-100/50 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-24 pt-20 sm:px-6 sm:pb-32 sm:pt-28 lg:px-8 lg:pt-36">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Facturacion electronica AFIP integrada
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            El ERP Contable que{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              tu PyME necesita
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
            Gestion completa de facturacion electronica AFIP, libros IVA,
            plan de cuentas, balances y reportes. Todo en una plataforma
            simple, moderna y 100% argentina.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={onLoginClick}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-8 text-base font-semibold text-white shadow-lg shadow-emerald-600/25 transition-all hover:bg-emerald-700 hover:shadow-emerald-600/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              Comenzar gratis
              <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href="#demo"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-8 text-base font-semibold text-slate-700 shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="h-4 w-4" />
              Ver demo
            </a>
          </div>

          {/* Social proof */}
          <div className="mt-14 flex flex-col items-center gap-4">
            <p className="text-sm text-slate-500">
              Utilizado por mas de 500 empresas en Argentina
            </p>
            <div className="flex -space-x-2">
              {[
                "bg-emerald-500",
                "bg-teal-500",
                "bg-cyan-500",
                "bg-slate-400",
                "bg-emerald-400",
              ].map((color, i) => (
                <div
                  key={i}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white ${color}`}
                >
                  {["ME", "LG", "RS", "JV", "AP"][i]}
                </div>
              ))}
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-xs font-semibold text-slate-600">
                +495
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard preview mockup */}
        <div className="mx-auto mt-16 max-w-5xl lg:mt-20">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-amber-400" />
                <div className="h-3 w-3 rounded-full bg-emerald-400" />
              </div>
              <div className="mx-auto h-6 w-72 rounded-md bg-slate-200/60" />
            </div>
            <div className="grid grid-cols-12 gap-0">
              {/* Sidebar mockup */}
              <div className="col-span-3 hidden border-r border-slate-100 bg-slate-50/50 p-4 lg:block">
                <div className="space-y-3">
                  {[
                    "Dashboard",
                    "Plan de Cuentas",
                    "Asientos",
                    "Facturacion",
                    "Reportes",
                  ].map((item) => (
                    <div
                      key={item}
                      className={`h-8 rounded-md px-3 py-1.5 text-sm ${
                        item === "Dashboard"
                          ? "bg-emerald-100 text-emerald-700 font-medium"
                          : "bg-transparent text-slate-400"
                      }`}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              {/* Main content mockup */}
              <div className="col-span-12 p-6 lg:col-span-9">
                <div className="mb-6 h-6 w-48 rounded bg-slate-200" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {[
                    { label: "Ingresos mes", value: "$1.245.000", color: "bg-emerald-100 text-emerald-700" },
                    { label: "Egresos mes", value: "$832.000", color: "bg-red-100 text-red-700" },
                    { label: "Facturas emitidas", value: "47", color: "bg-teal-100 text-teal-700" },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className="rounded-xl border border-slate-100 p-4"
                    >
                      <p className="text-xs text-slate-500">{card.label}</p>
                      <p className={`mt-1 text-xl font-bold ${card.color.split(" ")[1]}`}>
                        {card.value}
                      </p>
                    </div>
                  ))}
                </div>
                {/* Chart placeholder */}
                <div className="mt-6 h-48 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Keyframe styles for gradient animation */}
      <style jsx>{`
        @keyframes gradient-x {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-gradient-x {
          animation: gradient-x 8s ease infinite;
        }
      `}</style>
    </section>
  )
}
