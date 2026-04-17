import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAfipAdapter } from "@/lib/afip/afip-adapter"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    var body = await request.json()
    var companyId = body.companyId

    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 })
    }

    var { id } = await params

    var invoice = await db.invoice.findFirst({
      where: { id: id, companyId: companyId },
      include: {
        items: true,
        client: { select: { name: true, cuit: true } },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })
    }

    if (invoice.status === "anulada") {
      return NextResponse.json({ error: "No se puede autorizar una factura anulada" }, { status: 400 })
    }

    var tipoCbte = invoice.type
    var tipoCbteMap: Record<string, string> = {
      factura_a: "factura_a",
      factura_b: "factura_b",
      factura_c: "factura_c",
    }
    tipoCbte = tipoCbteMap[invoice.type] || invoice.type

    var afipData = {
      invoiceId: invoice.id,
      tipoCbte: tipoCbte,
      puntoVenta: 1,
      fecha: invoice.date.toISOString().split("T")[0],
      cliente: {
        documentoTipo: invoice.client && invoice.client.cuit ? 80 : 99,
        documentoNro: (invoice.client && invoice.client.cuit ? invoice.client.cuit : "").replace(/-/g, ""),
        nombreRazonSocial: invoice.client ? invoice.client.name : "Consumidor Final",
      },
      items: invoice.items.map(function (item) {
        return {
          descripcion: item.description,
          cantidad: item.quantity,
          precioUnitario: item.unitPrice,
          ivaAlicuota: item.taxRate,
        }
      }),
      total: invoice.total,
      netoGravado: invoice.netTotal,
      iva: invoice.tax,
    }

    var adapter = getAfipAdapter()
    var authorization = await adapter.authorizeInvoice(afipData)

    return NextResponse.json({
      invoice: {
        id: invoice.id,
        number: invoice.number,
        type: invoice.type,
        total: invoice.total,
      },
      authorization: authorization,
    })
  } catch (error) {
    console.error("AFIP authorization error:", error)
    var message = error instanceof Error ? error.message : "Error al autorizar factura"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
