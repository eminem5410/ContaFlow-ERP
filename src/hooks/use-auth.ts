'use client'

import { useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api, setTokens, clearTokens, isBackendConfigured } from '@/lib/api'
import { useAppStore } from '@/lib/store'

interface LoginResult {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    name: string
    email: string
    role: string
    roleId: string | null
    companyId: string
  }
  company: {
    id: string
    name: string
    cuit?: string
  }
}

/**
 * Hook unificado de autenticación que soporta tanto el backend .NET
 * como las API routes locales de Next.js.
 *
 * - Si el backend está configurado, usa /api/proxy/api/auth/...
 * - Si no, usa /api/auth/... local (Prisma + jose)
 * - Normaliza la respuesta en ambos casos
 */
export function useAuth() {
  const login = useAppStore((s) => s.login)
  const logout = useAppStore((s) => s.logout)
  const backendAvailable = isBackendConfigured()

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }): Promise<LoginResult> => {
      // Route: backend or local
      const loginPath = backendAvailable ? '/api/proxy/api/auth/login' : '/api/auth/login'

      const res = await fetch(loginPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Error al iniciar sesión')
      }

      // Normalize response from either backend
      // .NET backend returns: { success, data: { token, refreshToken, user } }
      // Local Next.js returns: { accessToken, refreshToken, user, company }
      if (data.success && data.data) {
        const backendData = data.data
        return {
          accessToken: backendData.token || backendData.accessToken,
          refreshToken: backendData.refreshToken,
          user: {
            id: backendData.user?.id,
            name: backendData.user?.name,
            email: backendData.user?.email,
            role: backendData.user?.role,
            roleId: backendData.user?.roleId,
            companyId: backendData.user?.companyId,
          },
          company: backendData.company || {
            id: backendData.user?.companyId,
            name: backendData.user?.companyName || 'Mi Empresa',
          },
        }
      }

      // Local Next.js format
      return {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
        company: data.company,
      }
    },
    onSuccess: (result) => {
      setTokens(result.accessToken, result.refreshToken)
      login(
        {
          ...result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
        result.company
      )
    },
  })

  const registerMutation = useMutation({
    mutationFn: async (data: {
      name: string
      email: string
      password: string
      companyName: string
      cuit?: string
    }): Promise<LoginResult> => {
      const registerPath = backendAvailable ? '/api/proxy/api/auth/register' : '/api/auth/register'

      const res = await fetch(registerPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.message || result.error || 'Error al registrar')
      }

      // Same normalization as login
      if (result.success && result.data) {
        const backendData = result.data
        return {
          accessToken: backendData.token || backendData.accessToken,
          refreshToken: backendData.refreshToken,
          user: {
            id: backendData.user?.id,
            name: backendData.user?.name,
            email: backendData.user?.email,
            role: backendData.user?.role,
            roleId: backendData.user?.roleId,
            companyId: backendData.user?.companyId,
          },
          company: backendData.company || {
            id: backendData.user?.companyId,
            name: backendData.user?.companyName || data.companyName,
          },
        }
      }

      return {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
        company: result.company,
      }
    },
    onSuccess: (result) => {
      setTokens(result.accessToken, result.refreshToken)
      login(
        {
          ...result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
        result.company
      )
    },
  })

  const handleLogout = useCallback(() => {
    clearTokens()
    logout()
  }, [logout])

  return {
    loginMutation,
    registerMutation,
    logout: handleLogout,
    backendAvailable,
  }
}
