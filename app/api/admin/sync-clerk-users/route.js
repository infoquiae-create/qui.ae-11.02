import { clerkClient } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * Admin-only endpoint to sync all Clerk users to the database
 * Run this once to populate existing users from Clerk
 */
export async function POST(req) {
  try {
    // You should verify this is called by an admin
    // For now, using a simple token check from environment
    const adminToken = req.headers.get("authorization")?.replace("Bearer ", "");
    const expectedToken = process.env.ADMIN_SYNC_TOKEN;

    if (!expectedToken || adminToken !== expectedToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all users from Clerk
    const clerkUsers = await clerkClient.users.getUserList({ limit: 500 });
    
    let synced = 0;
    let skipped = 0;
    const errors = [];

    for (const clerkUser of clerkUsers.data) {
      try {
        const primaryEmail = clerkUser.emailAddresses?.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress;

        if (!primaryEmail) {
          skipped++;
          continue;
        }

        // Upsert user in database
        const user = await prisma.user.upsert({
          where: { id: clerkUser.id },
          update: {
            name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "User",
            email: primaryEmail,
            image: clerkUser.imageUrl || "",
          },
          create: {
            id: clerkUser.id,
            name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "User",
            email: primaryEmail,
            image: clerkUser.imageUrl || "",
            cart: {},
          },
        });

        synced++;
      } catch (error) {
        console.error(`Error syncing user ${clerkUser.id}:`, error);
        errors.push({
          userId: clerkUser.id,
          error: error.message,
        });
      }
    }

    return NextResponse.json(
      {
        message: "Sync completed",
        synced,
        skipped,
        errors,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync users" },
      { status: 500 }
    );
  }
}
