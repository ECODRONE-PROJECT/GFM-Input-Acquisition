import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Basic mock guard wrapper. Replace with real session logic when adding Auth providers.
const isAdmin = (request: Request) => {
  // We'll mock it by looking for an 'x-admin-mock' header for the sake of unit testing without a heavy JWT provider
  return request.headers.get('x-admin-mock') === 'true';
};

export async function GET() {
  try {
    const inputs = await prisma.agriculturalInput.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(inputs);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch inputs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { name, type, price, stock, location, imageUrl, size, weight, brand } = body;

    if (!name || !type || price === undefined || stock === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newInput = await prisma.agriculturalInput.create({
      data: {
        name,
        type,
        price: parseFloat(price),
        stock: parseInt(stock, 10),
        location,
        imageUrl,
        size,
        weight,
        brand
      }
    });

    return NextResponse.json(newInput, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
