import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const isAdmin = (request: Request) => request.headers.get('x-admin-mock') === 'true';

export async function PUT(request: Request, context: { params: { id: string } }) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = context.params;

  try {
    const body = await request.json();
    const { name, type, price, stock } = body;

    const updated = await prisma.agriculturalInput.update({
      where: { id },
      data: {
        name,
        type,
        price: price !== undefined ? parseFloat(price) : undefined,
        stock: stock !== undefined ? parseInt(stock, 10) : undefined,
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: { id: string } }) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = context.params;

  try {
    await prisma.agriculturalInput.delete({
      where: { id }
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
