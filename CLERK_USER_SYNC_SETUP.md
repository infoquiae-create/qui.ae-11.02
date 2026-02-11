# Setting Up Clerk User Sync

## Problem
Customer name and email are empty for signed-in users because Clerk user data wasn't being synced to your database.

## Solution
Two new endpoints have been created:

### 1. **Clerk Webhook Handler** (`/api/webhooks/clerk`)
Automatically syncs user data when they sign up or update their profile.

### 2. **Admin Sync Endpoint** (`/api/admin/sync-clerk-users`)
Syncs all existing Clerk users to database (one-time operation).

---

## Setup Instructions

### Step 1: Add Webhook Secret to Environment
Add to your `.env.local`:
```
CLERK_WEBHOOK_SECRET=your_webhook_secret
```

### Step 2: Configure Webhook in Clerk Dashboard

1. Go to **Clerk Dashboard** → **Webhooks** → **Add Endpoint**
2. URL: `https://yoursite.com/api/webhooks/clerk`
3. Select these events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
4. Copy the **Signing Secret** and add it to `.env.local` as `CLERK_WEBHOOK_SECRET`
5. Test the webhook to ensure it works

### Step 3: Verify the Webhook Secret

After saving, Clerk will show the signing secret. Make sure it matches what you added to `.env.local`.

### Step 4: Sync Existing Users (One-Time)

If you already have users signed up before adding this webhook, sync them:

```bash
# First, set your admin token in .env.local
ADMIN_SYNC_TOKEN=your_secret_token_here

# Then call the sync endpoint (replace token with your token)
curl -X POST https://yoursite.com/api/admin/sync-clerk-users \
  -H "Authorization: Bearer your_secret_token_here"
```

Or add this to `.env.local`:
```
ADMIN_SYNC_TOKEN=your_unique_sync_token
```

Then visit in your browser (or use curl) to run:
```
https://yoursite.com/api/admin/sync-clerk-users
```
With header: `Authorization: Bearer your_unique_sync_token`

---

## How It Works

### When a User Signs Up:
1. Clerk creates the user
2. Webhook fires with user data
3. User synced to database with name, email, image
4. Future orders will have customer name and email populated

### When Orders Are Created:
1. `order.user.name` - populated from database (synced from Clerk)
2. `order.user.email` - populated from database (synced from Clerk)
3. Store orders page displays the correct customer info

### When Guest Users Checkout:
- `order.guestName` and `order.guestEmail` are used instead
- Works as it did before (no change)

---

## Verification

After webhook is set up, test by:
1. Creating a new account
2. Wait 1-2 seconds for webhook
3. Place an order
4. Check store orders page - customer name/email should be populated

For existing users, after running the sync:
1. They should appear in your database
2. Their future orders will have name/email populated

---

## Troubleshooting

### Users still showing empty name/email
- Check webhook firing: Clerk Dashboard → Webhooks → View Logs
- Verify `CLERK_WEBHOOK_SECRET` matches Clerk dashboard
- Check app logs for webhook handler errors

### Webhook not firing
- Verify endpoint URL is correct
- Make sure Clerk has network access to your domain
- Check signing secret is correct

### Production deployments
- Add `CLERK_WEBHOOK_SECRET` to your hosting provider's environment variables
- Test webhook after deploying
