import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, items, totalAmount } = body;

    if (!userId || !items || items.length === 0) {
      return NextResponse.json({ error: 'Missing required order details' }, { status: 400 });
    }

    const order = await prisma.order.create({
      data: {
        userId,
        totalAmount,
        status: "PENDING",
        items: {
          create: items.map((item: any) => ({
            input: { connect: { id: item.id } },
            quantity: item.quantity,
            price: item.price
          }))
        }
      }
    });

    return NextResponse.json({ message: 'Order placed successfully', orderId: order.id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error processing order' }, { status: 500 });
  }
}
