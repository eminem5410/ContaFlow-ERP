export interface AfipConfig {
  mode: "demo" | "production"
  cert?: string
  key?: string
  cuit?: string
  puntoVenta?: number
}

export interface AfipInvoiceData {
  invoiceId: string
  tipoCbte: string
  puntoVenta: number
  fecha: string
  cliente: {
    documentoTipo: number
    documentoNro: string
    nombreRazonSocial: string
  }
  items: Array<{
    descripcion: string
    cantidad: number
    precioUnitario: number
    ivaAlicuota: number
  }>
  total: number
  netoGravado: number
  iva: number
}

export interface AfipAuthResponse {
  token: string
  sign: string
  generationTime: string
  expirationTime: string
}

export interface AfipAuthorization {
  cae: string
  caeVencimiento: string
  numeroComprobante: string
  fechaProceso: string
  resultado: "A" | "R" | "P"
  observaciones: string[]
  modo: "demo" | "production"
}
