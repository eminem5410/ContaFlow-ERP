'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Eye, EyeOff, Building2, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/hooks/use-auth'
import { useTranslation } from '@/i18n'

interface AuthScreenProps {
  onBack?: () => void
}

export function AuthScreen({ onBack }: AuthScreenProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const { loginMutation, registerMutation } = useAuth()

  const [loginForm, setLoginForm] = useState({
    email: 'admin@empresademo.com.ar',
    password: 'admin123',
  })

  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
    cuit: '',
  })

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    loginMutation.mutate({ email: loginForm.email, password: loginForm.password }, {
      onSuccess: (data) => {
        toast.success(t('auth.welcome'), { description: `${data.user.name} — ${data.company?.name || ''}` })
      },
      onError: (error: Error) => {
        toast.error(t('auth.invalidCredentials'), { description: error.message })
      },
    })
  }

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    if (!registerForm.name || !registerForm.email || !registerForm.password || !registerForm.companyName) {
      toast.error(t('auth.welcome'))
      return
    }
    registerMutation.mutate(registerForm, {
      onSuccess: () => {
        toast.success(t('auth.registerButton'), { description: '' })
      },
      onError: (error: Error) => {
        toast.error(t('auth.userExists'), { description: error.message })
      },
    })
  }

  const isLoading = loginMutation.isPending || registerMutation.isPending

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Back to landing button */}
        {onBack && (
          <button
            onClick={onBack}
            className="absolute -top-12 left-0 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('auth.goToLanding')}
          </button>
        )}

        <Card className="border-slate-700/50 bg-white/95 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center pb-2">
            <motion.div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-600 shadow-lg shadow-emerald-500/25"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Building2 className="h-7 w-7 text-white" />
            </motion.div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
              ContaFlow
            </CardTitle>
            <CardDescription className="text-slate-500">
              {t('auth.subtitle')}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            <div className="flex rounded-lg bg-slate-100 p-1 mb-6">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t('auth.login')}
              </button>
              <button
                onClick={() => setMode('register')}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                  mode === 'register'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t('auth.register')}
              </button>
            </div>

            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">{t('auth.email')}</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="admin@empresa.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">{t('auth.password')}</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('common.loading')}...
                    </>
                  ) : (
                    <>
                      {t('auth.loginButton')}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">{t('auth.register')} *</Label>
                  <Input
                    id="reg-name"
                    placeholder="Juan Perez"
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">{t('auth.email')} *</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="juan@empresa.com"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">{t('auth.password')} *</Label>
                  <div className="relative">
                    <Input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 6 caracteres"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Separator className="my-2" />
                <div className="space-y-2">
                  <Label htmlFor="reg-company">{t('auth.company')} *</Label>
                  <Input
                    id="reg-company"
                    placeholder="Mi Empresa S.R.L."
                    value={registerForm.companyName}
                    onChange={(e) => setRegisterForm({ ...registerForm, companyName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-cuit">{t('auth.cuit')}</Label>
                  <Input
                    id="reg-cuit"
                    placeholder="30-12345678-9"
                    value={registerForm.cuit}
                    onChange={(e) => setRegisterForm({ ...registerForm, cuit: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('common.loading')}...
                    </>
                  ) : (
                    <>
                      {t('auth.registerButton')}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="justify-center border-t pt-4 pb-4">
            <p className="text-xs text-slate-400">
              {mode === 'login'
                ? 'Demo: admin@empresademo.com.ar / admin123'
                : 'ContaFlow ERP'}
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}
