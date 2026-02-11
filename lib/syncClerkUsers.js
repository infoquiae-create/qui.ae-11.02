import prisma from "@/lib/prisma";
import { clerkClient } from "@clerk/nextjs/server";

/**
 * Direct sync: Updates all users in database with Clerk data
 * Can be run as a server action or one-time script
 */
export async function syncAllUsersFromClerk() {
  try {
    console.log('Starting user sync...');
    
    // Get all users from Clerk
    const clerkUsers = await clerkClient.users.getUserList({ limit: 500 });
    
    let updated = 0;
    let skipped = 0;

    for (const clerkUser of clerkUsers.data) {
      const primaryEmail = clerkUser.emailAddresses?.find(
        e => e.id === clerkUser.primaryEmailAddressId
      )?.emailAddress;

      if (!primaryEmail) {
        skipped++;
        continue;
      }

      const name = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "User";

      // Update user in database
      await prisma.user.upsert({
        where: { id: clerkUser.id },
        update: {
          name,
          email: primaryEmail,
          image: clerkUser.imageUrl || "",
        },
        create: {
          id: clerkUser.id,
          name,
          email: primaryEmail,
          image: clerkUser.imageUrl || "",
          cart: {},
        },
      });

      updated++;
    }

    const result = { updated, skipped, total: updated + skipped };
    console.log('Sync complete:', result);
    return result;
  } catch (error) {
    console.error('Sync error:', error);
    throw error;
  }
}
