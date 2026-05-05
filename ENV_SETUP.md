# Environment Variables Setup

## Overview
The SURRY game uses environment variables to securely store sensitive Supabase credentials. This prevents accidentally committing secrets to version control.

## Files

- `.env.local` - **LOCAL ONLY** - Contains your actual credentials (do NOT commit to git)
- `.env.example` - Template showing what variables are needed (safe to commit)
- `.gitignore` - Already configured to exclude `.env.local`

## Setup Instructions

### 1. Get Your Supabase Credentials

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your project
3. Go to **Project Settings** (gear icon) → **API** tab
4. Copy:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **Anon Key** (long string starting with `eyJ...`)

### 2. Create `.env.local`

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Then edit `.env.local` and replace the placeholder values:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Restart Dev Server

If the dev server is running, restart it to load the new environment variables:
```bash
npm run dev
```

## Environment Variable Naming

- `VITE_` prefix required for Vite to expose variables to client code
- Without prefix, variables are only available on server (Node.js/Vite build time)
- Client-side code needs access to these credentials for Supabase to work

## Security Notes

⚠️ **IMPORTANT**:
- ✅ `.env.local` is in `.gitignore` - safe from version control
- ✅ `.env.example` is safe to commit - shows structure only
- ❌ Never commit `.env.local` with real credentials
- ❌ Never hardcode secrets in source code
- ❌ Never paste credentials in issues/PRs

## Troubleshooting

### "Missing Supabase environment variables" error
**Solution**: Make sure `.env.local` exists in the project root with both variables set correctly.

### Game not connecting to Supabase
1. Check `.env.local` exists and has values
2. Verify values are copied correctly (no extra spaces)
3. Restart dev server: `npm run dev`
4. Check browser console for errors

### Variables not updating after changes
- Vite caches env variables at startup
- Restart dev server to reload: `npm run dev`

## Development Flow

```
1. Create .env.local from .env.example
2. Fill in your actual credentials
3. npm run dev
4. Game loads credentials from environment
5. Connects to Supabase
```

## Deployment

When deploying to production (Vercel, Netlify, etc.):

1. Set environment variables in deployment platform dashboard
2. DO NOT commit `.env.local` to git
3. Platform will automatically inject variables at build time

**Example for Vercel**:
- Go to Project Settings → Environment Variables
- Add: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Deploy - variables are automatically available
