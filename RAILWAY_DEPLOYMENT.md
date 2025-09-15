# Railway Deployment Guide

## Environment Variables Needed

Add these environment variables to your Railway `reading-app` service:

### Required Variables:
```
DATABASE_URL=postgresql://postgres:password@host:port/database
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
OPENAI_API_KEY=your-openai-api-key-here
NODE_ENV=production
PORT=5050
```

### How to Get DATABASE_URL:
1. Go to your Railway dashboard
2. Click on your `Postgres` service
3. Go to the `Variables` tab
4. Copy the `DATABASE_URL` value
5. Paste it into your `reading-app` service environment variables

### JWT_SECRET:
Generate a random string (at least 32 characters). You can use:
- Online generator: https://generate-secret.vercel.app/32
- Or any random string generator

### OPENAI_API_KEY:
Get this from https://platform.openai.com/api-keys

## Steps to Deploy:

1. **Set Environment Variables** (see above)
2. **Commit and Push Changes** to GitHub
3. **Railway will automatically redeploy**
4. **Check the logs** for any errors

## Troubleshooting:

- If build fails: Check that all environment variables are set
- If database errors: Verify DATABASE_URL is correct
- If API errors: Check that OPENAI_API_KEY is valid

## After Successful Deployment:

1. **Get your Railway backend URL** (something like `https://reading-app-production.up.railway.app`)
2. **Update Vercel environment variable**:
   - Go to Vercel dashboard
   - Settings → Environment Variables
   - Set `NEXT_PUBLIC_API_URL` to `https://your-railway-url.railway.app/api`
3. **Redeploy Vercel** to pick up the new API URL
