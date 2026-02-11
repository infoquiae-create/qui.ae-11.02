import { Webhook } from 'svix';
import prisma from '@/lib/prisma';

export async function POST(req) {
  try {
    const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!CLERK_WEBHOOK_SECRET) {
      return new Response('Webhook secret not configured', { status: 500 });
    }

    // Get the request body as text for signature verification
    const payload = await req.text();
    const svixHeaders = {
      'svix-id': req.headers.get('svix-id'),
      'svix-timestamp': req.headers.get('svix-timestamp'),
      'svix-signature': req.headers.get('svix-signature'),
    };

    // Verify the webhook signature
    const wh = new Webhook(CLERK_WEBHOOK_SECRET);
    let evt;

    try {
      evt = wh.verify(payload, svixHeaders);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response('Webhook verification failed', { status: 401 });
    }

    const eventType = evt.type;
    const data = evt.data;

    if (eventType === 'user.created' || eventType === 'user.updated') {
      const { id, email_addresses, first_name, last_name, image_url } = data;

      // Get primary email
      const primaryEmail = email_addresses?.find(e => e.primary)?.email_address;

      if (!primaryEmail) {
        console.warn(`No email found for user ${id}`);
        return new Response('No email found', { status: 400 });
      }

      // Create or update user in database
      const user = await prisma.user.upsert({
        where: { id },
        update: {
          name: `${first_name || ''} ${last_name || ''}`.trim() || 'User',
          email: primaryEmail,
          image: image_url || '',
        },
        create: {
          id,
          name: `${first_name || ''} ${last_name || ''}`.trim() || 'User',
          email: primaryEmail,
          image: image_url || '',
          cart: {},
        },
      });

      console.log(`User ${eventType} synced:`, user.id);
      return new Response(JSON.stringify(user), { status: 200 });
    }

    if (eventType === 'user.deleted') {
      const { id } = data;
      
      // Don't delete user from database, just mark them inactive or leave as is
      // This prevents orphaned orders
      console.log(`User deleted in Clerk: ${id}`);
      return new Response('User deletion noted', { status: 200 });
    }

    // Return 200 for all other event types to acknowledge receipt
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
