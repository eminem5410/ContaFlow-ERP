'use client'

import { useState, useEffect, useCallback } from 'react'
import backendClient from '@/lib/backend-client'

interface BackendResponse<T> {
  success: boolean
  data?: T
  message?: string
  errorCode?: string
  errors?: string[]
}

/**
 * Hook para verificar si el backend .NET está disponible.
 * Realiza un health check al montar el componente.
 */
export function useBackendHealth() {
  const [isAvailable, setIsAvailable] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (!backendClient.isAvailable) {
      setIsAvailable(false)
      setIsChecking(false)
      return
    }

    backendClient.healthCheck().then((healthy) => {
      setIsAvailable(healthy)
      setIsChecking(false)
    }).catch(() => {
      setIsAvailable(false)
      setIsChecking(false)
    })
  }, [])

  return { isAvailable, isChecking }
}

/**
 * Hook para realizar llamadas al backend con gestión de estado loading/error.
 */
export function useBackendQuery<T>(path: string, params?: Record<string, string | number | boolean | undefined>) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const response = await backendClient.get<T>(path, params) as BackendResponse<T>

    if (response.success) {
      setData(response.data ?? null)
    } else {
      setError(response.message || 'Error desconocido')
    }
    setIsLoading(false)
  }, [path, JSON.stringify(params)])

  useEffect(() => {
    if (!backendClient.isAvailable) {
      setIsLoading(false)
      setError('Backend no configurado')
      return
    }
    refetch()
  }, [refetch])

  return { data, isLoading, error, refetch }
}
