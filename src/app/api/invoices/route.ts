import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAudit } from '@/lib/with-audit';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const companyId = searchParams.get('companyId');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { companyId };

    if (search) {
      where.OR = [
        { number: { contains: search } },
        { client: { name: { contains: search } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where,
        include: {
          client: true,
          _count: { select: { payments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.invoice.count({ where }),
    ]);

    return NextResponse.json({
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withAudit('invoice', 'POST')(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const {
      number,
      type,
      date,
      dueDate,
      notes,
      clientId,
      companyId,
      items,
    } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    if (!type) {
      return NextResponse.json({ error: 'type is required' }, { status: 400 });
    }

    // Auto-generate invoice number if not provided
    let invoiceNumber = number;
    if (!invoiceNumber) {
      const lastInvoice = await db.invoice.findFirst({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        select: { number: true },
      });

      let nextNum = 1;
      if (lastInvoice?.number) {
        const match = lastInvoice.number.match(/(\d+)$/);
        if (match) {
          nextNum = parseInt(match[1]) + 1;
        }
      }
      invoiceNumber = `FAC-${String(nextNum).padStart(4, '0')}`;
    }

    // Process items and calculate totals
    const invoiceItems = Array.isArray(items) ? items : [];
    let netTotal = 0;
    let tax = 0;

    const itemsData = invoiceItems.map((item: {
      description: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
    }) => {
      const quantity = item.quantity ?? 1;
      const unitPrice = item.unitPrice ?? 0;
      const taxRate = item.taxRate ?? 21;
      const subtotal = quantity * unitPrice;
      const taxAmount = subtotal * (taxRate / 100);

      netTotal += subtotal;
      tax += taxAmount;

      return {
        description: item.description,
        quantity,
        unitPrice,
        subtotal,
        taxRate,
        taxAmount,
      };
    });

    const total = netTotal + tax;

    const invoice = await db.invoice.create({
      data: {
        number: invoiceNumber,
        type,
        date: date ? new Date(date) : undefined,
        dueDate: dueDate ? new Date(dueDate) : null,
        total,
        tax,
        netTotal,
        amountPaid: 0,
        status: 'pendiente',
        notes: notes || null,
        clientId: clientId || null,
        companyId,
        items: {
          create: itemsData,
        },
      },
      include: {
        client: true,
        items: true,
        _count: { select: { payments: true } },
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
})
