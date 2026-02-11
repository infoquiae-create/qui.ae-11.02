import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { PaymentMethod } from "@prisma/client";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from 'crypto';


export async function POST(request){
    try {
        const { userId, has } = getAuth(request)
        const { addressId, items, couponCode, paymentMethod, isGuest, guestInfo } = await request.json()

        // Guest checkout validation
        if (isGuest) {
            if (!guestInfo || !guestInfo.name || !guestInfo.email || !guestInfo.phone || !guestInfo.address || !guestInfo.city || !guestInfo.state || !guestInfo.country) {
                return NextResponse.json({ error: "missing guest information" }, { status: 400 });
            }
            if (!paymentMethod || !items || !Array.isArray(items) || items.length === 0) {
                return NextResponse.json({ error: "missing order details." }, { status: 400 });
            }
        } else {
            // Regular user checkout validation
            if(!userId){
                return NextResponse.json({ error: "not authorized" }, { status: 401 });
            }
            // Check if all required fields are present
            if(!addressId || !paymentMethod || !items || !Array.isArray(items) || items.length === 0){
               return NextResponse.json({ error: "missing order details." }, { status: 401 }); 
            }
        }

        let coupon = null;

        if (couponCode) {
        coupon = await prisma.coupon.findUnique({
                    where: {code: couponCode }
                })
                if (!coupon){
            return NextResponse.json({ error: "Coupon not found" }, { status: 400 })
        }
        }
         
            // Check if coupon is applicable for new users
        if(couponCode && coupon.forNewUser){
            const userorders = await prisma.order.findMany({where: {userId}})
            if(userorders.length > 0){
                return NextResponse.json({ error: "Coupon valid for new users" }, { status: 400 })
            }
        }

        const isPlusMember = has({plan: 'plus'})

        // Check if coupon is applicable for members
        if (couponCode && coupon.forMember){
            if(!isPlusMember){
                return NextResponse.json({ error: "Coupon valid for members only" }, { status: 400 })
            }
        }

         // Group orders by storeId using a Map
         const ordersByStore = new Map()
         let grandSubtotal = 0;

         for(const item of items){
            const product = await prisma.product.findUnique({where: {id: item.id}})
            const storeId = product.storeId
            if(!ordersByStore.has(storeId)){
                ordersByStore.set(storeId, [])
            }
            ordersByStore.get(storeId).push({...item, price: product.price})
            grandSubtotal += (Number(product.price) * Number(item.quantity));
         }

         // Load shipping settings
         // Force shipping to be disabled here so shipping fees are not charged anywhere.
         // This makes shipping free across the site regardless of DB settings or membership.
         const shippingSetting = await prisma.shippingSetting.findUnique({ where: { id: "default" } }) || {
             enabled: true,
             shippingType: 'FLAT_RATE',
             flatRate: 5,
             perItemFee: 2,
             maxItemFee: null,
             freeShippingMin: 499,
             weightUnit: 'kg',
             baseWeight: 1,
             baseWeightFee: 5,
             additionalWeightFee: 2
         };

        // Override: make shipping free for all orders
        shippingSetting.enabled = false;

         // Calculate shipping fee based on type
         let shippingFee = 0;
         if (!isPlusMember && shippingSetting.enabled) {
             // Check free shipping threshold first
             if (grandSubtotal >= Number(shippingSetting.freeShippingMin)) {
                 shippingFee = 0;
             } else {
                 switch (shippingSetting.shippingType) {
                     case 'FLAT_RATE':
                         shippingFee = Number(shippingSetting.flatRate || 5);
                         break;
                     case 'PER_ITEM':
                         const totalItems = items.reduce((sum, item) => sum + Number(item.quantity), 0);
                         shippingFee = totalItems * Number(shippingSetting.perItemFee || 2);
                         if (shippingSetting.maxItemFee) {
                             shippingFee = Math.min(shippingFee, Number(shippingSetting.maxItemFee));
                         }
                         break;
                     case 'WEIGHT_BASED':
                         // For now, use a default weight calculation (can be enhanced with product weights later)
                         const totalWeight = items.reduce((sum, item) => sum + Number(item.quantity) * 0.5, 0); // Assume 0.5kg per item
                         const baseWeight = Number(shippingSetting.baseWeight || 1);
                         const baseWeightFee = Number(shippingSetting.baseWeightFee || 5);
                         const additionalWeightFee = Number(shippingSetting.additionalWeightFee || 2);
                         
                         if (totalWeight <= baseWeight) {
                             shippingFee = baseWeightFee;
                         } else {
                             const additionalWeight = Math.ceil(totalWeight - baseWeight);
                             shippingFee = baseWeightFee + (additionalWeight * additionalWeightFee);
                         }
                         break;
                     case 'FREE':
                         shippingFee = 0;
                         break;
                     default:
                         shippingFee = 5;
                 }
             }
         }

         let orderIds = [];
         let fullAmount = 0;

         let isShippingFeeAdded = false

         // Create orders for each seller
         for(const [storeId, sellerItems] of ordersByStore.entries()){
            let total = sellerItems.reduce((acc, item)=>acc + (item.price * item.quantity), 0)

            if(couponCode){
                // Apply discount based on type
                if (coupon.discountType === 'percentage') {
                    total -= (total * coupon.discount) / 100;
                } else {
                    // Fixed amount discount
                    total -= Math.min(coupon.discount, total);
                }
            }
            if(!isPlusMember && !isShippingFeeAdded){
                total += shippingFee;
                isShippingFeeAdded = true
            }

            fullAmount += parseFloat(total.toFixed(2))

            // Prepare order data
            const orderData = {
                 storeId,
                 total: parseFloat(total.toFixed(2)),
                 paymentMethod,
                 isCouponUsed: coupon ? true : false,
                 coupon: coupon ? coupon : {},
                  orderItems: {
                    create: sellerItems.map(item => ({
                        productId: item.id,
                        quantity: item.quantity,
                        price: item.price
                    }))
                  }
            };

            // Add guest or user specific fields
            if (isGuest) {
                // Ensure guest user exists in database for address foreign key
                await prisma.user.upsert({
                    where: { id: 'guest' },
                    update: {},
                    create: {
                        id: 'guest',
                        name: 'Guest User',
                        email: 'guest@system.local',
                        image: '',
                        cart: []
                    }
                });

                // Create a temporary address for guest
                const guestAddress = await prisma.address.create({
                    data: {
                        userId: 'guest', // Temporary user ID for guests
                        name: guestInfo.name,
                        email: guestInfo.email,
                        phone: guestInfo.phone,
                        street: guestInfo.address, // Map 'address' to 'street' field
                        city: guestInfo.city || 'Guest',
                        state: guestInfo.state || 'Guest',
                        zip: guestInfo.zip || '000000',
                        country: guestInfo.country || 'UAE'
                    }
                });
                orderData.addressId = guestAddress.id;
                orderData.isGuest = true;
                orderData.guestName = guestInfo.name;
                orderData.guestEmail = guestInfo.email;
                orderData.guestPhone = guestInfo.phone;

                // Create or update GuestUser record
                const convertToken = crypto.randomBytes(32).toString('hex');
                const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

                await prisma.guestUser.upsert({
                    where: { email: guestInfo.email },
                    update: {
                        name: guestInfo.name,
                        phone: guestInfo.phone,
                        convertToken: convertToken,
                        tokenExpiry: tokenExpiry
                    },
                    create: {
                        name: guestInfo.name,
                        email: guestInfo.email,
                        phone: guestInfo.phone,
                        convertToken: convertToken,
                        tokenExpiry: tokenExpiry
                    }
                });
            } else {
                orderData.userId = userId;
                orderData.addressId = addressId;
            }

            const order = await prisma.order.create({
                data: orderData,
                include: {
                    user: true,
                    orderItems: {
                        include: {
                            product: true
                        }
                    }
                }
            })
            orderIds.push(order.id)

            // Send order confirmation email to customer (no-op if email service not configured)
            try {
                if (isGuest) {
                    // Send guest order email with account creation link
                    const guestUser = await prisma.guestUser.findUnique({
                        where: { email: guestInfo.email }
                    });

                    const emailResponse = await fetch(`${request.headers.get('origin')}/api/notifications/guest-order`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            orderId: order.id,
                            email: guestInfo.email,
                            customerName: guestInfo.name,
                            orderItems: order.orderItems,
                            total: order.total,
                            convertToken: guestUser?.convertToken
                        })
                    });
                    
                    if (!emailResponse.ok) {
                        console.error('Failed to send guest order email');
                    }
                } else {
                    // Send regular order confirmation email
                    let customerEmail = order.user?.email;
                    let customerName = order.user?.name;

                    // Fallback: If user not in database, fetch from Clerk
                    if (!customerEmail && userId) {
                        try {
                            const clerkUser = await clerkClient.users.getUser(userId);
                            const primaryEmail = clerkUser.emailAddresses?.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress;
                            customerEmail = primaryEmail || customerEmail;
                            customerName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || customerName;
                        } catch (clerkError) {
                            console.error('Failed to fetch user from Clerk:', clerkError);
                        }
                    }

                    // Only send email if we have an email address
                    if (customerEmail) {
                        const emailResponse = await fetch(`${request.headers.get('origin')}/api/notifications/order-status`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                orderId: order.id,
                                email: customerEmail,
                                customerName: customerName || 'Customer',
                                status: 'ORDER_PLACED',
                                orderItems: order.orderItems
                            })
                        });
                        
                        if (!emailResponse.ok) {
                            console.error('Failed to send order confirmation email');
                        }
                    }
                }
            } catch (emailError) {
                console.error('Error sending order confirmation email:', emailError);
                // Don't fail the order if email fails
            }
         }

         // Increment coupon usage count
         if (couponCode && coupon) {
            await prisma.coupon.update({
                where: { code: couponCode },
                data: { usedCount: { increment: 1 } }
            })
         }

         if(paymentMethod === 'STRIPE'){
            const stripe = Stripe(process.env.STRIPE_SECRET_KEY)
            const origin = await request.headers.get('origin')

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data:{
                        currency: 'aed',
                        product_data:{
                            name: 'Order'
                        },
                        unit_amount: Math.round(fullAmount * 100)
                    },
                    quantity: 1
                }],
                expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // current time + 30 minutes
                mode: 'payment',
                success_url: `${origin}/loading?nextUrl=orders`,
                cancel_url: `${origin}/cart`,
                metadata: {
                    orderIds: orderIds.join(','),
                    userId,
                    appId: 'Qui'
                }
            })
            return NextResponse.json({session})
         }

                    // clear the cart only for logged-in users
                    if (userId) {
                        await prisma.user.update({
                            where: {id: userId},
                            data: {cart : {}}
                        })
                    }

                    // Return all orders for guests, single order for users
                    if (isGuest) {
                        const orders = await prisma.order.findMany({
                            where: { id: { in: orderIds } },
                            include: {
                                user: true,
                                orderItems: { include: { product: true } }
                            }
                        });
                        return NextResponse.json({ message: 'Orders Placed Successfully', orders });
                    } else {
                        // Fetch the first order for signed-in user response
                        const userOrder = await prisma.order.findUnique({
                            where: { id: orderIds[0] },
                            include: {
                                user: true,
                                orderItems: { include: { product: true } },
                                address: true
                            }
                        });
                        return NextResponse.json({ message: 'Orders Placed Successfully', order: userOrder });
                    }

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}

// Get all orders for a user
export async function GET(request){
    try {
        const { userId } = getAuth(request)
        const orders = await prisma.order.findMany({
            where: {userId, OR: [
                {paymentMethod: PaymentMethod.COD},
                {AND: [{paymentMethod: PaymentMethod.STRIPE}, {isPaid: true}]}
            ]},
            include: {
                orderItems: {include: {product: true}},
                address: true
            },
            orderBy: {createdAt: 'desc'}
        })

        return NextResponse.json({orders})
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 400 })
    }
}