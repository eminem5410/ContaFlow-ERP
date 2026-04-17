import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

/**
 * API proxy catch-all que reenvía solicitudes al backend .NET.
 *
 * Uso: Cualquier request a /api/proxy/* será reenviada al backend .NET.
 * Ejemplo: GET /api/proxy/api/accounts?page=1 → GET http://backend:8080/api/accounts?page=1
 *
 * Se reenvían headers incluyendo Authorization para passthrough de JWT.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, params)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, params)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, params)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, params)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, params)
}

async function proxyRequest(request: NextRequest, paramsPromise: Promise<{ path: string[] }>) {
  const { path } = await paramsPromise
  const backendPath = path.join('/')
  const searchParams = request.nextUrl.searchParams.toString()
  const targetUrl = `${BACKEND_URL}/${backendPath}${searchParams ? `?${searchParams}` : ''}`

  // Reenviar headers relevantes
  const headers = new Headers()
  // Reenviar content-type para POST/PUT
  const contentType = request.headers.get('content-type')
  if (contentType) {
    headers.set('Content-Type', contentType)
  }
  // Reenviar autorización JWT
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    headers.set('Authorization', authHeader)
  }

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    })

    // Determine if the response is JSON before attempting to parse
    const responseContentType = response.headers.get('content-type') || ''
    const isJson = responseContentType.includes('application/json')

    if (!isJson) {
      // Non-JSON response (e.g., HTML error page from .NET)
      if (!response.ok) {
        return NextResponse.json(
          {
            success: false,
            message: `Backend error: ${response.status} ${response.statusText}`,
            errorCode: 'BACKEND_HTTP_ERROR',
          },
          {
            status: response.status,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
      // Successful non-JSON response – pass through as-is
      const body = await response.text()
      return new NextResponse(body, {
        status: response.status,
        headers: { 'Content-Type': responseContentType || 'application/octet-stream' },
      })
    }

    // JSON response – parse and forward
    const data = await response.json().catch(() => null)

    if (!response.ok) {
      // .NET backend returned a non-2xx status. Extract error info from body
      // when available, otherwise fall back to status-based message.
      const errorBody = data && typeof data === 'object' ? data : {}
      return NextResponse.json(
        {
          success: false,
          message:
            errorBody.message ||
            errorBody.error ||
            `Backend error: ${response.status} ${response.statusText}`,
          errorCode: errorBody.errorCode || 'BACKEND_HTTP_ERROR',
          errors: errorBody.errors,
        },
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: `Error de conexión con el backend: ${error instanceof Error ? error.message : 'Desconocido'}`,
        errorCode: 'BACKEND_CONNECTION_ERROR',
      },
      { status: 502 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
