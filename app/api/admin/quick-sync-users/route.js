import { getAuth } from "@clerk/nextjs/server";
import { syncAllUsersFromClerk } from "@/lib/syncClerkUsers";
import { NextResponse } from "next/server";

/**
 * Quick fix endpoint to sync all users immediately
 * Add ?secret=your_secret_key to URL to call
 */
export async function GET(request) {
  try {
    // Check for secret key in query params for security
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    const quickSecret = process.env.QUICK_SYNC_SECRET;

    if (!quickSecret || !secret || secret !== quickSecret) {
      // Try Clerk auth as fallback
      const { userId } = getAuth(request);
      const adminEmail = process.env.ADMIN_EMAIL?.split(",")[0];
      
      if (!userId || userId !== adminEmail) {
        return NextResponse.json(
          { error: "Unauthorized. Provide ?secret= parameter or sign in as admin" },
          { status: 401 }
        );
      }
    }

    const result = await syncAllUsersFromClerk();

    return NextResponse.json({
      success: true,
      message: `Synced ${result.updated} users from Clerk`,
      result,
    });
  } catch (error) {
    console.error("Quick sync error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
