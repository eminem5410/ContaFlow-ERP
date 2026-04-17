"use client"

import Hero from "@/components/landing/Hero"
import Features from "@/components/landing/Features"
import Modules from "@/components/landing/Modules"
import Pricing from "@/components/landing/Pricing"
import Footer from "@/components/landing/Footer"

interface LandingPageProps {
  onLoginClick?: () => void
}

export default function LandingPage({ onLoginClick }: LandingPageProps) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Minimal Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/landing" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
              CF
            </div>
            <span className="text-xl font-bold text-slate-900">
              Conta<span className="text-emerald-600">Flow</span>
            </span>
          </a>

          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-emerald-600"
            >
              Caracteristicas
            </a>
            <a
              href="#modules"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-emerald-600"
            >
              Modulos
            </a>
            <a
              href="#pricing"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-emerald-600"
            >
              Precios
            </a>
          </nav>

          <button
            onClick={onLoginClick}
            className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
          >
            Iniciar sesion
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Hero onLoginClick={onLoginClick} />
        <Features />
        <Modules />
        <Pricing />
      </main>

      <Footer />
    </div>
  )
}
