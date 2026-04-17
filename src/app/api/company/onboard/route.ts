import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, cuit, email, phone, address, ivaCondition } = body
    const companyId = body.companyId

    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 })
    }

    const company = await db.company.findUnique({ where: { id: companyId } })
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    const updated = await db.company.update({
      where: { id: companyId },
      data: {
        ...(name ? { name } : {}),
        ...(cuit ? { cuit } : {}),
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
        ...(address ? { address } : {}),
      },
    })

    return NextResponse.json({ company: updated })
  } catch (error) {
    console.error("Onboard error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
