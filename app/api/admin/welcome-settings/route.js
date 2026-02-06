import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Get welcome modal settings
export async function GET(request) {
  try {
    const { userId, has } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin/seller
    const isSeller = has({ role: "org:seller" });
    const isAdmin = has({ role: "org:admin" });

    if (!isSeller && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch or create default settings
    let settings = await prisma.welcomeSettings.findUnique({
      where: { id: "default" }
    });

    if (!settings) {
      settings = await prisma.welcomeSettings.create({
        data: {
          id: "default",
          couponCode: "WELCOME15",
          discountPercentage: 15,
          enabled: true,
          cooldownHours: 6
        }
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error fetching welcome settings:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Update welcome modal settings
export async function POST(request) {
  try {
    const { userId, has } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin/seller
    const isSeller = has({ role: "org:seller" });
    const isAdmin = has({ role: "org:admin" });

    if (!isSeller && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { couponCode, discountPercentage, enabled, cooldownHours } = await request.json();

    // Validate input
    if (!couponCode || discountPercentage < 1 || discountPercentage > 100) {
      return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
    }

    // Update or create settings
    const settings = await prisma.welcomeSettings.upsert({
      where: { id: "default" },
      update: {
        couponCode: couponCode.toUpperCase(),
        discountPercentage: parseInt(discountPercentage),
        enabled: Boolean(enabled),
        cooldownHours: parseInt(cooldownHours) || 6
      },
      create: {
        id: "default",
        couponCode: couponCode.toUpperCase(),
        discountPercentage: parseInt(discountPercentage),
        enabled: Boolean(enabled),
        cooldownHours: parseInt(cooldownHours) || 6
      }
    });

    return NextResponse.json({ message: "Settings updated successfully", settings });
  } catch (error) {
    console.error("Error updating welcome settings:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
