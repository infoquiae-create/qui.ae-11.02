# 🚀 Quick Fix: Customer Name & Email Empty in Orders

## ⚡ Instant Solution (Do This Now)

Your store orders page shows "Unknown" for customer names because Clerk user data hasn't been synced to your database yet.

**Fix it in 30 seconds:**

1. **Go to:** `https://yourdomain.com/admin/sync-users`
2. **Click:** "Sync All Clerk Users"
3. **Done!** Customer names and emails will now appear in orders

---

## 🔧 Permanent Setup (For Future Users)

After syncing existing users, set up automatic syncing for new signups:

### Step 1: In Clerk Dashboard
- Go to **Webhooks** → **Create Endpoint**  
- Endpoint URL: `https://yourdomain.com/api/webhooks/clerk`
- Select events: `user.created`, `user.updated`, `user.deleted`
- Copy the **Signing Secret**

### Step 2: In Your Environment
Add to `.env.local`:
```
CLERK_WEBHOOK_SECRET=[paste signing secret from Clerk]
ADMIN_EMAIL=your-email@example.com
```

### Step 3: Deploy
Push changes and redeploy. New users will automatically sync!

---

## 📋 What Was Changed

✅ Added `/admin/sync-users` page to manually sync all Clerk users  
✅ Updated sync API to use Clerk authentication  
✅ Added fallback in orders API to fetch user data from Clerk if database is incomplete  
✅ Store orders now show correct customer names and emails

---

## ❓ Troubleshooting

**Still showing "Unknown"?**
- Refresh your browser
- Make sure you clicked the sync button
- Check if `ADMIN_EMAIL` in `.env.local` matches your email

**Webhook not working?**
- Verify the endpoint URL is correct and accessible
- Check `CLERK_WEBHOOK_SECRET` matches both Clerk and your `.env.local`
- View webhook logs in Clerk Dashboard

---

## 💡 How It Works

1. **Immediate:** Manual sync on `/admin/sync-users` syncs all existing Clerk users to database
2. **Automatic:** Webhook automatically syncs new users when they sign up
3. **Fallback:** If webhook hasn't fired yet, store orders API fetches from Clerk as backup

This ensures customer names and emails always appear correctly in orders!
