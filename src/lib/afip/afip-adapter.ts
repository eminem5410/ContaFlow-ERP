import type { AfipConfig, AfipInvoiceData, AfipAuthResponse, AfipAuthorization } from "./types"

var AFIP_TIPO_CBTE: Record<string, number> = {
  factura_a: 1,
  factura_b: 6,
  factura_c: 11,
  nota_credito_a: 3,
  nota_credito_b: 8,
  nota_debito_a: 2,
  nota_debito_b: 7,
}

export class AfipAdapter {
  private config: AfipConfig
  private auth: AfipAuthResponse | null = null

  constructor(config: AfipConfig) {
    this.config = config
  }

  private generateCae(): string {
    var digits = Array.from({ length: 14 }, function () { return Math.floor(Math.random() * 10) }).join("")
    return digits
  }

  private getNextNumber(tipoCbte: number, puntoVenta: number): string {
    var compNumber = Math.floor(Math.random() * 9000000) + 1000000
    return String(puntoVenta).padStart(4, "0") + "-" + String(compNumber).padStart(8, "0")
  }

  async authenticate(): Promise<AfipAuthResponse> {
    if (this.config.mode === "demo") {
      this.auth = {
        token: "DEMO_TOKEN_" + Date.now(),
        sign: "DEMO_SIGN_" + Date.now(),
        generationTime: new Date().toISOString(),
        expirationTime: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      }
      return this.auth
    }

    // TODO: Real WSAA authentication
    // 1. Create TRA XML (service = 'wsfe')
    // 2. Sign TRA with private key (.key)
    // 3. Send CMS to https://wsaa.afip.gov.ar/ws/services/LoginCms
    // 4. Parse response for token + sign
    throw new Error("AFIP production authentication not implemented yet. Configure certificate and key.")
  }

  async authorizeInvoice(data: AfipInvoiceData): Promise<AfipAuthorization> {
    if (!this.auth) {
      await this.authenticate()
    }

    var tipoCbteCode = AFIP_TIPO_CBTE[data.tipoCbte]
    if (!tipoCbteCode) {
      throw new Error("Tipo de comprobante no soportado: " + data.tipoCbte)
    }

    if (this.config.mode === "demo") {
      var cae = this.generateCae()
      var tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 10)
      var caeVenc = tomorrow.toISOString().split("T")[0]
      var numero = this.getNextNumber(tipoCbteCode, data.puntoVenta)

      return {
        cae: cae,
        caeVencimiento: caeVenc,
        numeroComprobante: numero,
        fechaProceso: new Date().toISOString(),
        resultado: "A",
        observaciones: [
          "MODO DEMO: CAE generado simuladamente. No es un CAE real de AFIP.",
          "Para obtener un CAE real, configure certificado digital y modo production.",
        ],
        modo: "demo",
      }
    }

    // TODO: Real WSFEv1 call
    // 1. Build FECAESolicitar request XML
    // 2. Send to https://servicios1.afip.gov.ar/wsfev1/service.asmx
    // 3. Parse FECAEResponse for CAE + CAEFchVto
    throw new Error("AFIP production authorization not implemented yet")
  }

  getStatus(): { mode: string; authenticated: boolean } {
    return {
      mode: this.config.mode,
      authenticated: !!this.auth,
    }
  }
}

var instance: AfipAdapter | null = null

export function getAfipAdapter(): AfipAdapter {
  if (!instance) {
    instance = new AfipAdapter({ mode: "demo", puntoVenta: 1 })
  }
  return instance
}
