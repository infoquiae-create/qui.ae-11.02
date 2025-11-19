import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { storeId } = await request.json();
    if (!storeId) {
      return NextResponse.json({ error: 'Missing storeId' }, { status: 400 });
    }

    // Delete all orders for this store
    await prisma.order.deleteMany({ where: { storeId } });
    // Delete all products for this store
    await prisma.product.deleteMany({ where: { storeId } });
    // Delete the store itself
    await prisma.store.delete({ where: { id: storeId } });

    return NextResponse.json({ message: 'Store and all related products/orders deleted.' });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to delete store.' }, { status: 500 });
  }
}
