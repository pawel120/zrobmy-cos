# Deploying Zróbmy coś

Two parts: get a Supabase backend running, then get this Next.js app running locally in VS Code and deployed.

---

## 1. Unzip and open in VS Code

1. Unzip `zrobmy-cos.zip` somewhere on your machine.
2. Open VS Code → **File → Open Folder…** → select the unzipped `zrobmy-cos` folder.
3. Open a terminal in VS Code (`` Ctrl+` `` / `` Cmd+` ``) — everything below runs there.
4. Install recommended extensions if prompted (ESLint, Tailwind CSS IntelliSense). Not required, just nicer autocomplete.

You need **Node.js 18.18+** installed. Check with:
```bash
node -v
```
If you don't have it, install from [nodejs.org](https://nodejs.org) (LTS) or via `nvm`.

---

## 2. Set up Supabase (the backend)

1. Go to [supabase.com](https://supabase.com) → create a free account → **New Project**.
2. Once it's provisioned, open **Project Settings → API**. You'll need two values from here in a minute:
   - **Project URL**
   - **anon public key**
3. Open **SQL Editor** (left sidebar) → **New query**.
4. Open `schema.sql` from this project in VS Code, copy the *entire file*, paste it into the Supabase SQL Editor, and click **Run**.
   - This creates every table, trigger, RLS policy, and the `avatars` storage bucket in one pass.
   - If it errors partway through, it's almost always because you ran it twice — the script is written to be safe to re-run (`create or replace`, `drop ... if exists`, `on conflict do nothing`), but a couple of `create table`/`create type` statements aren't idempotent. Easiest fix for a fresh attempt: delete the project and start a new one, or manually `drop` what it complains about.
5. **(Optional but recommended)** Turn off email confirmation while testing, so signup doesn't require clicking an email link every time: **Authentication → Providers → Email → toggle off "Confirm email"**. Turn it back on before going live.
6. **Make yourself an admin** (so you can see `/admin`): after you sign up once through the running app (step 4 below), go to **Table Editor → profiles**, find your row, and set `is_admin` to `true`.

---

## 3. Configure environment variables

In VS Code, duplicate `.env.example` and rename the copy to `.env.local`:
```bash
cp .env.example .env.local
```
Open `.env.local` and fill in the two Supabase values from step 2.2:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```
`.env.local` is already in `.gitignore` — it will never get committed or pushed.

---

## 4. Install dependencies and run locally

```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000). Sign up, then go flip `is_admin` on your profile in Supabase's Table Editor (step 2.6) if you want to see `/admin`.

Useful scripts while developing:
```bash
npm run lint        # ESLint
npm run typecheck    # TypeScript, no build output
npm run build         # production build — good smoke test before deploying
```

---

## 5. Push to GitHub

Deploying from a Git repo is by far the smoothest path (auto-deploys on every push).

```bash
git init
git add .
git commit -m "Initial commit"
```
Create a new empty repo on [github.com/new](https://github.com/new), then:
```bash
git remote add origin https://github.com/YOUR_USERNAME/zrobmy-cos.git
git branch -M main
git push -u origin main
```

---

## 6. Deploy to Vercel (recommended — built by the Next.js team, zero config)

1. Go to [vercel.com](https://vercel.com) → sign in with GitHub → **Add New… → Project**.
2. Import the `zrobmy-cos` repo you just pushed.
3. Vercel auto-detects Next.js — leave build settings as default.
4. Under **Environment Variables**, add the same three from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` → set this to your real Vercel URL (e.g. `https://zrobmy-cos.vercel.app`), or a custom domain if you attach one
5. Click **Deploy**. A couple of minutes later you have a live URL.
6. Every `git push` to `main` from now on auto-redeploys.

**One more Supabase step after your first deploy:** go to **Authentication → URL Configuration** in Supabase and set:
- **Site URL** → your Vercel URL
- **Redirect URLs** → add `https://your-vercel-url/auth/callback`

This is what makes magic links, signup confirmation, and password reset redirect back to the *deployed* app instead of `localhost`.

---

## 7. Wrapping it in Capacitor for the App Store (later, optional)

The app was built mobile-first specifically so this step is small when you're ready:
```bash
npm install @capacitor/core @capacitor/cli
npx cap init "Zróbmy coś" "com.yourcompany.zrobmycos" --web-dir=out
```
This needs `next.config.js` set to `output: 'export'` for a static build, which conflicts with the server-rendered pages (auth, admin, API routes) this app relies on — so the practical path is Capacitor's [server URL mode](https://capacitorjs.com/docs/guides/splash-screens-and-icons) pointing at your deployed Vercel URL, rather than a fully static export. Worth its own pass when you're actually ready for app stores rather than guessing at it now.

---

## Troubleshooting

- **"Musisz być zalogowany" / 401s everywhere** → env vars missing or wrong; double check `.env.local` (local) or the Vercel dashboard (deployed), and that you copied the *anon* key, not the service role key.
- **Signup works but no profile appears** → the `handle_new_user()` trigger didn't get created; re-run `schema.sql`.
- **Avatar upload fails** → the `avatars` storage bucket policies live at the bottom of `schema.sql`; confirm that section ran (Supabase → Storage → you should see an `avatars` bucket).
- **Realtime (chat/notifications) not updating live** → Supabase → Database → Replication → confirm `messages`, `notifications`, `fires`, and `join_requests` are toggled on (schema.sql adds them automatically, but it's worth checking after a partial run).
