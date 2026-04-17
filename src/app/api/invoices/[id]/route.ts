import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAudit } from '@/lib/with-audit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        client: true,
        _count: { select: { payments: true } },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const PUT = withAudit('invoice', 'PUT')(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.invoice.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const { type, date, dueDate, notes, clientId, status, items } = body;

    const updateData: Record<string, unknown> = {};
    if (type !== undefined) updateData.type = type;
    if (date !== undefined) updateData.date = new Date(date);
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (notes !== undefined) updateData.notes = notes || null;
    if (clientId !== undefined) updateData.clientId = clientId || null;
    if (status !== undefined) updateData.status = status;

    // If items array is provided, delete old items and create new ones
    if (Array.isArray(items)) {
      await db.invoiceItem.deleteMany({ where: { invoiceId: id } });

      let netTotal = 0;
      let tax = 0;

      const itemsData = items.map((item: {
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

      updateData.netTotal = netTotal;
      updateData.tax = tax;
      updateData.total = netTotal + tax;
      updateData.items = { create: itemsData };
    }

    const invoice = await db.invoice.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
        client: true,
        _count: { select: { payments: true } },
      },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
})

export const DELETE = withAudit('invoice', 'DELETE')(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;

    const invoice = await db.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.status === 'pagada') {
      return NextResponse.json(
        { error: 'Cannot delete a paid invoice' },
        { status: 400 }
      );
    }

    await db.invoice.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
})
