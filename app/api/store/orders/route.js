import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Debug log helper
function debugLog(...args) {
    try { console.log('[ORDER API DEBUG]', ...args); } catch {}
}


// Update seller order status
export async function POST(request){
    try {
        const { userId } = getAuth(request)
        const storeId = await authSeller(userId)

        if(!storeId){
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const {orderId, status } = await request.json()

        await prisma.order.update({
            where: { id: orderId, storeId },
            data: {status}
        })

        return NextResponse.json({message: "Order Status updated"})
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}

// Get all orders for a seller
export async function GET(request){
    console.log('[ORDER API ROUTE] Route hit');
    try {
        const { userId } = getAuth(request)
        debugLog('userId from Clerk:', userId);
        const storeId = await authSeller(userId)
        debugLog('storeId from authSeller:', storeId);

        if(!storeId){
            debugLog('Not authorized: no storeId');
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const orders = await prisma.order.findMany({
            where: {storeId},
            include: {user: true, address: true, orderItems: {include: {product: true}}},
            orderBy: {createdAt: 'desc' }
        })
        debugLog('orders found:', orders.length);

        // Enrich orders with user data from Clerk if not in database
        const enrichedOrders = await Promise.all(
            orders.map(async (order) => {
                // If user exists but name/email is missing, fetch from Clerk
                if (order.user && (!order.user.name || !order.user.email) && order.userId) {
                    try {
                        const clerkUser = await clerkClient.users.getUser(order.userId);
                        const primaryEmail = clerkUser.emailAddresses?.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress;
                        
                        if (primaryEmail || clerkUser.firstName || clerkUser.lastName) {
                            order.user = {
                                ...order.user,
                                name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || order.user.name,
                                email: primaryEmail || order.user.email,
                            };
                            // Update in database for future requests
                            await prisma.user.update({
                                where: { id: order.userId },
                                data: {
                                    name: order.user.name,
                                    email: order.user.email,
                                }
                            }).catch(err => console.error('Failed to update user:', err));
                        }
                    } catch (err) {
                        debugLog('Failed to fetch from Clerk for user:', order.userId, err.message);
                    }
                }
                return order;
            })
        );

        return NextResponse.json({orders: enrichedOrders})
    } catch (error) {
        console.error('[ORDER API ERROR]', error);
        debugLog('API error:', error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}