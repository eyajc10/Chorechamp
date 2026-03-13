# 🏠 ChoreChamps

Your family's chore & rewards tracker — powered by React + Supabase.

## Deploy to Vercel (Step-by-Step)

### Option A — Drag & Drop (Easiest, no Git needed)

1. Download this folder as a ZIP
2. Go to [vercel.com](https://vercel.com) and sign up / log in (free)
3. Click **"Add New Project"**
4. Drag and drop the ZIP file onto the upload area
5. Vercel auto-detects it as a React app
6. Click **"Deploy"**
7. Your app will be live at `https://chorechamps-xxxx.vercel.app` in ~1 minute!

### Option B — Via GitHub (Best for updates)

1. Create a free account at [github.com](https://github.com)
2. Create a new repository called `chorechamps`
3. Upload all files from this folder to the repo
4. Go to [vercel.com](https://vercel.com) → **"Add New Project"**
5. Click **"Import from GitHub"** → select your repo
6. Click **"Deploy"**
7. Every time you push changes to GitHub, Vercel auto-redeploys!

## After Deploying

Once live, copy your Vercel URL (e.g. `https://chorechamps.vercel.app`) and:

1. Go to your **Supabase dashboard**
2. Navigate to **Settings → API**
3. Under **"Allowed Origins" (CORS)**, add your Vercel URL
4. Save — your app will now connect to the database!

## Project Structure

```
chorechamps/
├── public/
│   └── index.html        # HTML entry point
├── src/
│   ├── index.js          # React entry point
│   └── App.jsx           # Main app (all features)
├── package.json          # Dependencies
├── vercel.json           # Vercel routing config
└── .gitignore
```

## Tech Stack
- **React 18** — UI framework
- **Supabase** — Cloud database & auth
- **Vercel** — Hosting & deployment
